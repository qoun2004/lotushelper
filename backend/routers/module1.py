import os, io, base64, json, re, time
from fastapi import APIRouter, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
import pandas as pd
import anthropic

router = APIRouter()

MODEL = "claude-sonnet-4-5"   # Sonnet：容量大、速度快，適合分析任務

def get_client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def call_claude(client, model, max_tokens, messages, retries=3):
    """帶指數退避重試的 Claude 呼叫，自動處理 529 過載"""
    for attempt in range(retries):
        try:
            return client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=messages
            )
        except anthropic.APIStatusError as e:
            if e.status_code == 529 and attempt < retries - 1:
                wait = 2 ** attempt * 3   # 3s → 6s → 12s
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("Claude API 多次重試後仍失敗")


def safe_parse_json(raw: str) -> dict:
    """嘗試多種方式解析 AI 回傳的 JSON"""
    # 方法1：直接找最外層 {}
    try:
        start = raw.find('{')
        end = raw.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception:
        pass

    # 方法2：用 regex 找 JSON block
    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass

    # 方法3：AI 沒回 JSON，直接當純文字
    return {"report_text": raw, "summary": [], "insights": ""}



def excel_to_text(file_bytes: bytes, filename: str, label: str = "") -> str:
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
        df = df.dropna(how='all').dropna(axis=1, how='all')
        tag = f"【{label}】" if label else ""
        summary = f"檔案{tag}：{filename}\n欄位：{', '.join(df.columns.astype(str))}\n筆數：{len(df)}\n\n"
        summary += "前20筆資料：\n"
        summary += df.head(20).to_string(index=False)
        num_cols = df.select_dtypes(include='number').columns
        if len(num_cols) > 0:
            summary += "\n\n數值欄位統計：\n"
            summary += df[num_cols].describe().to_string()
        return summary
    except Exception as e:
        return f"無法讀取 Excel（{label or filename}）：{e}"


@router.post("/analyze")
async def analyze(request: Request):
    try:
        form = await request.form()
        mode = form.get("mode", "excel")

        template_id = form.get("template_id", "custom")
        template_prompt = form.get("template_prompt", "").strip()

        if mode == "excel":
            file_count = int(form.get("file_count", 1))
            data_sections = []

            for i in range(file_count):
                f = form.get(f"file_{i}")
                label = form.get(f"label_{i}", f"資料{i+1}")
                if f:
                    file_bytes = await f.read()
                    data_sections.append(excel_to_text(file_bytes, f.filename, label))

            if not data_sections:
                return JSONResponse({"error": "沒有收到檔案"}, status_code=400)

            data_block = "\n\n" + ("="*40+"\n").join(data_sections)

            # 使用模板 prompt 或預設指令
            if template_prompt:
                analysis_instruction = template_prompt
            elif len(data_sections) >= 3:
                analysis_instruction = f"請對比這 {len(data_sections)} 份不同年度的數據，進行三年縱向趨勢分析，找出連續成長/持續衰退/今年突破的品項，生成含三年脈絡對比的深度報告。"
            elif len(data_sections) >= 2:
                analysis_instruction = f"請對比這 {len(data_sections)} 份不同時期的數據，分析成長/衰退趨勢，找出表現最好/最差的品項，生成含跨期對比的報告。"
            else:
                analysis_instruction = "請分析這份數據，生成報告草稿。"

            # 從個人知識庫取得語氣參考（若有）
            knowledge_block = ""
            try:
                from routers.knowledge import _knowledge_store
                if _knowledge_store:
                    top_docs = _knowledge_store[:2]   # 取最新2份
                    refs = "\n\n".join(
                        f"【參考文件：{d['title']}】\n{d['content'][:1000]}"
                        for d in top_docs
                    )
                    knowledge_block = f"\n\n【個人知識庫參考（請學習以下文件的語氣、格式和用語習慣）】\n{refs}"
            except Exception:
                pass

            prompt = f"""你是一位資深的台灣百大CVS（超商）通路行銷分析師，擅長解讀銷售數據並提出具體策略。{knowledge_block}

以下是行銷經理上傳的銷售數據：
{data_block}

分析指令：
{analysis_instruction}

請輸出嚴格符合以下格式的 JSON（繁體中文），每個欄位都要填寫，不可省略：
{{
  "overview": {{
    "period": "分析期間（如：114年 vs 113年）",
    "total_growth": "整體業績變化（如：+12.5% / -8%）",
    "trend": "up 或 down 或 neutral",
    "one_line": "一句話總結（如：整體業績優於去年，市佔持續成長）"
  }},
  "kpis": [
    {{"label": "KPI名稱", "value": "數值", "change": "vs前期變化", "trend": "up/down/neutral"}},
    {{"label": "KPI名稱", "value": "數值", "change": "vs前期變化", "trend": "up/down/neutral"}},
    {{"label": "KPI名稱", "value": "數值", "change": "vs前期變化", "trend": "up/down/neutral"}},
    {{"label": "KPI名稱", "value": "數值", "change": "vs前期變化", "trend": "up/down/neutral"}}
  ],
  "top_growth": [
    {{"name": "品項/廠商名稱", "growth": "+XX%", "note": "原因說明"}},
    {{"name": "品項/廠商名稱", "growth": "+XX%", "note": "原因說明"}},
    {{"name": "品項/廠商名稱", "growth": "+XX%", "note": "原因說明"}}
  ],
  "top_decline": [
    {{"name": "品項/廠商名稱", "decline": "-XX%", "note": "原因說明"}},
    {{"name": "品項/廠商名稱", "decline": "-XX%", "note": "原因說明"}},
    {{"name": "品項/廠商名稱", "decline": "-XX%", "note": "原因說明"}}
  ],
  "decline_reasons": "衰退原因深度分析（3-5點，包含外部環境、競品、定價、品項力等角度）",
  "market_trends": "市場趨勢分析（消費者行為、競品動態、通路整體大盤表現，以及我方相對表現）",
  "strategy": "今年度策略規劃建議（具體可執行的3-5個策略方向）",
  "action_items": [
    "立即行動項目1（本週/本月內執行）",
    "立即行動項目2",
    "中期計畫項目1（1-3個月）",
    "中期計畫項目2"
  ],
  "chart_data": {{
    "bar": {{
      "labels": ["品項1", "品項2", "品項3", "品項4", "品項5"],
      "current": [100, 85, 70, 60, 50],
      "previous": [80, 90, 65, 70, 45]
    }}
  }},
  "report_text": "完整週報/月報全文（條列式，含現況摘要、成長亮點、衰退分析、市場洞察、策略建議，適合直接呈報主管）"
}}"""

            msg = call_claude(get_client(), MODEL, 4000,
                              [{"role": "user", "content": prompt}])
            raw = msg.content[0].text
            return JSONResponse(safe_parse_json(raw))

        elif mode == "screenshot":
            image_content = []
            i = 0
            while True:
                s = form.get(f"screenshot_{i}")
                if s is None:
                    break
                img_bytes = await s.read()
                if img_bytes:
                    mt = s.content_type or "image/png"
                    b64 = base64.standard_b64encode(img_bytes).decode()
                    image_content.append({
                        "type": "image",
                        "source": {"type": "base64", "media_type": mt, "data": b64}
                    })
                i += 1

            if not image_content:
                return JSONResponse({"error": "沒有收到截圖"}, status_code=400)

            image_content.append({
                "type": "text",
                "text": f"""你是一位資深的台灣百大CVS通路行銷分析師。

以上是行銷經理從公司內部系統截下的銷售數據截圖（共{len(image_content)}張）。

請從截圖中讀取所有數字、品項、月份，{"並對比不同截圖的數據變化，" if len(image_content) > 1 else ""}生成週報草稿。

輸出JSON（繁體中文）：
{{
  "summary": [{{"label": "指標", "value": "數值", "trend": "up/down/neutral"}}, ...],
  "report_text": "週報全文...",
  "insights": "AI洞察..."
}}"""
            })

            msg = call_claude(get_client(), MODEL, 2500,
                              [{"role": "user", "content": image_content}])
            raw = msg.content[0].text
            return JSONResponse(safe_parse_json(raw))

        return JSONResponse({"error": "未知模式"}, status_code=400)

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
