import os, json, re, time
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import anthropic
import httpx

router = APIRouter()
MODEL_FAST = "claude-haiku-4-5-20251001"
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

def strip_html(html: str) -> str:
    html = re.sub(r'<(script|style)[^>]*>[\s\S]*?</\1>', '', html, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', html)
    return re.sub(r'\s+', ' ', text).strip()[:2500]

# 每日快報快取
_daily_cache: dict = {}

# ── 搜尋類別定義 ─────────────────────────────────────────────────────
CATEGORIES = [
    {
        "key":     "viral",
        "label":   "🔥 爆紅商品",
        "queries": [
            "台灣 爆紅 商品 社群口碑 2025",
            "台灣 網紅推薦 爆款 食品飲料 2025",
        ],
        "ai_topic": "台灣近期在社群媒體爆紅的商品、食品飲料、生活用品",
    },
    {
        "key":     "media",
        "label":   "📰 媒體採訪小店",
        "queries": [
            "台灣 小店 媒體採訪 爆紅 2025",
            "台灣 獨立品牌 新聞報導 人氣 2025",
        ],
        "ai_topic": "台灣被媒體採訪、報導的人氣小店、獨立品牌、街邊名店",
    },
    {
        "key":     "cvs",
        "label":   "🏪 超商新品",
        "queries": [
            "7-11 全家 萊爾富 新品 聯名 限定 2025",
            "超商 新品上市 限定商品 2025",
        ],
        "ai_topic": "台灣超商（7-11、全家、萊爾富）近期新品、聯名商品、限定商品",
    },
    {
        "key":     "collab",
        "label":   "🤝 品牌聯名",
        "queries": [
            "台灣 品牌聯名 限定 新品 2025",
            "台灣 IP聯名 食品 飲料 話題 2025",
        ],
        "ai_topic": "台灣品牌聯名、IP合作、限定商品、話題行銷案例",
    },
]

# ── Request Models ───────────────────────────────────────────────────
class ScanRequest(BaseModel):
    category: str = "viral"
    custom_query: str = ""

class AnalyzeUrlRequest(BaseModel):
    url: str
    title: str = ""
    snippet: str = ""

# ── Google Custom Search ─────────────────────────────────────────────
async def google_search(query: str, api_key: str, cse_id: str, num: int = 6) -> list:
    params = {
        "key": api_key, "cx": cse_id, "q": query,
        "lr": "lang_zh-TW", "gl": "tw", "num": num,
        "dateRestrict": "m3",  # 近 3 個月
    }
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get("https://www.googleapis.com/customsearch/v1", params=params)
        data = res.json()
    return data.get("items", [])

async def quick_score(title: str, snippet: str) -> dict:
    """用 Haiku 快速評分商機潛力"""
    prompt = f"""你是台灣超商/零售行銷主管，快速評估以下資訊的「開發合作商機」。

標題：{title}
摘要：{snippet}

輸出 JSON（只輸出 JSON）：
{{"score": 4, "action": "聯名開發", "reason": "一句話說明商機或無需關注的原因"}}

score 說明：5=必須追蹤, 4=值得聯繫, 3=觀察, 2=參考, 1=無關
action 選項：聯名開發 / 採購合作 / 學習跟風 / 持續觀察 / 無需關注"""
    try:
        msg = call_claude(get_client(), MODEL_FAST, 150, [{"role": "user", "content": prompt}])
        return safe_json(msg.content[0].text) or {"score": 2, "action": "觀察", "reason": "無法自動分析"}
    except:
        return {"score": 2, "action": "觀察", "reason": "分析失敗"}

# ── AI 備援：沒有 Google Key 時用 Claude 生成市場情報 ──────────────
async def ai_generate_results(category_key: str, custom_query: str = "") -> list:
    cat = next((c for c in CATEGORIES if c["key"] == category_key), CATEGORIES[0])
    topic = custom_query or cat["ai_topic"]

    prompt = f"""你是台灣資深零售行銷市場分析師，專注超商通路。

請分析：{topic}

列出 6 個近期具體的案例或趨勢，適合超商行銷主管關注。每個要有：
- 具體名稱（品牌名/商品名/店名/趨勢主題）
- 為什麼值得關注（2-3句，說明爆紅原因或市場意義）
- 開發合作潛力分 1-5（5最高）
- 建議行動

輸出合法 JSON：
{{
  "results": [
    {{
      "title": "案例/趨勢名稱",
      "snippet": "為什麼值得關注（2-3句具體說明，不要泛泛而談）",
      "link": "",
      "score": 4,
      "action": "聯名開發",
      "reason": "一句話說明商機"
    }}
  ]
}}"""

    msg = call_claude(get_client(), MODEL_MAIN, 1800, [{"role": "user", "content": prompt}])
    parsed = safe_json(msg.content[0].text)
    return parsed.get("results", []) if parsed else []

# ── 端點一：掃描特定類別 ─────────────────────────────────────────────
@router.post("/scan")
async def scan_market(req: ScanRequest):
    """搜尋指定類別的市場資訊，回傳結果清單"""
    api_key = os.getenv("GOOGLE_API_KEY", "")
    cse_id  = os.getenv("GOOGLE_CSE_ID", "")

    try:
        if api_key and cse_id:
            # 有 Google API Key：真實搜尋
            cat = next((c for c in CATEGORIES if c["key"] == req.category), CATEGORIES[0])
            queries = [req.custom_query] if req.custom_query else cat["queries"]

            raw_items = []
            for q in queries[:2]:
                items = await google_search(q, api_key, cse_id, num=5)
                raw_items.extend(items)

            # 去重
            seen, unique = set(), []
            for item in raw_items:
                if item.get("link") not in seen:
                    seen.add(item.get("link"))
                    unique.append(item)

            # 評分
            results = []
            for item in unique[:6]:
                title   = item.get("title", "")
                snippet = item.get("snippet", "")
                opp     = await quick_score(title, snippet)
                results.append({
                    "title":   title,
                    "snippet": snippet,
                    "link":    item.get("link", ""),
                    "score":   opp.get("score", 2),
                    "action":  opp.get("action", "觀察"),
                    "reason":  opp.get("reason", ""),
                })
            results.sort(key=lambda x: x["score"], reverse=True)
            return JSONResponse({"results": results, "category": req.category, "source": "google"})

        else:
            # 無 Google API Key：AI 生成
            results = await ai_generate_results(req.category, req.custom_query)
            results.sort(key=lambda x: x.get("score", 0), reverse=True)
            return JSONResponse({"results": results, "category": req.category, "source": "ai"})

    except Exception as e:
        return JSONResponse({"error": str(e), "results": []}, status_code=500)

# ── 端點二：深度分析特定 URL ─────────────────────────────────────────
@router.post("/analyze_url")
async def analyze_url(req: AnalyzeUrlRequest):
    """深度分析一個品牌/商品頁面的開發合作潛力"""
    try:
        # 嘗試抓取頁面內容
        page_text = f"{req.title}\n{req.snippet}"
        if req.url:
            try:
                async with httpx.AsyncClient(
                    timeout=12, follow_redirects=True,
                    headers={'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'}
                ) as client:
                    res  = await client.get(req.url)
                    page_text = strip_html(res.text)
            except:
                pass  # 抓不到就用 title + snippet

        prompt = f"""你是台灣超商/零售行銷主管，評估一個品牌/商品的開發合作商機。

來源：{req.url or '用戶提供'}
標題：{req.title}
內容：
{page_text[:2000]}

請從超商行銷主管的角度給出詳細商機分析。輸出合法 JSON：
{{
  "brand_summary": "品牌/商品概況（2-3句，說明這是什麼）",
  "viral_reason": "爆紅/受關注的原因（2-3句）",
  "cvs_fit": "超商通路適合度分析（3-4句，說明適不適合、理由）",
  "collab_suggestion": "開發合作建議（3-4句，具體說明什麼合作方式）",
  "value": "高",
  "value_reason": "預估合作價值說明（2句）",
  "next_action": "建議下一步具體行動（如：搜尋官網聯絡窗口、到 IG 私訊合作詢問）",
  "score": 4,
  "contact_hint": "如何接觸這個品牌的方式（如：IG/官網/展覽/通路負責人）"
}}"""

        msg = call_claude(get_client(), MODEL_MAIN, 1000, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if parsed:
            parsed["url"]   = req.url
            parsed["title"] = req.title
            return JSONResponse(parsed)
        return JSONResponse({"error": "分析失敗，請重試"}, status_code=500)

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# ── 端點三：每日快報 ─────────────────────────────────────────────────
@router.get("/daily_report")
async def daily_report():
    """每日市場快報 — 掃描全部 4 大類別，當天快取"""
    today = datetime.now().strftime("%Y-%m-%d")
    if _daily_cache.get("date") == today:
        return JSONResponse(_daily_cache["report"])

    report = await _run_daily_scan()
    _daily_cache["date"]   = today
    _daily_cache["report"] = report
    return JSONResponse(report)

@router.post("/admin/trigger_scan")
async def trigger_daily_scan():
    """手動觸發每日掃描（清除快取後重新生成）"""
    _daily_cache.clear()
    report = await _run_daily_scan()
    _daily_cache["date"]   = datetime.now().strftime("%Y-%m-%d")
    _daily_cache["report"] = report
    return JSONResponse({"message": "掃描完成", **report})

# ── 內部：執行全類別掃描 ─────────────────────────────────────────────
async def _run_daily_scan() -> dict:
    api_key = os.getenv("GOOGLE_API_KEY", "")
    cse_id  = os.getenv("GOOGLE_CSE_ID", "")
    all_categories = {}

    for cat in CATEGORIES:
        try:
            if api_key and cse_id:
                raw = await google_search(cat["queries"][0], api_key, cse_id, num=3)
                results = []
                for item in raw[:3]:
                    opp = await quick_score(item.get("title",""), item.get("snippet",""))
                    results.append({
                        "title":   item.get("title",""),
                        "snippet": item.get("snippet",""),
                        "link":    item.get("link",""),
                        **opp,
                    })
            else:
                results = (await ai_generate_results(cat["key"]))[:3]
            all_categories[cat["key"]] = results
        except:
            all_categories[cat["key"]] = []

    return {
        "date":       datetime.now().strftime("%Y-%m-%d %H:%M"),
        "categories": all_categories,
    }
