"""
個人知識庫 API
- 個人 AI 名片（結構化個人資料）
- 上傳文件（週報/範本/案例）
- 生成報告時自動引用相關知識
"""
import os, io, json, re, time
from fastapi import APIRouter, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse, Response
from typing import Optional
import anthropic

router = APIRouter()
MODEL_FAST = "claude-haiku-4-5-20251001"

# ── 持久化：Supabase 優先，fallback 本地 JSON ─────────────────────
_STORE_PATH   = os.path.join(os.path.dirname(__file__), "..", "knowledge_store.json")
_PROFILE_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_profile.json")

def _get_supabase():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if url and key:
        try:
            from supabase import create_client
            return create_client(url, key)
        except Exception:
            pass
    return None

# ── 文件庫 ─────────────────────────────────────────────────────────
def _load_store() -> list:
    sb = _get_supabase()
    if sb:
        try:
            resp = sb.table("knowledge_docs").select("*") \
                     .neq("doc_type", "__profile__") \
                     .order("created_at").execute()
            if resp.data:
                return [{
                    "id":         d["id"],
                    "title":      d["title"],
                    "filename":   d.get("filename", ""),
                    "type":       d.get("doc_type", "other"),
                    "content":    d.get("content", ""),
                    "summary":    d.get("summary", ""),
                    "char_count": d.get("char_count", 0),
                    "created_at": d.get("created_at", "")[:16].replace("T", " "),
                } for d in resp.data]
        except Exception as e:
            print(f"[knowledge] Supabase 載入失敗：{e}")
    try:
        if os.path.exists(_STORE_PATH):
            with open(_STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []

def _save_to_supabase(doc: dict) -> str | None:
    sb = _get_supabase()
    if not sb: return None
    try:
        resp = sb.table("knowledge_docs").insert({
            "title":      doc["title"],
            "filename":   doc.get("filename", ""),
            "doc_type":   doc.get("type", "other"),
            "content":    doc.get("content", ""),
            "summary":    doc.get("summary", ""),
            "char_count": doc.get("char_count", 0),
        }).execute()
        if resp.data:
            return resp.data[0]["id"]
    except Exception as e:
        print(f"[knowledge] Supabase 儲存失敗：{e}")
    return None

def _delete_from_supabase(doc_id: str):
    sb = _get_supabase()
    if not sb: return
    try:
        sb.table("knowledge_docs").delete().eq("id", doc_id).execute()
    except Exception as e:
        print(f"[knowledge] Supabase 刪除失敗：{e}")

def _save_store(store: list):
    try:
        with open(_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(store, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

# ── 個人 AI 名片 ───────────────────────────────────────────────────
def _load_profile() -> dict:
    """從 Supabase 或本地 JSON 載入個人資料"""
    sb = _get_supabase()
    if sb:
        try:
            resp = sb.table("knowledge_docs").select("content") \
                     .eq("doc_type", "__profile__").execute()
            if resp.data and resp.data[0].get("content"):
                return json.loads(resp.data[0]["content"])
        except Exception:
            pass
    try:
        if os.path.exists(_PROFILE_PATH):
            with open(_PROFILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def _save_profile_store(profile: dict):
    """存到 Supabase + 本地 JSON"""
    # 本地備份
    try:
        with open(_PROFILE_PATH, "w", encoding="utf-8") as f:
            json.dump(profile, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    # Supabase（upsert 模式：存在就更新，不存在就新增）
    sb = _get_supabase()
    if not sb: return
    try:
        content = json.dumps(profile, ensure_ascii=False)
        resp = sb.table("knowledge_docs").select("id") \
                 .eq("doc_type", "__profile__").execute()
        if resp.data:
            sb.table("knowledge_docs").update({
                "content": content,
                "summary": "個人 AI 名片",
                "char_count": len(content),
            }).eq("doc_type", "__profile__").execute()
        else:
            sb.table("knowledge_docs").insert({
                "title":      "AI個人名片",
                "doc_type":   "__profile__",
                "content":    content,
                "summary":    "個人AI名片設定",
                "char_count": len(content),
            }).execute()
    except Exception as e:
        print(f"[knowledge] profile Supabase 儲存失敗：{e}")

def _format_profile_context(profile: dict) -> str:
    """將個人資料格式化為 AI 可讀的 context 字串"""
    if not profile: return ""
    LABELS = {
        "basic":       "基本資訊",
        "background":  "學經歷與成果",
        "personality": "個性與工作風格",
        "writing":     "慣用寫作語氣",
        "email":       "信件口氣",
        "report":      "常用報告架構",
        "hobbies":     "個人特質與嗜好",
    }
    parts = ["【個人 AI 名片】"]
    for key, label in LABELS.items():
        val = profile.get(key, "").strip()
        if val:
            parts.append(f"▸ {label}：{val}")
    return "\n".join(parts) if len(parts) > 1 else ""

_knowledge_store: list[dict] = _load_store()
_profile_data: dict = _load_profile()

def get_client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def call_claude(client, model, max_tokens, messages, retries=2):
    for attempt in range(retries):
        try:
            return client.messages.create(model=model, max_tokens=max_tokens, messages=messages)
        except anthropic.APIStatusError as e:
            if e.status_code == 529 and attempt < retries - 1:
                time.sleep(3)
                continue
            raise

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    fn = filename.lower()
    if fn.endswith('.pdf'):
        try:
            import pdfplumber
            parts = []
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for i, page in enumerate(pdf.pages[:20], 1):
                    t = (page.extract_text() or "").strip()
                    if t:
                        parts.append(f"[第{i}頁]\n{t}")
            return "\n\n".join(parts)
        except Exception as e:
            return f"PDF 讀取失敗：{e}"
    if fn.endswith(('.xlsx', '.xls')):
        try:
            import pandas as pd
            df = pd.read_excel(io.BytesIO(file_bytes))
            df = df.dropna(how='all').dropna(axis=1, how='all')
            lines = [f"欄位：{', '.join(df.columns.astype(str))}", f"筆數：{len(df)}", "",
                     df.head(50).to_string(index=False)]
            return "\n".join(lines)
        except Exception as e:
            return f"Excel 讀取失敗：{e}"
    if fn.endswith(('.txt', '.md', '.csv')):
        try:
            return file_bytes.decode('utf-8', errors='replace')
        except Exception:
            return file_bytes.decode('big5', errors='replace')
    if fn.endswith(('.doc', '.docx')):
        try:
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception:
            return "Word 檔需安裝 python-docx，請改上傳 PDF 或 TXT"
    return f"不支援的檔案格式：{filename}"


# ══════════════════════════════════════════════════════════════════
# 個人 AI 名片端點
# ══════════════════════════════════════════════════════════════════

@router.get("/profile")
async def get_profile():
    """取得個人 AI 名片資料"""
    return JSONResponse(_profile_data)

@router.post("/profile")
async def save_profile(request: Request):
    """儲存個人 AI 名片（全覆蓋）"""
    global _profile_data
    try:
        data = await request.json()
        _profile_data = data
        _save_profile_store(_profile_data)
        return JSONResponse({"success": True, "fields_saved": len([v for v in data.values() if v])})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ══════════════════════════════════════════════════════════════════
# 文件庫端點
# ══════════════════════════════════════════════════════════════════

@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
    doc_type: str = Form("report"),
):
    try:
        file_bytes = await file.read()
        if not file_bytes:
            return JSONResponse({"error": "檔案是空的"}, status_code=400)
        content = extract_text_from_file(file_bytes, file.filename)
        if not content or len(content) < 20:
            return JSONResponse({"error": "無法讀取文件內容，請確認格式是否正確"}, status_code=400)

        summary = ""
        try:
            prompt = f"""請用 2-3 句話總結以下文件的核心內容（繁體中文，20-50字）：\n\n{content[:2000]}\n\n只輸出摘要文字，不要加說明。"""
            msg = call_claude(get_client(), MODEL_FAST, 200, [{"role": "user", "content": prompt}])
            summary = msg.content[0].text.strip()
        except Exception:
            summary = content[:100] + "..."

        doc_id = f"doc_{int(time.time() * 1000)}"
        doc = {
            "id":         doc_id,
            "title":      title or file.filename,
            "filename":   file.filename,
            "type":       doc_type,
            "content":    content[:8000],
            "summary":    summary,
            "char_count": len(content),
            "created_at": time.strftime("%Y-%m-%d %H:%M"),
        }
        sb_id = _save_to_supabase(doc)
        if sb_id:
            doc["id"] = sb_id
        _knowledge_store.append(doc)
        _save_store(_knowledge_store)

        return JSONResponse({
            "success":    True,
            "id":         doc["id"],
            "title":      doc["title"],
            "summary":    summary,
            "char_count": len(content),
            "total_docs": len(_knowledge_store),
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/list")
async def list_documents():
    docs = [{k: v for k, v in d.items() if k != 'content'} for d in _knowledge_store]
    return JSONResponse({"docs": docs, "total": len(docs)})


@router.delete("/delete/{doc_id}")
async def delete_document(doc_id: str):
    global _knowledge_store
    before = len(_knowledge_store)
    _knowledge_store = [d for d in _knowledge_store if d["id"] != doc_id]
    _delete_from_supabase(doc_id)
    _save_store(_knowledge_store)
    if len(_knowledge_store) < before:
        return JSONResponse({"success": True})
    return JSONResponse({"error": "找不到此文件"}, status_code=404)


@router.get("/context")
async def get_context(keyword: str = "", limit: int = 3):
    """
    取得相關知識庫片段，供 Module1 生成報告時使用。
    個人 AI 名片永遠放在最前面。
    """
    context_parts = []

    # 1. 個人 AI 名片（永遠優先加入）
    profile_ctx = _format_profile_context(_profile_data)
    if profile_ctx:
        context_parts.append(profile_ctx)

    # 2. 關鍵字匹配文件
    if _knowledge_store:
        scored = []
        kw = keyword.lower()
        for doc in _knowledge_store:
            text = (doc.get("title","") + doc.get("summary","") + doc.get("content","")).lower()
            score = text.count(kw) if kw else 1
            if score > 0:
                scored.append((score, doc))
        scored.sort(key=lambda x: -x[0])
        TYPE_LABELS = {"report":"週報／月報","template":"報告範本","case":"成功案例","other":"其他文件"}
        for _, doc in scored[:limit]:
            context_parts.append(
                f"【{TYPE_LABELS.get(doc['type'], doc['type'])}：{doc['title']}】\n"
                f"摘要：{doc['summary']}\n"
                f"內容節錄：\n{doc['content'][:1500]}"
            )

    if not context_parts:
        return JSONResponse({"context": "", "found": 0})

    return JSONResponse({
        "context": "\n\n---\n\n".join(context_parts),
        "found":   len(context_parts),
    })


TYPE_LABELS = {
    "report":   "週報／月報",
    "template": "報告範本",
    "case":     "成功案例",
    "other":    "其他文件",
}

PROFILE_LABELS = {
    "basic":       "基本資訊",
    "background":  "學經歷與成果",
    "personality": "個性與工作風格",
    "writing":     "慣用寫作語氣",
    "email":       "信件口氣",
    "report":      "常用報告架構",
    "hobbies":     "個人特質與嗜好",
}

@router.get("/export")
async def export_knowledge(format: str = "markdown"):
    """匯出整個知識庫（含個人 AI 名片 + 所有文件）"""
    today = time.strftime("%Y-%m-%d")

    # ── 語氣風格分析 ──────────────────────────────────────────────
    style_summary = ""
    try:
        # 用個人名片 + 文件樣本一起分析
        profile_text = _format_profile_context(_profile_data)
        doc_samples  = "\n\n---\n\n".join(
            f"【{d['title']}】\n{d['content'][:600]}"
            for d in _knowledge_store[:3]
        )
        combined = f"{profile_text}\n\n{doc_samples}".strip()
        if combined:
            prompt = f"""請根據以下關於一位行銷經理的個人資料和過去文件，分析其寫作風格，並用「第二人稱對 AI 說話」的方式，寫出一段 150-200 字的「AI 使用指引」，讓 AI 在未來寫報告時能完全模仿她的語氣。

資料：
{combined[:3000]}

請直接輸出指引內容（不要加標題或說明），格式：「你是一位...，寫作風格為...，習慣使用...」"""
            msg = call_claude(get_client(), MODEL_FAST, 400, [{"role": "user", "content": prompt}])
            style_summary = msg.content[0].text.strip()
    except Exception:
        style_summary = "（語氣分析生成失敗，請手動補充你的寫作風格說明）"

    # ── JSON 格式 ─────────────────────────────────────────────────
    if format == "json":
        payload = {
            "exported_at":    today,
            "version":        "2.0",
            "ai_style_prompt": style_summary,
            "profile":        _profile_data,
            "documents": [{
                "title":      d["title"],
                "type":       TYPE_LABELS.get(d["type"], d["type"]),
                "summary":    d["summary"],
                "content":    d["content"],
                "char_count": d["char_count"],
                "created_at": d["created_at"],
            } for d in _knowledge_store],
        }
        return Response(
            content=json.dumps(payload, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="knowledge_base_{today}.json"'},
        )

    # ── Markdown 格式 ─────────────────────────────────────────────
    lines = [
        f"# 🧠 個人 AI 知識庫",
        f"",
        f"> 匯出日期：{today}　｜　文件數：{len(_knowledge_store)} 份",
        f"> 此檔案可直接貼入 ChatGPT / Claude / Gemini 等 AI 工具作為背景知識使用。",
        f"",
        f"---",
        f"",
        f"## 🎯 AI 語氣風格指引（直接貼入其他 AI 的 System Prompt）",
        f"",
        f"> 複製以下文字，貼到 ChatGPT 的「自訂指示」或 Claude 的「System Prompt」，AI 就會用你的語氣寫報告。",
        f"",
        f"```",
        style_summary,
        f"```",
        f"",
        f"---",
        f"",
        f"## 🪪 個人 AI 名片",
        f"",
    ]

    # 個人名片各區段
    has_profile = any(_profile_data.get(k) for k in PROFILE_LABELS)
    if has_profile:
        for key, label in PROFILE_LABELS.items():
            val = _profile_data.get(key, "").strip()
            if val:
                lines += [f"### {label}", f"", val, f""]
    else:
        lines += ["（尚未填寫個人 AI 名片）", ""]

    lines += ["---", "", "## 📚 文件庫", ""]

    if _knowledge_store:
        # 文件索引
        for i, d in enumerate(_knowledge_store, 1):
            label = TYPE_LABELS.get(d["type"], "其他")
            lines.append(f"{i}. **{d['title']}**（{label}）— {d['char_count']:,} 字　*{d['created_at']}*")
            if d["summary"]:
                lines.append(f"   > {d['summary']}")
        lines += ["", "---", ""]

        # 文件全文（按類別分組）
        doc_type_groups: dict[str, list] = {}
        for d in _knowledge_store:
            label = TYPE_LABELS.get(d["type"], "其他文件")
            doc_type_groups.setdefault(label, []).append(d)

        for type_label, docs in doc_type_groups.items():
            lines += [f"## {type_label}", ""]
            for d in docs:
                lines += [
                    f"### 📄 {d['title']}",
                    f"",
                    f"**摘要：** {d['summary']}",
                    f"",
                    f"**字數：** {d['char_count']:,} 字　｜　**上傳日期：** {d['created_at']}",
                    f"",
                    d["content"],
                    f"",
                    "---",
                    "",
                ]
    else:
        lines += ["（尚未上傳文件）", ""]

    lines += [
        f"## ℹ️ 關於此檔案",
        f"",
        f"- 由「寵妻神器 CVS 行銷 AI 面板」自動生成",
        f"- 可貼入任何支援 System Prompt 的 AI 工具",
        f"- 每次更新資料後建議重新匯出",
    ]

    return Response(
        content="\n".join(lines).encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="my_ai_knowledge_{today}.md"'},
    )
