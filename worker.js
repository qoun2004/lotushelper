// 寵妻神器 · Cloudflare Worker
// 環境變數：ANTHROPIC_API_KEY、GEMINI_API_KEY、TMDB_API_KEY
//
// ══ AI 路由策略 ══════════════════════════════════════
// 🟣 Claude Sonnet  → 複雜文件生成、OCR辨識、高品質行銷內容
// 🔵 Claude Haiku   → 快速解析、分類、數據提取（便宜20倍）
// 🟢 Gemini Flash   → 對話回覆、照片描述、語音摘要（免費額度大）
// 🔴 無AI           → TMDB、Sheets、LINE（直接呼叫外部API）
// ══════════════════════════════════════════════════

export default {
  async fetch(request, env) {

    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type' }});
    }
    if (request.method !== 'POST') {
      return new Response('只接受 POST 請求', { status: 405 });
    }

    const body = await request.json();
    const type = body.type;

    // ══ AI 輔助函式 ════════════════════════════════

    // 🟣 Claude Sonnet：複雜文件、行銷內容、OCR
    const callSonnet = async (prompt, system = '', maxTokens = 2000) => {
      const payload = { model:'claude-sonnet-4-6', max_tokens: maxTokens, messages:[{ role:'user', content: prompt }] };
      if (system) payload.system = system;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{ 'x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json' },
        body: JSON.stringify(payload),
      });
      return (await res.json()).content?.[0]?.text || '';
    };

    // 🔵 Claude Haiku：快速解析、分類、短文生成
    const callHaiku = async (prompt, maxTokens = 300) => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{ 'x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json' },
        body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages:[{ role:'user', content: prompt }] }),
      });
      return (await res.json()).content?.[0]?.text || '';
    };

    // 🟢 Gemini Flash：對話、摘要、照片描述（免費）
    const callGemini = async (prompt, maxTokens = 500) => {
      if (!env.GEMINI_API_KEY) return callHaiku(prompt, maxTokens); // fallback
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }], generationConfig:{ maxOutputTokens: maxTokens, temperature: 0.8 } }),
      });
      const d = await res.json();
      return d.candidates?.[0]?.content?.parts?.[0]?.text || await callHaiku(prompt, maxTokens);
    };

    // Gemini Vision（照片描述）
    const callGeminiVision = async (base64, mimeType, prompt) => {
      if (!env.GEMINI_API_KEY) return callSonnetVision(base64, mimeType, prompt);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ contents:[{ parts:[{ inline_data:{ mime_type: mimeType, data: base64 } },{ text: prompt }] }], generationConfig:{ maxOutputTokens: 200 } }),
      });
      const d = await res.json();
      return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    };

    // Claude Sonnet Vision（OCR 需要高精度）
    const callSonnetVision = async (base64, mimeType, prompt) => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{ 'x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json' },
        body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:800, messages:[{ role:'user', content:[
          { type:'image', source:{ type:'base64', media_type: mimeType, data: base64 } },
          { type:'text', text: prompt }
        ]}]}),
      });
      return (await res.json()).content?.[0]?.text || '';
    };

    // ════════════════════════════════════════════════

    // 🔴 熱門劇清單（TMDB，無AI）
    if (type === 'drama_list') {
      const tmdbKey = env.TMDB_API_KEY || '';
      const providerMap = { netflix:8, disney:337, prime:119, apple:350, popular:null };
      const providerId = providerMap[body.category];
      const fromYear = new Date().getFullYear() - 1;
      const url = providerId
        ? `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbKey}&watch_region=TW&with_watch_providers=${providerId}&sort_by=popularity.desc&first_air_date.gte=${fromYear}-01-01&page=1&language=zh-TW`
        : `https://api.themoviedb.org/3/tv/popular?api_key=${tmdbKey}&language=zh-TW&page=1`;
      try {
        const r = await fetch(url);
        const d = r.ok ? await r.json() : { results:[] };
        const dramas = (d.results||[]).slice(0,20).map(r=>({ name:r.name||r.original_name||'', poster:r.poster_path?`https://image.tmdb.org/t/p/w185${r.poster_path}`:'', rating:r.vote_average?Math.round(r.vote_average*10)/10:0, year:(r.first_air_date||'').slice(0,4) }));
        return new Response(JSON.stringify({ dramas }), { headers: corsHeaders });
      } catch(e) { return new Response(JSON.stringify({ dramas:[] }), { headers: corsHeaders }); }
    }

    // 🔵 劇集搜尋（Haiku翻譯 + TVmaze）
    if (type === 'tmdb_search') {
      const q = body.query || '';
      try {
        const engQuery = await callHaiku(`把這個劇名翻譯成英文，只回傳英文名稱：${q}`, 50);
        const [r1, r2] = await Promise.all([
          fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(engQuery.trim())}`),
          fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`),
        ]);
        const [d1, d2] = await Promise.all([ r1.ok?r1.json():[], r2.ok?r2.json():[] ]);
        const seen = new Set();
        const results = [...(d1||[]),...(d2||[])].filter(item=>{ const id=item.show?.id; if(seen.has(id))return false; seen.add(id); return true; }).slice(0,8).map(item=>({ name:item.show.name||'', poster:item.show.image?.medium||'', rating:item.show.rating?.average||0, year:(item.show.premiered||'').slice(0,4), status:item.show.status||'' }));
        return new Response(JSON.stringify({ results, engQuery }), { headers: corsHeaders });
      } catch(e) { return new Response(JSON.stringify({ results:[] }), { headers: corsHeaders }); }
    }

    // 🟣 OCR 圖片辨識（Sonnet 高精度 / Gemini 照片描述）
    if (type === 'ocr') {
      const { imageBase64, mimeType='image/jpeg', mode='general' } = body;
      if (!imageBase64) return new Response(JSON.stringify({ error:'缺少圖片' }), { status:400, headers:corsHeaders });

      // 🟢 照片描述用 Gemini（免費）
      if (mode === 'photo_desc') {
        const text = await callGeminiVision(imageBase64, mimeType, '請用一句溫暖有情感的繁體中文描述這張照片（20字以內），讓人看了心情變好。只回傳這一句話。');
        return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
      }

      // 🟣 發票/名片/文件 OCR 用 Sonnet（精度要求高）
      const prompts = {
        receipt: `辨識發票或收據，回傳JSON：{"date":"YYYY-MM-DD","amount":"數字","vendor":"商家","items":"品項","invoiceNo":"發票號","category":"餐費/交通/住宿/娛樂/其他","note":""}，只回傳JSON。`,
        hsr: `辨識高鐵或火車票，回傳JSON：{"date":"YYYY-MM-DD","amount":"數字","from":"出發站","to":"到達站","trainNo":"車次","seat":"座位","time":"HH:MM","ticketNo":""}，只回傳JSON。`,
        card: `辨識名片，回傳JSON：{"name":"姓名","company":"公司","title":"職稱","email":"","phone":"","address":"","website":"","note":""}，只回傳JSON。`,
        general: `辨識圖片中的文字和重要資訊，用繁體中文條列整理。`,
      };
      const text = await callSonnetVision(imageBase64, mimeType, prompts[mode]||prompts.general);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🔵 語音記帳解析（Haiku 夠用）
    if (type === 'parse_expense') {
      const today = new Date().toISOString().slice(0,10);
      const text = await callHaiku(`台灣記帳助手，解析以下語音，回傳JSON：{"date":"YYYY-MM-DD（今天${today}）","amount":"數字","category":"餐費/交通/住宿/娛樂/其他","desc":"10字說明","type":"expense或income"}。輸入：${body.text}。只回傳JSON。`, 200);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🔵 語音訓練解析（Haiku）
    if (type === 'parse_workout') {
      const today = new Date().toISOString().slice(0,10);
      const text = await callHaiku(`健身記錄助手，解析語音，回傳JSON：{"date":"YYYY-MM-DD（今天${today}）","type":"跑步/重訓/瑜珈/騎車/游泳/健走/其他","duration":"分鐘數","metric":"距離或重量","note":"說明","weight":"體重kg（若有）"}。輸入：${body.text}。只回傳JSON。`, 200);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🟢 日記 AI 回覆（Gemini 對話感強）
    if (type === 'diary_reply') {
      const { content, mood } = body;
      const prompt = `你是溫柔的好朋友，剛讀完這篇睡前日記。用繁體中文給一段真誠溫暖的回覆（100-150字），像閨蜜說話，不要制式。心情：${mood||'普通'}。日記：${content}。先呼應具體內容，給予肯定，結尾送晚安祝福。`;
      const text = await callGemini(prompt, 400);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🔵 日記語錄生成（Haiku）
    if (type === 'diary_quote') {
      const text = await callHaiku(`從日記提煉一句有力量的語錄金句（15-30字繁體中文），直接輸出句子。日記：${body.content}`, 80);
      return new Response(JSON.stringify({ result: text.trim() }), { headers: corsHeaders });
    }

    // 🟢 Google Sheets 摘要（Gemini）
    if (type === 'fetch_sheets_csv') {
      const { sheetId, token } = body;
      try {
        let csvText;
        if (token) {
          const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z100`, { headers:{ Authorization:`Bearer ${token}` }});
          if (r.ok) { const d = await r.json(); csvText = (d.values||[]).map(row=>row.join('\t')).join('\n'); }
        }
        if (!csvText) {
          const r = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`);
          if (r.ok) csvText = await r.text();
        }
        return new Response(JSON.stringify({ content: csvText||null }), { headers: corsHeaders });
      } catch(e) { return new Response(JSON.stringify({ content:null, error:e.message }), { headers:corsHeaders }); }
    }

    // 🔵 數據檔案解析（Haiku 提取指標，Sonnet 若需深度分析）
    if (type === 'parse_data_file') {
      const { content, filename } = body;
      const prompt = `台灣行銷數據分析師。分析 ${filename||'數據'} 的內容，提取關鍵行銷指標，回傳JSON：{"summary":"一句話摘要","metrics":[{"name":"指標","value":"數值","unit":"單位","note":"說明"}],"report_materials":"可直接貼入報告的條列文字","key_insights":["洞察1","洞察2","洞察3"]}。數據：${(content||'').slice(0,3000)}。只回傳JSON。`;
      // 用 Sonnet 處理數據分析（需要理解上下文）
      const text = await callSonnet(prompt, '', 1500);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🟣 健身課程規劃（Sonnet）
    if (type === 'fitness_plan') {
      const { goal, days, duration, equipment, height, weight, age } = body;
      const prompt = `你是台灣專業健身教練。根據條件生成一週訓練計畫。身高${height||'未知'}cm、體重${weight||'未知'}kg、年齡${age||'未知'}歲。目標：${goal}。每週：${days}。每次：${duration}。設備：${equipment}。用繁體中文，包含每天訓練內容、休息日、飲食建議、注意事項，用emoji讓內容活潑。`;
      const text = await callSonnet(prompt, '', 1500);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🟣 日記→語音（Sonnet 分析深度）
    if (type === 'diary_reply_deep') {
      const text = await callSonnet(body.prompt || '', '', 600);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🔴 LINE Notify（無AI）
    if (type === 'line') {
      const r = await fetch('https://notify-api.line.me/api/notify', {
        method:'POST', headers:{ Authorization:`Bearer ${body.token}`,'Content-Type':'application/x-www-form-urlencoded' },
        body:`message=${encodeURIComponent(body.message)}`,
      });
      return new Response(JSON.stringify(await r.json()), { headers: corsHeaders });
    }

    // 🟣 行銷文件生成中心（Sonnet，需要最高品質）
    if (type === 'doc_generate') {
      const { docType, fields } = body;
      const docPrompts = {
        weekly_report:      `台灣百大企業行銷助手，生成週報。格式：【本週摘要】【數據成效】【重點亮點】【問題與對策】【下週計畫】。素材：${JSON.stringify(fields)}`,
        battle_report:      `台灣行銷數據分析師，生成戰報。格式：【活動概覽】【KPI達成】【亮點分析】【待改善】【後續建議】。素材：${JSON.stringify(fields)}`,
        competitor_analysis:`競品分析專家，生成競品分析。格式：【市場概況】【競品對比表】【優劣勢】【我方機會】【策略建議】。素材：${JSON.stringify(fields)}`,
        meeting_minutes:    `生成會議記錄。格式：【基本資訊】【出席人員】【議題討論】【決議事項（含負責人與期限）】【待辦追蹤】【下次會議】。素材：${JSON.stringify(fields)}`,
        marketing_plan:     `資深行銷策略顧問，生成行銷企劃書。格式：【背景】【目標】【受眾分析】【策略方向】【執行計畫】【預算】【時程甘特圖（文字）】【KPI】。素材：${JSON.stringify(fields)}`,
        event_plan:         `活動企劃專家，生成活動企劃書。格式：【活動概念】【目標】【時間地點】【執行流程】【人員分工】【預算明細】【風險評估】。素材：${JSON.stringify(fields)}`,
        product_launch:     `新品上市行銷專家，生成上市計畫。格式：【產品介紹】【市場定位】【目標客群】【上市時程】【行銷策略】【通路規劃】【預算分配】【成效指標】。素材：${JSON.stringify(fields)}`,
        social_calendar:    `社群行銷專家，生成4週社群內容月曆。每週主題+每日方向，含【主題】【內容方向】【形式】【互動機制】。素材：${JSON.stringify(fields)}`,
        shooting_script:    `影片導演，生成拍攝腳本。包含【影片概述】，每場景用表格：場景編號、描述、台詞/旁白、畫面指示、時長、備註。素材：${JSON.stringify(fields)}`,
        ad_copy:            `數位廣告文案專家，生成三版廣告文案：【Facebook版100-150字】【Instagram版50-80字+hashtag】【LINE版30-50字】，每版有吸睛標題。素材：${JSON.stringify(fields)}`,
        social_post:        `社群小編，生成5則貼文：1.知識型 2.互動型 3.情感共鳴型 4.促銷型 5.幕後花絮型，附建議圖片方向。素材：${JSON.stringify(fields)}`,
        vendor_proposal:    `行銷業務專家，生成廠商提案書。格式：【提案背景】【合作方介紹】【合作目的效益】【具體方案】【預算】【時程】【聯絡資訊】。語氣專業有說服力。素材：${JSON.stringify(fields)}`,
        press_release:      `公關文案專家，生成新聞稿（倒三角結構）：【標題】【副標題】【導言5W1H】【正文】【引述】【關於公司】【聯絡資訊】。素材：${JSON.stringify(fields)}`,
        budget_proposal:    `預算規劃專家，生成預算企劃書：【概覽】【各項明細表格】【分配比例說明】【ROI預估】【時程】【風險備案】。素材：${JSON.stringify(fields)}`,
        crisis_statement:   `危機公關專家，生成危機處理稿：【對外聲明】【內部說明稿】【社群回應範本】【後續追蹤計畫】，語氣誠懇負責。素材：${JSON.stringify(fields)}`,
      };
      const prompt = docPrompts[docType];
      if (!prompt) return new Response(JSON.stringify({ error:'未知文件類型' }), { status:400, headers:corsHeaders });
      const system = '你是台灣百大企業的資深行銷顧問，擅長各類專業文件撰寫。請用繁體中文，格式清晰，符合台灣職場文化。';
      const text = await callSonnet(prompt, system, 4000);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🟣 繼續生成（接著未完成的內容）
    if (type === 'continue_doc') {
      const { existingContent } = body;
      const system = '你是台灣百大企業的資深行銷顧問，擅長各類專業文件撰寫。請用繁體中文，格式清晰，符合台灣職場文化。';
      const prompt = `以下是一份尚未完成的文件，請直接從中斷處繼續寫，不要重複已有的內容，不要加說明，直接接著寫：\n\n${existingContent}\n\n（請繼續）`;
      const text = await callSonnet(prompt, system, 4000);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🟣 怪獸角色 AI 對話（Sonnet + 角色人格 + 長期記憶）
    if (type === 'monster_chat') {
      const { message, monsterName, monsterType, level, userName, chatHistory = [], memorySummary = '', days = 0, interactions = 0 } = body;
      const personalities = {
        huyeh:   { name:'虎爺虎', desc:'廟宇虎爺神的後代，很兇但其實很護主，說話簡短有力，偶爾秀台語，喜歡講道理但方式很直接，偶爾咆哮但是真的很在乎你', style:'用台式風格，偶爾夾雜「欸」「啊」「啦」「ㄟ」，說話直白但有溫度' },
        toudijun:{ name:'土地公仔', desc:'台灣土地公的孫子，胖胖的，超級正能量，什麼事都覺得有福氣，很愛說吉祥話但方式很接地氣，有時候老人家語氣', style:'說話像老一輩台灣人，喜歡說「福氣啦」「沒關係啦」，有時語氣很老派但很可愛' },
        mazu:    { name:'媽祖妹', desc:'媽祖娘娘的小跟班，有點傲嬌，自稱法力無邊但其實只有小神通，很愛管人但是真心為你好，有女神架子但一戳就軟', style:'有點傲嬌，說話帶點仙氣但又很接地氣，偶爾說「本娘娘...」，其實很好說話' },
        xiaogui: { name:'廟仔小鬼', desc:'廟裡的小跟班，鬼靈精怪，很愛八卦，什麼都知道一點但都不說完，喜歡賣關子，超級好奇心，對人間事物充滿興趣', style:'說話跳躍，愛賣關子，常說「欸欸欸你知道嗎」，很八卦但不壞心' },
        shachong:{ name:'沙蟲仔', desc:'台灣海邊來的生物，呆萌，反應慢一拍，但是心地非常善良，什麼都說「ㄟ還不錯欸」，很容易被感動，偶爾說出驚人智慧', style:'說話慢吞吞但很真誠，常說「ㄟ...」停頓很久，然後說出讓人意外的話' },
      };
      const p = personalities[monsterType] || personalities.huyeh;
      const userNameStr = userName ? `用戶叫「${userName}」，` : '';
      const daysStr = days > 0 ? `你們已經相處了${days}天，` : '';
      const interactStr = interactions > 0 ? `對話過${interactions}次，` : '';
      const memoryBlock = memorySummary ? `\n\n【你對這個人的了解（長期記憶）】\n${memorySummary}` : '';
      const system = `你是「${p.name}」，等級${level||1}的台灣特色怪獸角色。${p.desc}。${p.style}。\n你住在用戶的手機裡。${userNameStr}${daysStr}${interactStr}你越來越了解他/她。${memoryBlock}\n\n回覆要簡短（50字以內），有個性，符合你的角色設定。適時根據你對他的了解做出有溫度的回應。不要用制式的AI語氣。`;
      const history = chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{ 'x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json' },
        body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:200, system, messages:[...history, { role:'user', content: message }] }),
      });
      const text = (await res.json()).content?.[0]?.text || '';
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🔵 怪獸長期記憶摘要（Haiku 濃縮）
    if (type === 'monster_summarize') {
      const { monsterType, monsterName, recentChats = [], existingSummary = '' } = body;
      const chatText = recentChats.map(m => `${m.role === 'user' ? '用戶' : '怪獸'}：${m.content}`).join('\n');
      const prompt = `你是記憶整理助手。根據以下對話，整理出「怪獸對這個用戶的了解」，包含：用戶的工作狀況、生活習慣、喜好、情緒狀態、說過的事情、讓怪獸記住的細節。用條列式，每點15字以內，最多8點。繁體中文。\n\n既有摘要（若有）：${existingSummary}\n\n最新對話：\n${chatText}\n\n輸出更新後的摘要條列：`;
      const text = await callHaiku(prompt, 400);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🟣 信件撰寫（Sonnet）
    if (type === 'email') {
      const { data } = body;
      const system = '你是台灣職場行銷經理助手，擅長撰寫正式有禮的繁體中文商業信件。格式：稱謂、自我介紹、主旨說明、具體內容、結尾敬語、署名「行銷部 敬上」。';
      const prompt = `寫一封商業信件。收件人：${data.recipient}。目的：${data.purpose}。補充：${data.detail||'無'}。語氣：${data.tone}。請直接輸出完整信件，含主旨行（主旨：xxx）。`;
      const text = await callSonnet(prompt, system, 2000);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🟣 報告生成（Sonnet）
    if (type === 'report') {
      const { data } = body;
      const system = '你是台灣百大企業行銷部門助手，擅長撰寫專業的繁體中文行銷週報與月報。';
      const prompt = `生成${data.reportType}初稿。對象：${data.audience}。素材：${data.materials}。輸出條列式段落，含「本週摘要」「數據成效」「下週計畫」三個區塊。`;
      const text = await callSonnet(prompt, system, 3000);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    // 🟣 行銷發想（Sonnet）
    if (type === 'idea') {
      const { data } = body;
      const system = '你是資深台灣行銷策略顧問，擅長節慶檔期創意行銷企劃，提供具體可執行方案。';
      const prompt = `發想3個行銷企劃方案。節慶：${data.occasion}。目標：${data.goal}。預算：${data.budget}。每個方案含：名稱、核心概念、執行步驟、預估費用、時程。`;
      const text = await callSonnet(prompt, system, 3000);
      return new Response(JSON.stringify({ result: text }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error:'未知的請求類型' }), { status:400, headers:corsHeaders });
  },
};
