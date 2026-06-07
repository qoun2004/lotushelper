import os, json, re, time
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import anthropic

router = APIRouter()
MODEL_MAIN = "claude-sonnet-4-6"

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

def safe_json(raw: str):
    try:
        m = re.search(r'\{[\s\S]*\}', raw)
        if m: return json.loads(m.group())
    except: pass
    return None

def fill_defaults(data: dict) -> dict:
    data.setdefault("title", "會議記錄")
    data.setdefault("summary", "")
    data.setdefault("attendees", [])
    data.setdefault("decisions", [])
    data.setdefault("action_items", [])
    data.setdefault("pending", [])
    data.setdefault("next_meeting", "")
    data.setdefault("key_points", [])
    for key in ("attendees", "decisions", "action_items", "pending", "key_points"):
        if not isinstance(data.get(key), list):
            data[key] = []
    normalized_actions = []
    for item in data.get("action_items", []):
        if isinstance(item, dict):
            normalized_actions.append({
                "task": str(item.get("task", "")),
                "owner": str(item.get("owner", "")),
                "deadline": str(item.get("deadline", "")),
            })
        elif item:
            normalized_actions.append({"task": str(item), "owner": "", "deadline": ""})
    data["action_items"] = normalized_actions
    return data

class MeetingRequest(BaseModel):
    transcript: str
    meeting_type: str = ""
    date: str = ""

@router.post("/analyze")
async def analyze_meeting(req: MeetingRequest):
    if not req.transcript.strip():
        return JSONResponse({"error": "請提供會議逐字稿"}, status_code=400)

    type_hint = f"（會議類型：{req.meeting_type}）" if req.meeting_type else ""
    date_hint = f"（會議日期：{req.date}）" if req.date else ""

    prompt = f"""你是專業的行政會議記錄整理員{type_hint}{date_hint}。

請分析以下會議逐字稿（可能是語音轉文字，內容可能不夠流暢），整理成清楚的結構化會議記錄。

【逐字稿內容】
{req.transcript[:12000]}

請以繁體中文輸出合法 JSON（所有欄位必須存在）：
{{
  "title": "會議主題（根據內容自動命名，10字內）",
  "summary": "會議摘要（3-4句，說明會議目的與主要結論）",
  "attendees": ["出席人員1", "出席人員2"],
  "decisions": [
    "決議事項1（具體說明，直接可執行）",
    "決議事項2"
  ],
  "action_items": [
    {{"task": "待辦任務說明", "owner": "負責人（若未提及填空字串）", "deadline": "截止日（若未提及填空字串）"}},
    {{"task": "另一個任務", "owner": "", "deadline": ""}}
  ],
  "pending": ["待確認事項1（需要後續追蹤的問題）", "待確認事項2"],
  "next_meeting": "下次會議時間（若未提及填空字串）",
  "key_points": ["重要資訊或數據1", "重要資訊或數據2", "重要資訊或數據3"]
}}

若逐字稿中沒有提到某項資訊，對應欄位填空陣列 [] 或空字串 "" 即可，不要捏造。"""

    try:
        msg = call_claude(get_client(), MODEL_MAIN, 4000, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if not parsed:
            return JSONResponse({"error": "分析失敗，請重試"}, status_code=500)
        return JSONResponse(fill_defaults(parsed))
    except Exception as e:
        err = str(e)
        if "overloaded" in err or "529" in err:
            return JSONResponse({"error": "529_overloaded"}, status_code=200)
        return JSONResponse({"error": err}, status_code=500)
