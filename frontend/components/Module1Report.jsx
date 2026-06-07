'use client';
import { useState, useRef } from 'react';
import ReportResult from './ReportResult';
import VoiceBtn from './VoiceBtn';
import HistoryPanel from './HistoryPanel';
import ModuleHero from './ModuleHero';
import useHistory from '../hooks/useHistory';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── 分析維度清單 ──────────────────────────────────────────────────
// group: 'data' = 數據面（需 Excel 支撐）｜ 'strategy' = 策略面（AI 市場知識）
const DIMENSIONS = [
  // ── 數據面 ──
  {
    key: 'overview', group: 'data',
    icon: '📊', label: '整體業績總覽', desc: '總業績、MoM 月增率',
    prompt: '1. 整體業績總覽：本期總業績金額、MoM 月增率（與上期相比）、YoY 年增率（若有多期數據）',
    default: true,
  },
  {
    key: 'growth', group: 'data',
    icon: '🚀', label: '成長亮點 TOP5', desc: '業績成長最快的品項',
    prompt: '2. 成長亮點 TOP5：業績成長幅度最大的5個品項，附成長率與可能原因',
    default: true,
  },
  {
    key: 'decline', group: 'data',
    icon: '⚠️', label: '衰退警示 TOP5', desc: '業績下滑最多的品項',
    prompt: '3. 衰退警示 TOP5：業績衰退幅度最大的5個品項，附衰退率與可能原因',
    default: true,
  },
  {
    key: 'vendor', group: 'data',
    icon: '🤝', label: '廠商業績排行', desc: '前10名廠商業績排名',
    prompt: '4. 廠商業績排行：前10名廠商業績由高到低排列，標示成長/衰退趨勢',
    default: false,
  },
  {
    key: 'category', group: 'data',
    icon: '🗂️', label: '品類結構分析', desc: '各品類市占與成長趨勢',
    prompt: '5. 品類結構分析：各品類業績佔比、成長率排行、哪個品類最需要關注',
    default: false,
  },
  {
    key: 'yoy', group: 'data',
    icon: '📈', label: 'YoY 年同期比較', desc: '今年 vs 去年同期',
    prompt: '6. YoY 年同期比較：今年 vs 去年同期的業績差異，找出今年改善或退步的品項',
    default: false, needsNote: '需上傳去年同期數據',
  },
  {
    key: 'festival', group: 'data',
    icon: '🎊', label: '檔期達成率', desc: '業績 vs 目標達成狀況',
    prompt: '7. 檔期達成率：整體目標達成率、超標品項、未達標品項，以及下次檔期改善方向',
    default: false,
  },
  {
    key: 'trend3y', group: 'data',
    icon: '📉', label: '三年趨勢分析', desc: '前年→去年→今年脈絡',
    prompt: '8. 三年趨勢分析：前年、去年、今年三年的業績走勢，判斷趨勢是加速成長、減速還是反轉',
    default: false, needsNote: '需上傳三期數據',
  },
  {
    key: 'anomaly', group: 'data',
    icon: '🔍', label: '異常預警', desc: '突增或突降的異常品項',
    prompt: '9. 異常預警：找出本期出現突增（+30%以上）或突降（-30%以下）的品項，提示可能原因',
    default: false,
  },
  {
    key: 'action', group: 'data',
    icon: '⚡', label: '行動清單', desc: '下週/下月具體行動建議',
    prompt: '10. 行動清單：根據以上分析，給出3~5條下期具體可執行的行動建議（精簡有力，可直接給主管看）',
    default: true,
  },

  // ── 策略面（AI 結合市場知識）──
  {
    key: 'self', group: 'strategy',
    icon: '🏢', label: '自身現況評估', desc: '我方優勢、劣勢、待改善問題',
    prompt: '自身現況評估：根據數據評估我方目前的業績健康度，找出核心優勢品項、薄弱環節，以及目前最迫切需要解決的問題',
    default: false,
  },
  {
    key: 'macro', group: 'strategy',
    icon: '🌏', label: '大環境分析', desc: '市場趨勢、消費行為、外部因素',
    prompt: '大環境分析：結合台灣 CVS 通路趨勢、整體消費環境與季節因素，評估哪些外部力量正在影響本期業績，以及未來可能的環境變化',
    default: false, aiNote: 'AI 結合市場知識判斷',
  },
  {
    key: 'competitor', group: 'strategy',
    icon: '🔎', label: '同業競品分析', desc: '競品動態、我方相對優劣勢',
    prompt: '同業競品分析：對比主要競品（如 7-11、全家、OK、萊爾富）在相關品類的策略與表現，找出我方相對優勢和需要防守的弱點',
    default: false, aiNote: 'AI 結合市場知識判斷',
  },
  {
    key: 'situation', group: 'strategy',
    icon: '📌', label: '綜合現況判斷', desc: '整合數據面＋市場面的全面評估',
    prompt: '綜合現況判斷：整合數據面表現、大環境趨勢、競品動態，給出一個完整的現況判斷：我方目前在市場上處於什麼位置？有哪些值得警覺的訊號？',
    default: false,
  },
  {
    key: 'opportunity', group: 'strategy',
    icon: '💎', label: '未來商機評估', desc: '短中長期機會與具體切入建議',
    prompt: '未來商機評估：基於數據趨勢與市場洞察，找出未來3~6個月最值得把握的商機（品類機會、節慶布局、新品引進、廠商合作方向等），給出具體的切入建議和優先順序',
    default: false,
  },
];

// ── 快速預設組合 ─────────────────────────────────────────────────
const PRESETS = [
  {
    key: 'weekly',
    label: '📅 週報快速',
    desc: '最常用的週報組合',
    dims: ['overview', 'growth', 'decline', 'anomaly', 'action'],
  },
  {
    key: 'monthly',
    label: '📊 月報完整',
    desc: '數據全面分析',
    dims: DIMENSIONS.filter(d => d.group === 'data').map(d => d.key),
  },
  {
    key: 'strategy',
    label: '🧭 策略全報',
    desc: '數據＋市場＋競品',
    dims: DIMENSIONS.map(d => d.key),
  },
  {
    key: 'vendor',
    label: '🤝 廠商焦點',
    desc: '適合廠商會議用',
    dims: ['overview', 'vendor', 'category', 'growth', 'action'],
  },
  {
    key: 'opportunity',
    label: '💎 商機探索',
    desc: '市場洞察 + 未來機會',
    dims: ['overview', 'macro', 'competitor', 'situation', 'opportunity', 'action'],
  },
];

// ── 建立分析 prompt ───────────────────────────────────────────────
function buildPrompt(selectedKeys, customText) {
  const selected = DIMENSIONS.filter(d => selectedKeys.includes(d.key));

  // 只有自訂文字，沒有勾選項目
  if (selected.length === 0 && customText.trim()) {
    return `請以 CVS 通路業績分析格式，針對上傳的銷售數據完成以下分析需求：

${customText.trim()}

輸出格式要求：
- 數字要有實際數值（金額、百分比）
- 語氣精簡有力，適合直接呈報主管`;
  }

  // 勾選項目 + 可能有自訂補充
  let prompt = `請以 CVS 通路業績分析格式，針對上傳的銷售數據，分析以下 ${selected.length} 個面向：

${selected.map(d => d.prompt).join('\n')}`;

  if (customText.trim()) {
    prompt += `\n\n另外，請額外完成以下需求：\n${customText.trim()}`;
  }

  prompt += `\n\n輸出格式要求：
- 每個項目用清楚的標題分隔
- 數字要有實際數值（金額、百分比）
- 語氣精簡有力，適合直接呈報主管
- 結尾加一段「本期總結」（3句話以內）`;

  return prompt;
}

// ── 勾選維度卡片 ─────────────────────────────────────────────────
function DimCard({ dim, checked, onToggle }) {
  return (
    <button
      onClick={() => onToggle(dim.key)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
        border: `1.5px solid ${checked ? 'var(--brand-border)' : 'var(--border)'}`,
        background: checked ? 'var(--brand-bg)' : 'var(--surface)',
        textAlign: 'left', width: '100%', transition: 'all 0.15s',
      }}
    >
      {/* 勾選框 */}
      <div style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
        border: `2px solid ${checked ? 'var(--brand)' : 'var(--border-2)'}`,
        background: checked ? 'var(--brand)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 15 }}>{dim.icon}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: checked ? 'var(--brand-dark)' : 'var(--text)' }}>
            {dim.label}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{dim.desc}</p>
        {dim.needsNote && (
          <span style={{ fontSize: 11, color: 'var(--amber)', marginTop: 3, display: 'block' }}>
            ⚠️ {dim.needsNote}
          </span>
        )}
      </div>
    </button>
  );
}

// ── 主元件 ───────────────────────────────────────────────────────
export default function Module1Report() {
  const defaultSelected = DIMENSIONS.filter(d => d.default).map(d => d.key);
  const [selected, setSelected]   = useState(defaultSelected);
  const [customText, setCustomText] = useState('');   // ← 自訂需求
  const [mode, setMode]           = useState('upload');
  const [files, setFiles]         = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [loadingSec, setLoadingSec] = useState(0);
  const fileRef = useRef();
  const imgRef  = useRef();
  const timerRef = useRef();
  const { history, addHistory, clearHistory } = useHistory('module1');

  // 快速預設
  const applyPreset = (preset) => {
    setSelected(preset.dims);
    setResult(null);
  };

  // 切換單一維度
  const toggleDim = (key) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // 全選 / 全清
  const selectAll = () => setSelected(DIMENSIONS.map(d => d.key));
  const clearAll    = () => setSelected([]);

  // 檔案處理
  const addFiles = (newFiles) => {
    const toAdd = Array.from(newFiles).map((f, i) => ({
      file: f, label: `資料${files.length + i + 1}`,
    }));
    setFiles(prev => [...prev, ...toAdd]);
  };
  const updateLabel = (i, label) => setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, label } : f));
  const removeFile  = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));
  const handleImgDrop = (e) => {
    e.preventDefault();
    const imgs = Array.from(e.dataTransfer?.files || e.target.files).filter(f => f.type.startsWith('image/'));
    setScreenshots(prev => [...prev, ...imgs]);
  };

  const analyze = async () => {
    setLoading(true); setError(null); setResult(null); setLoadingSec(0);
    timerRef.current = setInterval(() => setLoadingSec(s => s + 1), 1000);
    try {
      const form = new FormData();
      const prompt = buildPrompt(selected, customText);
      form.append('template_id', 'custom');
      form.append('template_prompt', prompt);
      if (mode === 'upload') {
        files.forEach((f, i) => { form.append(`file_${i}`, f.file); form.append(`label_${i}`, f.label); });
        form.append('file_count', files.length);
        form.append('mode', 'excel');
      } else {
        screenshots.forEach((img, i) => form.append(`screenshot_${i}`, img));
        form.append('mode', 'screenshot');
      }
      const res = await fetch(`${API}/api/module1/analyze`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      const dimNames = DIMENSIONS.filter(d => selected.includes(d.key)).map(d => d.label).join('、');
      addHistory({
        label: `${dimNames.slice(0, 30)}${dimNames.length > 30 ? '…' : ''}`,
        summary: data.overview?.one_line || data.overview?.total_growth || '',
        data,
      });
    } catch (e) {
      setError(e.message?.includes('overloaded') ? '529_overloaded' : e.message);
    } finally {
      clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  // 有勾選項目 OR 有自訂文字，都算有效
  const hasRequest = selected.length > 0 || customText.trim().length > 0;
  const hasData    = (mode === 'upload' && files.length > 0) || (mode === 'screenshot' && screenshots.length > 0);
  const canAnalyze = hasRequest && hasData;
  const selectedCount = selected.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <ModuleHero
        icon="📊"
        title="Excel 數據自駕"
        desc="勾選你要分析的項目，AI 按需產出，不用的不分析"
        steps={['勾選分析項目', '上傳 Excel', 'AI 產出報告', '複製 / 下載 PPT']}
      />

      {/* ── 快速預設 ── */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          快速預設
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p)} style={{
              padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--surface)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
              transition: 'all 0.15s',
              ...(JSON.stringify(selected.slice().sort()) === JSON.stringify(p.dims.slice().sort()) && {
                border: '1.5px solid var(--brand-border)', background: 'var(--brand-bg)', color: 'var(--brand-dark)',
              }),
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.background = 'var(--brand-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
            >
              {p.label}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 分析項目勾選 ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            分析項目 <span style={{ color: 'var(--brand)', fontWeight: 800 }}>（已選 {selectedCount} 項）</span>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={selectAll} style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }}>全選</button>
            <span style={{ color: 'var(--border-2)', fontSize: 12 }}>|</span>
            <button onClick={clearAll} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>清空</button>
          </div>
        </div>
        {/* 數據面 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>📋 數據面</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>依上傳 Excel 分析</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {DIMENSIONS.filter(d => d.group === 'data').map(dim => (
            <DimCard key={dim.key} dim={dim} checked={selected.includes(dim.key)} onToggle={toggleDim} />
          ))}
        </div>

        {/* 策略面 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.05em' }}>🧭 策略面</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--brand)', background: 'var(--brand-bg)', padding: '1px 8px', borderRadius: 10, border: '1px solid var(--brand-border)' }}>AI 結合市場知識</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {DIMENSIONS.filter(d => d.group === 'strategy').map(dim => (
            <DimCard key={dim.key} dim={dim} checked={selected.includes(dim.key)} onToggle={toggleDim} />
          ))}
        </div>
      </div>

      {/* ── 自訂需求（打字或語音）── */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>✏️ 自訂需求（選填）</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              打字或 🎙️ 語音輸入，沒有也沒關係
            </p>
          </div>
          <VoiceBtn onResult={text => setCustomText(prev => prev ? prev + '，' + text : text)} />
        </div>
        <div style={{ padding: '12px 14px' }}>
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder={`例如：
• 請特別關注飲料品類，找出哪幾個 SKU 貢獻最大
• 本週有春節檔期，請分析節慶加成效果
• 幫我整理可以直接講給主管的重點，3 點就好`}
            rows={4}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: customText ? '1.5px solid var(--brand-border)' : '1px solid var(--border)',
              background: customText ? 'var(--brand-bg)' : 'var(--bg)',
              color: 'var(--text)', fontSize: 14, resize: 'vertical',
              lineHeight: 1.65, fontFamily: 'inherit', outline: 'none',
              transition: 'all 0.15s',
            }}
          />
          {customText && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--brand)' }}>
                ✓ AI 會把這個需求加進分析裡
              </p>
              <button onClick={() => setCustomText('')} style={{
                fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer',
              }}>清除</button>
            </div>
          )}
          {!hasRequest && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--amber)', textAlign: 'center' }}>
              ⚠️ 請勾選分析項目，或在此輸入自訂需求
            </p>
          )}
        </div>
      </div>

      {/* ── 模式切換：Excel / 截圖或拍照 ── */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', borderRadius: 10, padding: 4 }}>
        {[
          { key: 'upload',     icon: '📁', label: 'Excel 上傳', hint: '上傳 .xlsx / .csv' },
          { key: 'screenshot', icon: '📷', label: '截圖 / 拍照', hint: '螢幕截圖或手機拍攝皆可' },
        ].map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{
            flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', borderRadius: 8,
            background: mode === m.key ? 'var(--brand)' : 'transparent',
            color: mode === m.key ? '#fff' : 'var(--text-2)',
            fontWeight: mode === m.key ? 700 : 400, fontSize: 14,
            transition: 'all 0.15s',
          }}>
            {m.icon} {m.label}
            <span style={{ display: 'block', fontSize: 10, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>{m.hint}</span>
          </button>
        ))}
      </div>

      {/* ── 上傳區 ── */}
      {mode === 'upload' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)', borderRadius: 10, padding: '10px 14px',
              border: '1px solid var(--brand-border)',
            }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</p>
                <input value={f.label} onChange={e => updateLabel(i, e.target.value)}
                  placeholder="這份資料的時間（如：2025年5月）"
                  style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }} />
              </div>
              <button onClick={() => removeFile(i)} style={{
                width: 26, height: 26, borderRadius: '50%',
                border: '1px solid var(--red-border)',
                background: 'var(--red-bg)', color: 'var(--red)', cursor: 'pointer', fontSize: 14, flexShrink: 0,
              }}>✕</button>
            </div>
          ))}
          <div onClick={() => fileRef.current.click()}
            onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
            style={{ border: '2px dashed var(--border-2)', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)' }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            <span style={{ fontSize: 28 }}>➕</span>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>
              {files.length === 0 ? '點選或拖放 Excel（可同時選多個）' : '再加一份'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>支援 .xlsx / .xls / .csv</p>
          </div>
        </div>
      ) : (
        <div>
          <div onClick={() => imgRef.current.click()}
            onDrop={handleImgDrop} onDragOver={e => e.preventDefault()}
            style={{ border: '2px dashed var(--border-2)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)' }}>
            <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImgDrop} />
            <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>上傳截圖或手機拍照</p>
            <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-2)' }}>可上傳多張，AI 自動辨識數字與表格</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {['電腦截圖 (PNG/JPG)', '手機拍螢幕', '拍紙本報表'].map(t => (
                <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--brand-bg)', color: 'var(--brand-dark)', border: '1px solid var(--brand-border)' }}>{t}</span>
              ))}
            </div>
          </div>
          {screenshots.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
              {screenshots.map((img, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={URL.createObjectURL(img)} alt="" style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                  <button onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== i))} style={{
                    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--red)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12,
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 分析按鈕 ── */}
      <button onClick={analyze} disabled={!canAnalyze || loading} style={{
        width: '100%', padding: '16px', borderRadius: 12, border: 'none',
        cursor: canAnalyze && !loading ? 'pointer' : 'not-allowed',
        background: canAnalyze && !loading ? 'var(--brand)' : 'var(--border)',
        color: canAnalyze && !loading ? '#fff' : 'var(--text-muted)',
        fontWeight: 700, fontSize: 17, transition: 'all 0.2s', letterSpacing: '-0.3px',
      }}>
        {loading ? '⏳ AI 分析中...'
          : !hasData   ? '⬆️ 請先上傳 Excel 或截圖'
          : !hasRequest ? '請勾選項目或輸入自訂需求'
          : selectedCount > 0 && customText.trim()
            ? `🚀 開始分析（${selectedCount} 項 ＋ 自訂需求）`
          : customText.trim()
            ? '🚀 開始自訂分析'
            : `🚀 開始分析（${selectedCount} 個項目）`}
      </button>

      {!canAnalyze && selected.length > 0 && (
        <p style={{ margin: '-10px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'upload' ? '⬆️ 還沒上傳 Excel 檔案' : '⬆️ 還沒上傳截圖'}
        </p>
      )}

      {/* ── 載入中提示 ── */}
      {loading && (
        <div style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', borderRadius: 14, padding: '20px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--brand-dark)', fontSize: 15 }}>
            AI 分析中
            {loadingSec > 0 && <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>已等待 {loadingSec} 秒</span>}
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            報告分析通常需要 <strong>1〜5 分鐘</strong><br/>
            完成後結果會自動出現在 <strong>下方</strong> 👇
          </p>
          {loadingSec >= 30 && (
            <div style={{ marginTop: 10, background: 'var(--brand)', borderRadius: 8, padding: '8px 14px', display: 'inline-block' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#fff', fontWeight: 600 }}>⏳ AI 正在整理報告，請耐心等候，不要重複按</p>
            </div>
          )}
          {loadingSec >= 300 && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--red)' }}>
              超過 5 分鐘？可能網路或後端有問題，可以重新整理頁面再試試
            </p>
          )}
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div style={{ background: error === '529_overloaded' ? 'var(--amber-bg)' : 'var(--red-bg)', border: `1px solid ${error === '529_overloaded' ? 'var(--amber-border)' : 'var(--red-border)'}`, borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 8px', color: error === '529_overloaded' ? 'var(--amber)' : 'var(--red)', fontSize: 14, fontWeight: 700 }}>
            {error === '529_overloaded' ? '😅 AI 伺服器暫時過載' : '⚠️ 分析失敗'}
          </p>
          <p style={{ margin: '0 0 10px', color: error === '529_overloaded' ? 'var(--amber)' : 'var(--red)', fontSize: 12 }}>
            {error === '529_overloaded' ? '請稍後 30 秒再試' : error?.slice(0, 120)}
          </p>
          <button onClick={analyze} style={{
            padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 13,
          }}>🔄 重試</button>
        </div>
      )}

      <HistoryPanel
        history={history}
        clearHistory={clearHistory}
        onRestore={data => { setResult(data); setError(null); }}
      />

      {result && <ReportResult data={result} templateName={`${selectedCount} 項分析`} />}
    </div>
  );
}
