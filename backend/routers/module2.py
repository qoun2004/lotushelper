import os, io, json, re, time, base64
from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import JSONResponse
from typing import List, Optional
import pandas as pd
import anthropic

router = APIRouter()
MODEL = "claude-sonnet-4-6"


def get_client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def call_claude(client, max_tokens, messages, retries=3):
    for attempt in range(retries):
        try:
            return client.messages.create(model=MODEL, max_tokens=max_tokens, messages=messages)
        except anthropic.APIStatusError as e:
            if e.status_code == 529 and attempt < retries - 1:
                time.sleep(2 ** attempt * 3)
                continue
            raise


def extract_pdf_text(file_bytes: bytes) -> str:
    """嘗試用 pdfplumber 抽文字；若失敗或無文字則回傳空字串"""
    try:
        import pdfplumber
        parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages[:15], 1):
                t = (page.extract_text() or "").strip()
                if t:
                    parts.append(f"[第{i}頁]\n{t}")
                for tbl in (page.extract_tables() or []):
                    rows = [" | ".join(str(c or "") for c in row) for row in tbl if any(row)]
                    if rows:
                        parts.append("[表格]\n" + "\n".join(rows[:20]))
        return "\n\n".join(parts)
    except Exception:
        return ""


def pdf_to_images_b64(file_bytes: bytes, max_pages: int = 6):
    """把 PDF 每頁轉成 base64 JPEG，供 Claude Vision 使用"""
    try:
        from PIL import Image
        import pdfplumber
        images = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages[:max_pages]:
                img = page.to_image(resolution=100).original   # PIL Image
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=75)
                images.append(base64.standard_b64encode(buf.getvalue()).decode())
        return images
    except Exception:
        return []


def excel_to_summary(file_bytes: bytes, filename: str) -> str:
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
        df = df.dropna(how="all").dropna(axis=1, how="all")
        lines = [f"銷售明細：{filename}",
                 f"欄位：{', '.join(df.columns.astype(str))}",
                 f"筆數：{len(df)}", "",
                 "前30筆：", df.head(30).to_string(index=False)]
        num_cols = df.select_dtypes(include="number").columns
        if len(num_cols):
            lines += ["", "數值統計：", df[num_cols].describe().to_string()]
        return "\n".join(lines)
    except Exception as e:
        return f"銷售 Excel 讀取失敗：{e}"


def safe_json(raw: str) -> dict | None:
    """嘗試解析 JSON，失敗回傳 None"""
    for pattern in [r'\{[\s\S]*\}']:
        try:
            m = re.search(pattern, raw)
            if m:
                return json.loads(m.group())
        except Exception:
            pass
    return None


def fill_defaults(d: dict) -> dict:
    """補齊所有必要欄位，確保前端不崩潰"""
    d.setdefault("overview", {})
    d["overview"].setdefault("festival", "節慶檔期")
    d["overview"].setdefault("period", "")
    d["overview"].setdefault("one_line", "")
    d.setdefault("avoid", "")
    d.setdefault("continue_good", "")
    d.setdefault("products_star", [])
    d.setdefault("products_avoid", [])
    d.setdefault("campaign_ideas", [])
    d.setdefault("strategy", "")
    d.setdefault("action_items", [])
    d.setdefault("report_text", "")
    d.setdefault("categories", {})   # 商品分類分析
    # 確保 list 類欄位是 list
    for key in ("products_star", "products_avoid", "campaign_ideas", "action_items"):
        if not isinstance(d[key], list):
            d[key] = []
    # 確保 products_star 每筆有必要欄位
    fixed_stars = []
    for p in d["products_star"]:
        if isinstance(p, dict) and p.get("name"):
            p.setdefault("reason", "")
            p.setdefault("action", "")
            fixed_stars.append(p)
    d["products_star"] = fixed_stars
    # 確保 products_avoid 每筆有必要欄位
    fixed_avoid = []
    for p in d["products_avoid"]:
        if isinstance(p, dict) and p.get("name"):
            p.setdefault("reason", "")
            fixed_avoid.append(p)
    d["products_avoid"] = fixed_avoid
    # 確保 campaign_ideas 每筆有必要欄位
    fixed_ideas = []
    for c in d["campaign_ideas"]:
        if isinstance(c, dict) and c.get("title"):
            c.setdefault("desc", "")
            c.setdefault("kv", "")
            fixed_ideas.append(c)
    d["campaign_ideas"] = fixed_ideas
    return d


ANALYSIS_PROMPT = """你是一位台灣百大 CVS（超商）通路的資深行銷策略顧問，擅長節慶檔期規劃與 DM 企劃優化。

以下是行銷經理提供的資料：
{dm_block}
{sales_block}

目標年份：{year} 年

{multi_year_note}

請輸出「嚴格合法的 JSON」，不要有任何 JSON 以外的文字，不要有 markdown code block，直接輸出 {{ 開頭：

{{
  "overview": {{
    "festival": "檔期名稱（如七夕、中元、雙十一、年菜預購）",
    "period": "涵蓋時間",
    "one_line": "一句話策略總結"
  }},
  "avoid": "去年踩坑/不佳策略（3-5點條列，每點換行，用「• 」開頭，說明原因與今年改善方向）",
  "continue_good": "去年成功亮點（3-5點條列，每點換行，用「• 」開頭，說明為何成功與今年如何延續）",
  "products_star": [
    {{"name": "品項名稱", "reason": "推薦原因（含跨年對比依據）", "action": "今年建議做法"}},
    {{"name": "品項名稱", "reason": "推薦原因", "action": "今年建議做法"}},
    {{"name": "品項名稱", "reason": "推薦原因", "action": "今年建議做法"}}
  ],
  "products_avoid": [
    {{"name": "品項/品類", "reason": "不建議原因"}}
  ],
  "categories": {{
    "年菜類": {{"items": ["品項1", "品項2"], "trend": "成長/持平/衰退", "note": "簡評"}},
    "家電生活類": {{"items": ["品項1"], "trend": "成長/持平/衰退", "note": "簡評"}},
    "飲料飲品類": {{"items": ["品項1", "品項2"], "trend": "成長/持平/衰退", "note": "簡評"}},
    "零食點心類": {{"items": ["品項1"], "trend": "成長/持平/衰退", "note": "簡評"}},
    "其他": {{"items": [], "trend": "持平", "note": ""}}
  }},
  "campaign_ideas": [
    {{"title": "活動標題", "desc": "執行方式", "kv": "主視覺概念"}},
    {{"title": "活動標題", "desc": "執行方式", "kv": "主視覺概念"}},
    {{"title": "活動標題", "desc": "執行方式", "kv": "主視覺概念"}}
  ],
  "strategy": "今年整體策略（300-500字，涵蓋主題、選品、定價、行銷節奏）",
  "action_items": [
    "• 立即行動（本週）：...",
    "• 短期（2週內）：...",
    "• 中期（1個月前）：...",
    "• 長期（檔期前佈局）：..."
  ],
  "report_text": "完整策略建議書全文（800-1200字，適合直接提報主管）"
}}"""


def image_bytes_to_b64(raw: bytes) -> str | None:
    """把圖片（JPG/PNG/HEIC 等）轉成 JPEG base64"""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(raw))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82)
        return base64.standard_b64encode(buf.getvalue()).decode()
    except Exception:
        return None


async def _read_pdfs(form, prefix: str, label: str):
    """從 form 讀取 {prefix}_0, {prefix}_1... PDF 或圖片，回傳 (texts, images)"""
    texts, images = [], []
    i = 0
    while True:
        f = form.get(f"{prefix}_{i}")
        if f is None:
            break
        raw = await f.read()
        if raw:
            fname = getattr(f, "filename", "") or ""
            ct = getattr(f, "content_type", "") or ""
            # 判斷是圖片（MIME 或副檔名）
            is_image = ct.startswith("image/") or fname.lower().endswith(
                (".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp", ".tiff")
            )
            if is_image:
                b64 = image_bytes_to_b64(raw)
                if b64:
                    images.append((f"{label} - {fname}", [b64]))
            else:
                # PDF 邏輯：先抽文字，若無則轉圖
                text = extract_pdf_text(raw)
                if text.strip():
                    texts.append(f"《{label} - {fname}》\n{text}")
                else:
                    imgs = pdf_to_images_b64(raw)
                    if imgs:
                        images.append((f"{label} - {fname}", imgs))
                    else:
                        texts.append(f"《{label} - {fname}》（掃描型 PDF，將以視覺辨識）")
        i += 1
    return texts, images


@router.post("/analyze")
async def analyze(request: Request):
    try:
        form = await request.form()
        year = form.get("year", str(__import__("datetime").date.today().year))
        prev_year = str(int(year) - 2)   # 前年
        last_year = str(int(year) - 1)   # 去年

        # ── 前年 DM（prev_pdf_0...）──
        prev_texts, prev_images = await _read_pdfs(form, "prev_pdf", f"{prev_year}年DM")

        # ── 去年 DM（last_pdf_0...）或舊格式 pdf_0（相容舊版）──
        last_texts, last_images = await _read_pdfs(form, "last_pdf", f"{last_year}年DM")
        if not last_texts and not last_images:
            # 相容舊版：pdf_0 格式
            old_texts, old_images = await _read_pdfs(form, "pdf", f"{last_year}年DM")
            last_texts, last_images = old_texts, old_images

        # ── 收 Excel ──
        excel_summary = ""
        sales_file = form.get("sales_excel")
        if sales_file:
            raw = await sales_file.read()
            if raw:
                excel_summary = excel_to_summary(raw, sales_file.filename)

        all_texts = prev_texts + last_texts
        all_images = prev_images + last_images

        if not all_texts and not all_images and not excel_summary:
            return JSONResponse({"error": "請至少上傳一份 DM PDF 或銷售 Excel"}, status_code=400)

        # ── 組 dm_block ──
        dm_parts = []
        if prev_texts:
            dm_parts.append(f"【{prev_year}年（前年）DM 內容】\n" + "\n\n".join(prev_texts))
        if last_texts:
            dm_parts.append(f"【{last_year}年（去年）DM 內容】\n" + "\n\n".join(last_texts))
        if all_images:
            dm_parts.append(f"（另有 {sum(len(v) for _,v in all_images)} 張圖片頁面，將以視覺辨識）")

        dm_block = "\n\n".join(dm_parts) if dm_parts else "（未提供文字型 DM，請參考圖片內容分析）"
        sales_block = f"【銷售明細 Excel】\n{excel_summary}" if excel_summary else ""

        # ── 多年對比提示 ──
        has_two_years = bool(prev_texts or prev_images) and bool(last_texts or last_images)
        multi_year_note = (
            f"⚠️ 重要：你有前年（{prev_year}）和去年（{last_year}）兩年的 DM 資料，"
            f"請進行「前年→去年→今年（{year}）」三年縱向對比分析，"
            "重點找出跨年趨勢、連續踩坑、持續成功的品項。"
            if has_two_years else
            f"請根據 {last_year} 年（去年）DM 資料，規劃 {year} 年的策略。"
        )

        prompt_text = ANALYSIS_PROMPT.format(
            dm_block=dm_block,
            sales_block=sales_block,
            year=year,
            multi_year_note=multi_year_note,
        )

        # ── 組合 message content ──
        content = []
        # 先放所有圖片（Vision）
        for filename, imgs in all_images:
            content.append({"type": "text", "text": f"以下是《{filename}》的 DM 圖片內容："})
            for b64 in imgs:
                content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}
                })
        # 最後放文字 prompt
        content.append({"type": "text", "text": prompt_text})

        msg = call_claude(get_client(), 8192, [{"role": "user", "content": content}])
        raw_text = msg.content[0].text

        parsed = safe_json(raw_text)
        if not parsed:
            # JSON 解析失敗 → 讓 Claude 重新整理成 JSON
            fix_msg = call_claude(get_client(), 8192, [
                {"role": "user", "content": prompt_text},
                {"role": "assistant", "content": raw_text},
                {"role": "user", "content": "你的回答包含非 JSON 內容。請只輸出合法 JSON，從 { 開始，以 } 結束，不要有任何其他文字。"},
            ])
            parsed = safe_json(fix_msg.content[0].text)

        if not parsed:
            return JSONResponse({"error": "AI 回應格式異常，請重試"}, status_code=500)

        return JSONResponse(fill_defaults(parsed))

    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ══════════════════════════════════════════════════════════════════
#  DM × Excel 稽核比對端點
#  POST /api/module2/audit
#  - dm_pdf_0, dm_pdf_1... : DM PDF 檔（支援圖片型掃描 PDF）
#  - price_excel           : 商品對照 Excel（品名/規格/售價）
# ══════════════════════════════════════════════════════════════════

def excel_to_product_list(file_bytes: bytes) -> str:
    """把商品 Excel 轉成結構化文字，供 Claude 比對用"""
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
        df = df.dropna(how="all").dropna(axis=1, how="all")
        # 取前 200 筆，避免 token 過多
        return f"商品對照表（{len(df)} 筆）：\n欄位：{', '.join(df.columns.astype(str))}\n\n{df.head(200).to_string(index=False)}"
    except Exception as e:
        return f"Excel 讀取失敗：{e}"


@router.post("/audit")
async def audit_dm_vs_excel(request: Request):
    """DM 內容 × 商品 Excel 交叉稽核，找出標示錯誤/規格不符/價格差異"""
    form = await request.form()

    # ── 收集 DM PDF 或圖片 ──
    dm_pages_content = []
    i = 0
    while True:
        f = form.get(f"dm_pdf_{i}")
        if f is None:
            break
        raw = await f.read()
        fname = getattr(f, "filename", "") or ""
        ct = getattr(f, "content_type", "") or ""
        is_image = ct.startswith("image/") or fname.lower().endswith(
            (".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp")
        )
        if is_image:
            b64 = image_bytes_to_b64(raw)
            if b64:
                dm_pages_content.append({"type": "images", "name": fname, "images": [b64]})
        else:
            # PDF：優先 Vision
            images = pdf_to_images_b64(raw, max_pages=10)
            if images:
                dm_pages_content.append({"type": "images", "name": fname, "images": images})
            else:
                text = extract_pdf_text(raw)
                dm_pages_content.append({"type": "text", "name": fname, "text": text})
        i += 1

    if not dm_pages_content:
        return JSONResponse({"error": "請上傳至少一份 DM PDF"}, status_code=400)

    # ── 收集商品 Excel ──
    price_file = form.get("price_excel")
    if not price_file:
        return JSONResponse({"error": "請上傳商品對照 Excel"}, status_code=400)
    price_raw  = await price_file.read()
    excel_text = excel_to_product_list(price_raw)

    # ── 組合 Vision + 文字 prompt ──
    content = []

    for dm in dm_pages_content:
        if dm["type"] == "images":
            content.append({"type": "text", "text": f"\n=== DM 目錄：{dm['name']} ===\n（以下為 DM 頁面圖片，請逐頁識別所有商品）"})
            for b64 in dm["images"]:
                content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}})
        else:
            content.append({"type": "text", "text": f"\n=== DM 目錄文字內容：{dm['name']} ===\n{dm['text']}"})

    content.append({"type": "text", "text": f"\n=== 商品正式對照表（Excel）===\n{excel_text}"})

    audit_prompt = """
你是台灣 CVS 超商通路的商品資訊稽核 AI。

請仔細比對上方的 DM 目錄（可能為圖片或文字）與商品對照 Excel，找出所有資訊不一致的地方。

比對重點：
1. 價格：DM 標示價格 vs Excel 正式售價
2. 規格：DM 標示容量/克數/數量 vs Excel 規格
3. 品名：DM 品名 vs Excel 品名（含錯字、簡寫不一致）
4. DM 有但 Excel 無：可能是新品未建檔或誤植品項
5. Excel 有但 DM 無：已下架或遺漏刊登的品項

輸出格式（純 JSON，不要任何說明文字）：
{
  "summary": {
    "dm_items": 數字（DM 識別到的品項數）,
    "matched": 數字（成功對比且一致的品項數）,
    "issues": 數字（發現異常的筆數）
  },
  "issues": [
    {
      "product_name": "品項名稱",
      "type": "價格不符 | 規格不符 | 品名不符 | DM 有但 Excel 無 | Excel 有但 DM 無",
      "dm_value": "DM 上顯示的內容",
      "excel_value": "Excel 正確值",
      "suggestion": "建議修正說明（一句話）"
    }
  ],
  "matched_items": ["品名1", "品名2", ...]
}

注意：若 DM 為掃描圖片，請用視覺辨識讀取所有可見文字。price_excel 中可能沒有完整欄位名稱，請自行判斷哪些欄位是品名/規格/價格。
"""
    content.append({"type": "text", "text": audit_prompt})

    try:
        client = get_client()
        msg = call_claude(client, 6144, [{"role": "user", "content": content}])
        raw_text = msg.content[0].text
        parsed = safe_json(raw_text)

        if not parsed:
            # 讓 Claude 整理成 JSON
            fix = call_claude(client, 4096, [
                {"role": "user", "content": audit_prompt},
                {"role": "assistant", "content": raw_text},
                {"role": "user", "content": "請只輸出合法 JSON，從 { 開始，以 } 結束。"},
            ])
            parsed = safe_json(fix.content[0].text)

        if not parsed:
            return JSONResponse({"error": "AI 回應格式異常，請重試"}, status_code=500)

        return JSONResponse(parsed)

    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
