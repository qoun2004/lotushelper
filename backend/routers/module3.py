import os, json, re, time
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import anthropic

router = APIRouter()
MODEL_FAST = "claude-haiku-4-5-20251001"
MODEL_MAIN  = "claude-sonnet-4-6"   # 更新為最新 Sonnet

# ── 每日廠商推薦快取（當日有效，重啟失效）────────────────────────
_daily_cache: dict = {}   # {"2025-06-06": {...response...}}

def get_client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def call_claude(client, model, max_tokens, messages, retries=3):
    for attempt in range(retries):
        try:
            return client.messages.create(model=model, max_tokens=max_tokens, messages=messages)
        except anthropic.APIStatusError as e:
            if e.status_code == 529 and attempt < retries - 1:
                time.sleep(2 ** attempt * 3)
                continue
            raise

def safe_json(raw: str):
    try:
        m = re.search(r'\{[\s\S]*\}', raw)
        if m: return json.loads(m.group())
    except: pass
    return None


# ── 台灣公開公司資料搜尋 ─────────────────────────────────────────
async def search_tw_companies_gov(keyword: str, category: str = "") -> list:
    """
    從台灣 g0v 公司資料庫 + 政府開放資料搜尋真實廠商
    資料來源：company.g0v.tw（整合經濟部商業司公開資料）
    """
    results = []
    query = f"{keyword} {category}".strip()

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                "https://company.g0v.tw/api/company",
                params={"q": query, "limit": 20},
                headers={"Accept": "application/json", "User-Agent": "CVS-AI-Scout/1.0"},
            )
            if resp.status_code == 200:
                data = resp.json()
                companies = data if isinstance(data, list) else data.get("data", [])
                for c in companies[:15]:
                    name = c.get("name") or c.get("公司名稱", "")
                    if not name:
                        continue
                    results.append({
                        "name": name,
                        "uniform_no": c.get("id") or c.get("統一編號", ""),
                        "location": (c.get("address") or c.get("地址", ""))[:30],
                        "industry": (c.get("business_item") or c.get("所營事業", ""))[:80],
                        "representative": c.get("representative") or c.get("代表人", ""),
                        "source": "gov_db",
                    })
    except Exception:
        pass

    # fallback：Google Custom Search（需設定環境變數）
    if not results:
        google_key = os.getenv("GOOGLE_API_KEY")
        google_cse = os.getenv("GOOGLE_CSE_ID")
        if google_key and google_cse:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(
                        "https://www.googleapis.com/customsearch/v1",
                        params={
                            "key": google_key,
                            "cx": google_cse,
                            "q": f"台灣 {query} 食品廠商 超商合作 ISO認證",
                            "num": 10,
                            "lr": "lang_zh-TW",
                        }
                    )
                    if resp.status_code == 200:
                        for item in resp.json().get("items", []):
                            results.append({
                                "name": item.get("title", ""),
                                "location": "",
                                "industry": item.get("snippet", "")[:80],
                                "website": item.get("link", ""),
                                "source": "google",
                            })
            except Exception:
                pass

    return results


# ── Pydantic 模型 ─────────────────────────────────────────────────
class SearchRequest(BaseModel):
    keyword: str
    category: str = ""
    criteria: dict = {}

class EmailRequest(BaseModel):
    vendor: dict

class SendEmailRequest(BaseModel):
    to_email: str
    to_name: str
    email_body: str
    vendor_name: str = ""
    from_name: str = "CVS 採購部"


# ── 搜尋廠商 ─────────────────────────────────────────────────────
@router.post("/search")
async def search(req: SearchRequest):
    try:
        criteria_labels = {
            "iso":            "ISO / HACCP / SGS 等認證",
            "stable_supply":  "供貨穩定、備貨量充足",
            "cvs_exp":        "曾與超商/量販/連鎖通路合作",
            "payment_terms":  "可接受月結 60-90 天票期",
        }
        criteria_text = "、".join(
            criteria_labels[k] for k, v in req.criteria.items() if v and k in criteria_labels
        ) or "無特定限制"

        # 1️⃣ 先嘗試搜尋真實台灣公司資料
        real_companies = await search_tw_companies_gov(req.keyword, req.category)

        if real_companies:
            # 有真實資料 → Claude 從中分析、評分、補充細節
            companies_text = "\n".join([
                f"- {c['name']}｜地區：{c.get('location','不詳')}｜"
                f"行業：{c.get('industry','')[:50]}｜{c.get('website','')}"
                for c in real_companies[:12]
            ])
            prompt = f"""你是台灣 CVS 超商通路的資深廠商開發顧問，正在協助採購部門開發新廠商。

從台灣公開資料庫找到以下真實公司，請從中挑選最符合條件的廠商：
{companies_text}

篩選標準：
- 搜尋主題：{req.keyword}（類別：{req.category or '不限'}）
- 必要條件：{criteria_text}

請挑選最多 5 家，補充評估資訊，輸出合法 JSON（只輸出 JSON，不含說明）：
{{
  "results": [
    {{
      "name": "公司全名",
      "brand": "旗下品牌（不確定就同公司名）",
      "category": "商品類別",
      "location": "地區",
      "description": "為何適合 CVS 合作（20字內）",
      "highlights": ["符合 CVS 條件的優勢1", "優勢2", "優勢3"],
      "tags": ["ISO認證", "通路經驗"],
      "score": 82,
      "contact_hint": "建議聯絡方式（如：官網詢問表單、食品展攤位）",
      "data_source": "台灣公開資料庫"
    }}
  ]
}}"""
            model = MODEL_MAIN
        else:
            # 沒有真實資料 → Claude 以專業知識生成（標注為AI建議）
            prompt = f"""你是台灣 CVS 超商通路的資深廠商開發專家，擁有 15 年與統一超商、全家、萊爾富合作經驗。

開發需求：
- 搜尋關鍵字：{req.keyword}
- 商品類別：{req.category or "不限"}
- 硬性條件：{criteria_text}

請根據台灣真實食品產業現況，提供 5 家最適合的廠商建議。
（說明：因公開資料庫查無完整資料，以 AI 專業判斷補充）

輸出合法 JSON（只輸出 JSON）：
{{
  "results": [
    {{
      "name": "公司全名（含股份有限公司）",
      "brand": "旗下品牌名稱",
      "category": "商品類別",
      "location": "縣市",
      "description": "核心優勢一句話（20字內）",
      "highlights": ["具體優勢1", "優勢2", "優勢3"],
      "tags": ["認證標籤"],
      "score": 85,
      "contact_hint": "建議聯絡切入點",
      "data_source": "AI 專業建議"
    }}
  ]
}}"""
            model = MODEL_FAST

        msg = call_claude(get_client(), model, 2000, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if parsed and parsed.get("results"):
            parsed["real_data_count"] = len(real_companies)
            parsed["search_mode"] = "real_data" if real_companies else "ai_suggestion"
            return JSONResponse(parsed)
        return JSONResponse({"results": [], "error": "搜尋結果解析失敗，請重試"})

    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── 生成開發信草稿 ────────────────────────────────────────────────
@router.post("/generate_email")
async def generate_email(req: EmailRequest):
    try:
        v = req.vendor
        highlights = "、".join(v.get("highlights", [])) or v.get("description", "")

        prompt = f"""你是一位服務百大 CVS 超商 10 年的資深通路行銷經理，代表超商採購部門聯繫潛力廠商。

廠商資訊：
- 公司：{v.get("name")}（品牌：{v.get("brand", v.get("name"))}）
- 類別：{v.get("category")}
- 地點：{v.get("location")}
- 特色：{highlights}

請撰寫一封繁體中文商務合作邀請信（約 250 字），要求：
1. 語氣：誠懇、專業、不卑不亢，展現超商強大的通路優勢
2. 架構：開場說明我方通路規模 → 為何對貴司商品有興趣 → 合作框架簡介（鋪貨條件、帳期、品質要求）→ 邀約下一步
3. 具體帶入廠商特色，讓對方感受到我們做過功課
4. 結尾用「[您的姓名]」「[公司]」「[手機]」佔位

只輸出信件全文，從「您好」開始，不加說明文字。"""

        msg = call_claude(get_client(), MODEL_MAIN, 800, [{"role": "user", "content": prompt}])
        return JSONResponse({"email": msg.content[0].text.strip()})

    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── 真實發送 Email（Resend API）──────────────────────────────────
@router.post("/send_email")
async def send_email(req: SendEmailRequest):
    resend_key = os.getenv("RESEND_API_KEY")
    sender_email = os.getenv("RESEND_FROM_EMAIL", "")

    if not resend_key:
        return JSONResponse({
            "error": "no_resend_key",
            "message": "尚未設定 RESEND_API_KEY，請至 Railway 環境變數設定",
            "setup_url": "https://resend.com/signup",
        }, status_code=400)

    if not req.to_email or "@" not in req.to_email:
        return JSONResponse({"error": "請填寫正確的收件人 Email"}, status_code=400)

    subject = f"【超商通路合作邀請】誠邀 {req.to_name or req.vendor_name} 成為我們的合作夥伴"
    html_body = req.email_body.replace('\n', '<br>').replace('  ', '&nbsp;&nbsp;')

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"{req.from_name} <{sender_email or 'noreply@cvs-scout.com'}>",
                    "to": [req.to_email],
                    "subject": subject,
                    "text": req.email_body,
                    "html": f"<div style='font-family:sans-serif;line-height:1.8;'>{html_body}</div>",
                }
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                return JSONResponse({
                    "success": True,
                    "message": f"✅ 開發信已成功寄出至 {req.to_email}",
                    "email_id": data.get("id"),
                })
            else:
                err = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"message": resp.text}
                return JSONResponse({"error": f"寄送失敗：{err.get('message', resp.text)}"}, status_code=500)

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── 每日自動廠商推薦（當日快取，避免重複呼叫 AI）───────────────────
@router.get("/daily_vendors")
async def get_daily_vendors():
    """每日定時搜尋多個類別的廠商，回傳今日新推薦（當日結果快取，不重複呼叫 AI）"""
    today = time.strftime("%Y-%m-%d")

    # 命中快取 → 直接回傳
    if today in _daily_cache:
        return JSONResponse(_daily_cache[today])

    daily_categories = [
        ("健康飲品", "飲料"),
        ("即食輕食", "食品"),
        ("冷凍熟食", "冷凍食品"),
    ]
    all_results = []

    for keyword, category in daily_categories:
        try:
            companies = await search_tw_companies_gov(keyword, category)
            for c in companies[:4]:
                all_results.append({**c, "_search_keyword": keyword})
        except Exception:
            continue

    # 用 Claude 快速評分排序
    if all_results:
        companies_text = "\n".join([
            f"- {c['name']}（{c.get('location','')}）：{c.get('industry','')[:40]}"
            for c in all_results[:20]
        ])
        prompt = f"""以下是今日從台灣公開資料庫找到的公司，請挑出最適合 CVS 超商合作的 5 家並簡評：
{companies_text}

輸出 JSON：{{"daily_picks": [{{"name":"","reason":"20字內","score":80,"category":""}}]}}"""
        try:
            msg = call_claude(get_client(), MODEL_FAST, 600, [{"role": "user", "content": prompt}])
            parsed = safe_json(msg.content[0].text)
            picks = parsed.get("daily_picks", []) if parsed else []
        except Exception:
            picks = []
    else:
        picks = []

    result = {
        "date": today,
        "total_scanned": len(all_results),
        "daily_picks": picks,
        "raw_companies": all_results[:10],
    }
    # 存入快取（同時清除舊日期，避免記憶體累積）
    _daily_cache.clear()
    _daily_cache[today] = result
    return JSONResponse(result)


# ══════════════════════════════════════════════════════════════════
#  名片識別端點
#  POST /api/module3/scan_card
#  - card_image : 名片照片（JPG/PNG）
# ══════════════════════════════════════════════════════════════════
@router.post("/scan_card")
async def scan_business_card(request: Request):
    """用 Claude Vision 辨識名片，自動提取廠商資料"""
    form = await request.form()
    img_file = form.get("card_image")
    if not img_file:
        return JSONResponse({"error": "請上傳名片圖片"}, status_code=400)

    raw = await img_file.read()
    ext = (img_file.filename or "").split(".")[-1].lower()
    media_type = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png" if ext == "png" else "image/jpeg"
    b64 = base64.standard_b64encode(raw).decode()

    prompt = """請仔細辨識這張名片上的所有文字資訊，提取出以下欄位：

輸出格式（純 JSON，不要任何說明文字）：
{
  "name": "公司/廠商名稱",
  "brand": "品牌名稱（如與公司不同）",
  "contact_name": "聯絡人姓名",
  "title": "職稱",
  "email": "電子郵件",
  "phone": "電話（優先取手機號碼）",
  "line_id": "LINE ID（若有）",
  "website": "官網網址",
  "location": "地址中的縣市（如：台北市、台中市）",
  "category": "推測的廠商類別（食品工廠/貿易商/自有品牌 等）",
  "notes": "名片上其他值得記錄的資訊"
}

注意：
- 若名片是繁體中文，直接填入
- 若某欄位名片上沒有，填空字串 ""
- LINE ID 通常在名片上標示為「LINE:」或「LINE ID:」或有 LINE 圖示
- 電話若有多個，優先取手機（09 開頭）
- 地址只需要縣市部分"""

    try:
        client = get_client()
        msg = client.messages.create(
            model=MODEL_MAIN,
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                    {"type": "text", "text": prompt},
                ]
            }]
        )
        parsed = safe_json(msg.content[0].text)
        if not parsed:
            return JSONResponse({"error": "辨識失敗，請確認圖片清晰"}, status_code=500)
        return JSONResponse(parsed)

    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
