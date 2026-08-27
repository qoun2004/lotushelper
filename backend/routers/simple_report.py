import io
import json
import os
import re
import time
from typing import Optional

import anthropic
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from routers.knowledge import (
    _format_profile_context,
    _knowledge_store,
    _profile_data,
    extract_text_from_file,
)

router = APIRouter()

MODEL_MAIN = os.getenv("REPORT_MODEL", "claude-sonnet-4-6")


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


def safe_json(raw: str) -> dict | None:
    try:
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return None


def related_context(query: str, limit: int = 4) -> str:
    parts = []
    profile = _format_profile_context(_profile_data)
    if profile:
        parts.append(profile)

    keywords = [w.lower() for w in re.split(r"[\s,，、。/]+", query or "") if len(w.strip()) >= 2]
    scored = []
    for doc in _knowledge_store:
        haystack = (doc.get("title", "") + doc.get("summary", "") + doc.get("content", "")).lower()
        score = sum(haystack.count(k) for k in keywords) if keywords else 1
        if score > 0:
            scored.append((score, doc))
    scored.sort(key=lambda x: -x[0])

    for _, doc in scored[:limit]:
        parts.append(
            f"【過去參考：{doc.get('title', '未命名文件')}】\n"
            f"摘要：{doc.get('summary', '')}\n"
            f"內容節錄：\n{doc.get('content', '')[:1800]}"
        )

    return "\n\n---\n\n".join(parts)


def fill_defaults(data: dict, report_type: str) -> dict:
    data.setdefault("title", "報告草稿")
    data.setdefault("report_type", report_type)
    data.setdefault("summary", "")
    data.setdefault("highlights", [])
    data.setdefault("risks", [])
    data.setdefault("action_items", [])
    data.setdefault("suggested_title", data.get("title", "報告草稿"))
    data.setdefault("report_text", "")
    data.setdefault("sections", [])
    data.setdefault("source_notes", [])

    for key in ("highlights", "risks", "action_items", "sections", "source_notes"):
        if not isinstance(data.get(key), list):
            data[key] = []

    if not data["report_text"]:
        lines = [data["title"], "", data["summary"], ""]
        for section in data["sections"]:
            if isinstance(section, dict):
                lines.append(section.get("heading", ""))
                lines.append(section.get("content", ""))
                lines.append("")
        data["report_text"] = "\n".join([line for line in lines if line is not None]).strip()

    return data


@router.get("/model_status")
async def model_status():
    return JSONResponse({
        "anthropic_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")),
        "active_report_model": MODEL_MAIN,
    })


@router.post("/generate")
async def generate_simple_report(
    report_type: str = Form("weekly"),
    audience: str = Form("主管"),
    output_style: str = Form("executive"),
    length_limit: str = Form("2頁內"),
    user_request: str = Form(""),
    selected_focus: str = Form(""),
    file_password: str = Form(""),
    files: list[UploadFile] = File(default=[]),
):
    try:
        file_sections = []
        unreadable_files = []
        for index, file in enumerate(files[:8], 1):
            raw = await file.read()
            if not raw:
                continue
            text = extract_text_from_file(raw, file.filename or f"檔案{index}", passwords=[file_password])
            if "可能有密碼保護，目前無法讀取" in text or "讀取失敗" in text:
                unreadable_files.append(text)
                continue
            file_sections.append(
                f"【上傳資料 {index}：{file.filename}】\n"
                f"讀取內容：\n{text[:10000]}"
            )

        if unreadable_files and not file_sections and not user_request.strip():
            return JSONResponse({
                "error": "檔案目前無法讀取，可能需要密碼。請在「檔案密碼」欄輸入後重試。",
                "details": unreadable_files[:3],
            }, status_code=400)

        if not file_sections and not user_request.strip():
            return JSONResponse({"error": "請至少上傳一份資料，或用文字/語音說明需求"}, status_code=400)

        type_labels = {
            "weekly": "本週週報",
            "monthly": "本月月報",
            "meeting": "會議/討論整理",
            "event": "活動/開學準備報告",
            "custom": "自訂報告",
        }
        style_labels = {
            "executive": "主管簡報版，先結論後細節，重點條列清楚",
            "detailed": "詳細文字版，脈絡完整，適合正式文件",
            "checklist": "待辦清單版，強調下一步、負責人、期限",
            "story": "成果敘事版，適合描述進度、亮點與影響",
        }

        query = " ".join([type_labels.get(report_type, report_type), user_request, selected_focus])
        context = related_context(query)
        data_block = "\n\n---\n\n".join(file_sections)
        focus = selected_focus or "由 AI 自動判斷重點"

        prompt = f"""你是一位資深上市櫃公司行銷主管，也是細心的行政報告編輯。

任務：請根據使用者上傳資料與需求，產出可直接交付的繁體中文報告。

【報告類型】
{type_labels.get(report_type, report_type)}

【報告對象】
{audience}

【輸出風格】
{style_labels.get(output_style, output_style)}

【限制條件】
{length_limit}

【使用者補充需求】
{user_request or "未補充，請依資料自行判斷。"}

【固定分析重點】
{focus}

【過去成果與個人風格參考】
{context or "沒有提供過去成果。請用清楚、務實、主管可讀的格式撰寫。"}

【本次上傳資料】
{data_block or "沒有上傳檔案。請根據使用者需求產出可用草稿。"}

請注意：
1. 不要捏造資料中沒有的數字；若資料不足，請明確寫「資料不足，建議補充」。
2. 請模仿過去成果的語氣與架構，但不要照抄。
3. 報告要讓忙碌主管能快速看懂：先結論、再重點、最後行動。
4. 若資料包含 Excel 表格，請主動找出趨勢、異常、亮點與待追蹤項目。
5. 若資料包含 PDF/Word/截圖文字，請整理成可行動的重點。

只輸出合法 JSON：
{{
  "title": "報告標題",
  "report_type": "{report_type}",
  "summary": "150字內摘要，直接說結論",
  "highlights": ["亮點1", "亮點2", "亮點3"],
  "risks": ["風險或資料不足1", "風險或資料不足2"],
  "action_items": [
    {{"task": "下一步事項", "owner": "負責人或空字串", "deadline": "期限或空字串"}}
  ],
  "sections": [
    {{"heading": "段落標題", "content": "段落內容"}}
  ],
  "source_notes": ["引用或判斷依據1", "引用或判斷依據2"],
  "suggested_title": "適合放在 Word/PPT 的標題",
  "report_text": "完整可複製報告全文，格式清楚，適合直接貼到 Word"
}}"""

        msg = call_claude(get_client(), MODEL_MAIN, 7000, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if not parsed:
            return JSONResponse({"error": "AI 回應格式異常，請重試"}, status_code=500)
        return JSONResponse(fill_defaults(parsed, report_type))
    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}：{str(e)[:240]}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
