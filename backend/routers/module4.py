import os, json, re, time
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

# ── Request Models ───────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    product: str
    platforms: dict = {}
    tone: str = "親切自然"

class ScriptRequest(BaseModel):
    product: str
    copy_text: str
    style: str = ""
    platform: str = ""

class DissectRequest(BaseModel):
    viral_text: str   # 爆紅貼文內容
    product: str      # 用戶的商品

class TrendRequest(BaseModel):
    trend: str        # 熱門話題 / 流行梗
    product: str
    platforms: dict = {}
    tone: str = "親切自然"

class FormatRequest(BaseModel):
    format_key: str   # 格式 key
    format_label: str # 格式顯示名稱
    product: str
    platforms: dict = {}

class ReadUrlRequest(BaseModel):
    url: str

# ── 工具函式 ─────────────────────────────────────────────────────────
def platforms_desc(platforms: dict) -> str:
    platform_map = {
        "threads": "Threads 脆（短文、口語、可加投票）",
        "dcard":   "Dcard 媽媽板（長文敘事、情感共鳴）",
        "ig":      "Instagram（視覺感強、短句、大量 emoji）",
        "line":    "LINE 群組（簡短直接、方便轉傳）",
    }
    active = [k for k, v in platforms.items() if v]
    return "\n".join(f"- {platform_map[p]}" for p in active if p in platform_map) or "- 社群媒體（通用格式）"

# ── 端點一：今日熱門話題 ──────────────────────────────────────────────
@router.get("/trends")
async def get_trends():
    try:
        prompt = """生成 10 個當前台灣 25-45 歲職場媽媽在 Threads/Dcard 熱門討論的話題標籤。
輸出合法 JSON：{"topics": [{"keyword": "標籤名稱", "heat": "🔥或🔥🔥或🔥🔥🔥"}]}"""
        msg = call_claude(get_client(), MODEL_FAST, 400, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        return JSONResponse(parsed or {"topics": []})
    except Exception as e:
        return JSONResponse({"topics": [], "error": str(e)})

# ── 端點二：自由生成（5 組爆款文案）───────────────────────────────────
@router.post("/generate")
async def generate(req: GenerateRequest):
    try:
        prompt = f"""你是台灣頂尖的社群行銷文案專家，專攻 25-45 歲職場媽媽族群，曾操盤多個破萬分享的爆文。

商品：{req.product}
目標平台：
{platforms_desc(req.platforms)}
文案語氣：{req.tone}

核心策略：零業配感、真實生活感、觸發情感共鳴、自然帶出商品、引流購買

請生成 5 組完全不同風格的爆款文案：
- 風格一：崩潰媽媽逆轉記（描述日常崩潰場景，自然帶出商品解決）
- 風格二：閨蜜私訊推薦（像在私訊好友，真實推薦口吻）
- 風格三：意外發現驚喜（像剛發現寶藏的驚喜語氣）
- 風格四：孩子視角（以孩子的話或互動為開頭）
- 風格五：職場媽媽省時術（強調省時、高效、聰明媽媽的認同感）

每組文案都要：自然提及商品名、無明顯業配感、有情感鉤子、附上適合的 hashtag

輸出嚴格合法 JSON（不含其他文字）：
{{
  "copies": [
    {{
      "style": "風格名稱",
      "platform": "建議平台",
      "text": "文案全文（含換行）",
      "tags": "#hashtag1 #hashtag2 #hashtag3",
      "tip": "這篇文案的核心技巧（一句話）"
    }}
  ]
}}"""

        msg = call_claude(get_client(), MODEL_MAIN, 2500, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if parsed and parsed.get("copies"):
            return JSONResponse(parsed)
        return JSONResponse({"copies": [], "error": "文案生成失敗，請重試"})
    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# ── 端點三：短影音腳本 ────────────────────────────────────────────────
@router.post("/script")
async def generate_script(req: ScriptRequest):
    """根據文案生成 15 秒短影音拍攝腳本（Reels / TikTok / 限時動態）"""
    try:
        prompt = f"""你是台灣頂尖的短影音導演，專門替職場媽媽品牌操刀 Reels / TikTok 爆款。

商品：{req.product}
文案風格：{req.style or "一般"}
原始文案：
{req.copy_text[:300]}

請為這篇文案設計一個 15 秒短影音拍攝腳本，重點：
- 開頭 3 秒必須有強力「勾子」讓人不划走
- 畫面要簡單、手機可自拍完成（不需專業設備）
- 台詞自然、像真實媽媽在說話
- 結尾有明確行動指令（如：連結在限動、留言+1 私傳你）

輸出合法 JSON（只輸出 JSON）：
{{
  "duration": "15秒",
  "hook": "前3秒勾子：說明吸引人停下來的畫面或開場白",
  "scenes": [
    {{"time": "0-3秒", "visual": "畫面描述", "caption": "字幕/旁白文字", "action": "拍攝動作提示"}},
    {{"time": "3-8秒", "visual": "畫面描述", "caption": "字幕/旁白文字", "action": "拍攝動作提示"}},
    {{"time": "8-13秒", "visual": "畫面描述", "caption": "字幕/旁白文字", "action": "拍攝動作提示"}},
    {{"time": "13-15秒", "visual": "畫面描述", "caption": "CTA 字幕", "action": "收尾動作"}}
  ],
  "bgm": "建議背景音樂風格（如：輕鬆爵士、療癒鋼琴、流行節奏）",
  "props": ["需要準備的道具1", "道具2"],
  "tip": "這支影片成功的關鍵技巧（一句話）"
}}"""

        msg = call_claude(get_client(), MODEL_FAST, 1200, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if parsed and parsed.get("scenes"):
            return JSONResponse(parsed)
        return JSONResponse({"error": "腳本生成失敗，請重試"})
    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# ── 端點四：爆文解剖 ─────────────────────────────────────────────────
@router.post("/dissect")
async def dissect(req: DissectRequest):
    """分析爆紅貼文的成功公式，再套到用戶商品改寫 3 組版本"""
    try:
        prompt = f"""你是台灣頂尖社群行銷文案解剖師，專門拆解爆紅貼文的成功密碼。

以下是一篇爆紅貼文：
---
{req.viral_text[:1200]}
---

用戶的商品：{req.product}

請完成兩件事：

【第一步】解剖這篇爆文「為什麼爆」，從四個維度分析：
1. 開場公式：開頭幾個字用了什麼方式抓住眼球？
2. 情緒觸發：觸發了讀者哪種情緒（共鳴/好奇/恐懼/驚喜/憤慨）？具體說明
3. 敘事結構：整篇的節奏和架構（如：問題→衝突→解決）
4. 關鍵句型：最有力的句子或詞彙模式是什麼？

【第二步】用完全相同的爆文公式，為「{req.product}」改寫 3 組文案。
- 每組都要保留原貼文讓人爆紅的核心元素
- 自然帶入商品，無業配感
- 每組切入角度不同

輸出嚴格合法 JSON（不含其他文字）：
{{
  "analysis": {{
    "hook_formula": "開場公式說明（2-3句，具體說明手法）",
    "emotion_trigger": "主要情緒觸發點（1句，說明觸發了什麼情緒、為什麼）",
    "structure": "敘事結構描述（1句，說明整篇架構）",
    "key_phrase": "關鍵句型或詞彙模式（1-2句，說明為什麼有效）"
  }},
  "copies": [
    {{
      "style": "改寫版本名稱（根據爆文公式命名）",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2 #hashtag3",
      "tip": "這組文案如何套用爆文公式的關鍵"
    }},
    {{
      "style": "改寫版本二",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2 #hashtag3",
      "tip": "關鍵技巧"
    }},
    {{
      "style": "改寫版本三",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2",
      "tip": "關鍵技巧"
    }}
  ]
}}"""

        msg = call_claude(get_client(), MODEL_MAIN, 3000, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if parsed and parsed.get("copies"):
            return JSONResponse(parsed)
        return JSONResponse({"copies": [], "error": "解剖失敗，請確認貼文內容並重試"})
    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# ── 端點五：趨勢跟風文案 ─────────────────────────────────────────────
@router.post("/trend_copy")
async def trend_copy(req: TrendRequest):
    """用熱門話題自然嫁接到商品，生成 5 組借勢文案"""
    try:
        prompt = f"""你是台灣頂尖的社群借勢行銷高手，最擅長把熱門話題自然地嫁接到品牌商品上。

當前熱門話題：【{req.trend}】
目標商品：{req.product}
目標平台：
{platforms_desc(req.platforms)}
文案語氣：{req.tone}

任務：生成 5 組「借勢跟風」文案，讓讀者感覺「正好在討論這個話題，順便想到這個商品」。

核心原則：
- 話題嫁接要自然流暢，不能硬塞廣告
- 每組用不同的切入角度（親身經歷/神轉折/共鳴呼應/幽默梗/情境代入）
- 保持真實感，像真實用戶在分享而非官方文案
- 話題要「借力使力」，讓商品成為話題的延伸或解答

輸出嚴格合法 JSON（不含其他文字）：
{{
  "copies": [
    {{
      "style": "切入角度名稱（如：親身經歷型、神轉折型）",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#話題標籤 #hashtag2 #hashtag3",
      "tip": "這組如何自然嫁接話題的技巧"
    }},
    {{
      "style": "切入角度二",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2",
      "tip": "技巧說明"
    }},
    {{
      "style": "切入角度三",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2",
      "tip": "技巧說明"
    }},
    {{
      "style": "切入角度四",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2",
      "tip": "技巧說明"
    }},
    {{
      "style": "切入角度五",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2",
      "tip": "技巧說明"
    }}
  ]
}}"""

        msg = call_claude(get_client(), MODEL_MAIN, 2800, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if parsed and parsed.get("copies"):
            return JSONResponse(parsed)
        return JSONResponse({"copies": [], "error": "跟風文案生成失敗，請重試"})
    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# ── 端點五ｂ：讀取商品網址 ───────────────────────────────────────────
@router.post("/read_url")
async def read_url(req: ReadUrlRequest):
    """fetch 商品頁面 → AI 萃取商品名稱、價格、截止日、特色等結構化資訊"""
    try:
        async with httpx.AsyncClient(
            timeout=15, follow_redirects=True,
            headers={'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'}
        ) as client:
            res = await client.get(req.url)
            html = res.text

        # 去除 script/style/HTML tags，取純文字
        html = re.sub(r'<(script|style)[^>]*>[\s\S]*?</\1>', '', html, flags=re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', html)
        text = re.sub(r'\s+', ' ', text).strip()[:3000]

        prompt = f"""以下是商品頁面的文字內容（來源：{req.url}）：

---
{text}
---

請萃取這個商品的關鍵資訊。輸出合法 JSON（不加其他文字）：
{{
  "name": "商品名稱（如找不到填空）",
  "price": "價格（如：NT$299；找不到填空）",
  "description": "商品簡短描述（2-3句核心賣點）",
  "deadline": "截止日期或上市日期（如：2025/06/30；找不到填空）",
  "highlights": ["特色一", "特色二", "特色三"],
  "cta": "建議在社群文案中使用的行動呼籲（如：點連結預購、限量搶購中）"
}}"""

        msg = call_claude(get_client(), MODEL_FAST, 600, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if parsed:
            parsed["url"] = req.url
            return JSONResponse(parsed)
        return JSONResponse({"error": "無法解析商品資訊，請確認網址正確", "url": req.url})

    except httpx.TimeoutException:
        return JSONResponse({"error": "網頁讀取逾時，請確認網址是否可以正常開啟"}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": f"讀取失敗：{str(e)}"}, status_code=500)


# ── 端點六：格式套用 ─────────────────────────────────────────────────
@router.post("/format_copy")
async def format_copy(req: FormatRequest):
    """用指定的爆款格式生成 3 組文案"""
    try:
        active = [k for k, v in req.platforms.items() if v]
        platform_map = {"threads": "Threads", "dcard": "Dcard", "ig": "IG", "line": "LINE"}
        plat_desc = "、".join(platform_map.get(p, p) for p in active) or "社群媒體"

        format_instructions = {
            'contrast':     (
                '「你以為 vs 真相」對比格式',
                '開頭用「你以為...」描述讀者的錯誤認知或期望（要讓讀者點頭認同），'
                '中間製造明顯落差，結尾揭露「真相」——商品自然出現在真相那一端，'
                '讓商品成為「解答」而非「廣告」'
            ),
            'identity':     (
                '「身為 XXX 我只用/選這個」身份認同格式',
                '開頭用一個具體的身份標籤（如：三寶媽、職場煮婦、早起媽媽）作為開頭，'
                '透過強調這個身份的日常需求和挑戰，自然帶出商品是這個身份「唯一的選擇」，'
                '讓有相同身份的讀者立刻產生認同感'
            ),
            'correction':   (
                '「這樣用才對！」糾錯格式',
                '先點出大多數人的常見錯誤做法（要讓讀者有點心虛）——用「你是不是也這樣...」開頭，'
                '製造輕微的「被說中了」感，再揭示正確做法，商品是正確做法的核心'
            ),
            'before_after': (
                '「試用 X 天後...」時間軸對比格式',
                '用時間軸敘事：先描述使用前的真實痛點或疑慮（要有細節，越具體越有說服力），'
                '然後寫出使用後的真實改變，要有情感溫度，不只是功能改變，而是生活改變'
            ),
            'list':         (
                '「X 個理由我不後悔」條列格式',
                '列出 3 個選擇這個商品的理由（用數字開頭增加可讀性），'
                '每個理由都要有情感共鳴，不只是功能描述，要讓讀者感覺「這就是我的需求！」'
            ),
            'emotion':      (
                '「昨天崩潰今天治癒」情緒轉折格式',
                '開頭描述一個職場媽媽真實的崩潰或疲憊瞬間（要非常具體，讓人感同身受），'
                '商品作為轉折點出現，結尾要有情緒上的解脫感、溫暖感或被治癒的感覺'
            ),
            'authentic':    (
                '「不是業配但真的愛」反業配格式',
                '開頭強調自己是真實消費者（「真的不是業配！但是...」），'
                '用誇張的「免責聲明」建立信任感，接著用真實消費者的口吻分享使用心得，'
                '越像普通人在說話越好'
            ),
            'child':        (
                '「孩子說了一句話...」孩子視角格式',
                '用孩子說的一句話或孩子的反應作為開頭（要有童言童語的感覺），'
                '帶出這句話的背景情境，自然引出商品，結尾要有親子溫馨的情緒'
            ),
            # ── 台灣特有格式 ────────────────────────────────────────
            'review':       (
                '「蝦皮 5 星好評」消費者留評格式',
                '完全模仿台灣電商平台（蝦皮/momo）真實買家留言的口吻和格式：'
                '開頭寫商品優點（自然口語），中間描述實際使用感受（含具體細節如包裝/速度/口感），'
                '結尾自然給予推薦。語氣要像真實消費者而非廣告，可以帶一點小缺點再用優點覆蓋，'
                '更顯真實。可以加「已回購 N 次」「買給媽媽/朋友也很喜歡」等細節。'
            ),
            'ptt':          (
                '「PTT / Dcard 開箱文」鄉民風格格式',
                '模仿台灣 PTT 或 Dcard 開箱文的口吻和格式：'
                '開頭用「先說結論」或「廢話不多說」等典型開場，'
                '語氣接地氣、偶爾夾雜台式口語（傑克這真的太XXX了、超猛、真香），'
                '結構清楚（前言→開箱→優缺點→推薦指數），結尾可以附上「有問題歡迎推文」類型的互動語。'
                '要有鄉民/板友的親切感，不像廣告。'
            ),
            'mom_tip':      (
                '「媽媽私藏秘訣」生活智慧分享格式',
                '以一個有生活閱歷的媽媽口吻，分享一個「多年來的秘訣」或「最近才發現的好東西」：'
                '開頭帶出一個日常情境或家事挑戰（要讓媽媽族群點頭），'
                '接著以「後來我發現...」或「朋友介紹我試試...」自然帶入商品，'
                '用具體的生活應用方式說明效果，語氣溫暖、像媽媽在跟你說悄悄話，'
                '結尾可以鼓勵讀者也來試試，有傳授的感覺。'
            ),
        }

        fmt_name, fmt_desc = format_instructions.get(
            req.format_key,
            (req.format_label, f'嚴格按照「{req.format_label}」的格式和語氣寫作')
        )

        prompt = f"""你是台灣頂尖社群文案師，專門用爆款格式創作高轉發貼文。

目標商品：{req.product}
目標平台：{plat_desc}

格式要求：{fmt_name}
格式說明：{fmt_desc}

請嚴格按照上述格式結構，生成 3 組文案：
- 每組都要完整遵循格式的邏輯和情緒節奏
- 每組的情境、角度、細節要不同
- 文案要有真實生活感，不能像廣告文案
- 附上適合的 hashtag

輸出嚴格合法 JSON（不含其他文字）：
{{
  "copies": [
    {{
      "style": "{req.format_label} · 版本一（用情境命名）",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2 #hashtag3",
      "tip": "這組文案套用格式的關鍵技巧"
    }},
    {{
      "style": "{req.format_label} · 版本二（用情境命名）",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2",
      "tip": "關鍵技巧"
    }},
    {{
      "style": "{req.format_label} · 版本三（用情境命名）",
      "platform": "建議平台",
      "text": "完整文案（含換行）",
      "tags": "#hashtag1 #hashtag2",
      "tip": "關鍵技巧"
    }}
  ]
}}"""

        msg = call_claude(get_client(), MODEL_MAIN, 2500, [{"role": "user", "content": prompt}])
        parsed = safe_json(msg.content[0].text)
        if parsed and parsed.get("copies"):
            return JSONResponse(parsed)
        return JSONResponse({"copies": [], "error": "格式文案生成失敗，請重試"})
    except anthropic.APIStatusError as e:
        if e.status_code == 529:
            return JSONResponse({"error": "529_overloaded"}, status_code=529)
        return JSONResponse({"error": f"API 錯誤 {e.status_code}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
