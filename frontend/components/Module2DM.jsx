'use client';
import { useState, useRef } from 'react';
import HistoryPanel from './HistoryPanel';
import ModuleHero from './ModuleHero';
import useHistory from '../hooks/useHistory';
import VoiceBtn from './VoiceBtn';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── 複製純文字 ─────────────────────────────────────────────────
function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── 下載 PPT ───────────────────────────────────────────────────
async function downloadDMPPTX(data) {
  if (typeof window === 'undefined' || !window.PptxGenJS) {
    alert('PPT 函式庫載入中，請稍後再試');
    return;
  }
  const title = `${data.overview?.festival || 'DM 分析'} 策略建議書`;
  const today = new Date().toLocaleDateString('zh-TW');
  const font = '微軟正黑體';
  const PRIMARY = '8B5CF6';
  const DARK = '0F172A';
  const CARD = '1E293B';

  const pres = new window.PptxGenJS();
  pres.layout = 'LAYOUT_16x9';

  // Slide 1: 封面
  const s1 = pres.addSlide();
  s1.background = { color: DARK };
  s1.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
  s1.addText('💫 寵妻神器 · CVS DM 策略分析', { x: 0.5, y: 0.3, w: 9, h: 0.4, fontSize: 11, color: '818CF8', fontFace: font });
  s1.addText(title, { x: 0.5, y: 0.9, w: 9, h: 1.0, fontSize: 28, bold: true, color: 'F1F5F9', fontFace: font });
  if (data.overview?.one_line) s1.addText(data.overview.one_line, { x: 0.5, y: 2.1, w: 9, h: 0.6, fontSize: 15, color: '94A3B8', fontFace: font });
  s1.addText(`${data.overview?.period || ''}  ·  ${today}`, { x: 0.5, y: 3.0, w: 9, h: 0.4, fontSize: 11, color: '475569', fontFace: font });
  s1.addText('', { x: 0, y: 5.52, w: 10, h: 0.1, fill: { color: PRIMARY } });

  // Slide 2: 避坑 + 延續
  if (data.avoid || data.continue_good) {
    const s2 = pres.addSlide();
    s2.background = { color: DARK };
    s2.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s2.addText('📋 去年回顧', { x: 0.4, y: 0.15, w: 9.2, h: 0.5, fontSize: 20, bold: true, color: '818CF8', fontFace: font });
    if (data.avoid) {
      s2.addText('⚠️ 去年踩坑 → 今年避開', { x: 0.4, y: 0.8, w: 4.3, h: 0.4, fontSize: 13, bold: true, color: 'F87171', fontFace: font });
      s2.addText(data.avoid, { x: 0.4, y: 1.25, w: 4.3, h: 3.8, fontSize: 12, color: 'CBD5E1', fontFace: font, valign: 'top', lineSpacingMultiple: 1.5 });
    }
    if (data.continue_good) {
      s2.addText('✅ 去年亮點 → 今年延續', { x: 5.3, y: 0.8, w: 4.3, h: 0.4, fontSize: 13, bold: true, color: '4ADE80', fontFace: font });
      s2.addText(data.continue_good, { x: 5.3, y: 1.25, w: 4.3, h: 3.8, fontSize: 12, color: 'CBD5E1', fontFace: font, valign: 'top', lineSpacingMultiple: 1.5 });
    }
    s2.addText('', { x: 4.9, y: 0.8, w: 0.03, h: 4.0, fill: { color: '334155' } });
  }

  // Slide 3: 推薦品項
  if (data.products_star?.length) {
    const s3 = pres.addSlide();
    s3.background = { color: DARK };
    s3.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s3.addText('🛒 今年主推品項', { x: 0.4, y: 0.15, w: 9.2, h: 0.5, fontSize: 20, bold: true, color: '818CF8', fontFace: font });
    data.products_star.slice(0, 4).forEach((p, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.4 + col * 4.8, y = 0.85 + row * 2.2;
      s3.addText([
        { text: p.name + '\n', options: { fontSize: 15, bold: true, color: 'F1F5F9', fontFace: font } },
        { text: '推薦原因：' + p.reason + '\n', options: { fontSize: 11, color: '94A3B8', fontFace: font } },
        { text: '→ ' + p.action, options: { fontSize: 11, color: 'A78BFA', fontFace: font } },
      ], { x, y, w: 4.5, h: 2.0, fill: { color: CARD }, rectRadius: 0.1, valign: 'middle', inset: 0.2 });
    });
  }

  // Slide 4: 創意企劃
  if (data.campaign_ideas?.length) {
    const s4 = pres.addSlide();
    s4.background = { color: DARK };
    s4.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s4.addText('💡 今年新創意企劃', { x: 0.4, y: 0.15, w: 9.2, h: 0.5, fontSize: 20, bold: true, color: '818CF8', fontFace: font });
    data.campaign_ideas.slice(0, 3).forEach((c, i) => {
      s4.addText([
        { text: c.title + '\n', options: { fontSize: 14, bold: true, color: 'FBBF24', fontFace: font } },
        { text: c.desc + '\n', options: { fontSize: 11, color: 'CBD5E1', fontFace: font } },
        { text: '主視覺：' + (c.kv || ''), options: { fontSize: 11, color: '94A3B8', fontFace: font } },
      ], { x: 0.4, y: 0.85 + i * 1.5, w: 9.2, h: 1.35, fill: { color: CARD }, rectRadius: 0.08, valign: 'middle', inset: 0.2 });
    });
  }

  // Slide 5: 行動清單
  if (data.action_items?.length || data.strategy) {
    const s5 = pres.addSlide();
    s5.background = { color: DARK };
    s5.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s5.addText('🎯 執行行動清單', { x: 0.4, y: 0.15, w: 9.2, h: 0.5, fontSize: 20, bold: true, color: '818CF8', fontFace: font });
    if (data.action_items?.length) {
      const rows = data.action_items.map((a, i) => ({ text: a, options: { bullet: { indent: 10 }, paraSpaceAfter: 6 } }));
      s5.addText(rows, { x: 0.4, y: 0.85, w: 9.2, h: 3.0, fontSize: 13, color: 'CBD5E1', fontFace: font, valign: 'top' });
    }
    if (data.strategy) {
      s5.addText('整體策略', { x: 0.4, y: 4.0, w: 9.2, h: 0.35, fontSize: 12, bold: true, color: 'A78BFA', fontFace: font });
      s5.addText(data.strategy.slice(0, 200) + (data.strategy.length > 200 ? '…' : ''), {
        x: 0.4, y: 4.38, w: 9.2, h: 0.95, fontSize: 11, color: '94A3B8', fontFace: font, valign: 'top',
      });
    }
  }

  await pres.writeFile({ fileName: `${data.overview?.festival || 'DM分析'}_策略建議書_${today.replace(/\//g, '-')}.pptx` });
}

// 偵測是否為技術錯誤文字（不應顯示給使用者）
function isTechError(text) {
  if (!text || typeof text !== 'string') return false;
  return /Traceback|Error:|Exception:|pdfplumber|pandas|import |\.py"|stack trace/i.test(text);
}
function safeText(text, fallback = '') {
  if (!text || isTechError(text)) return fallback;
  return text;
}

// 空狀態提示
function EmptyHint({ icon, msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 13 }}>{msg}</p>
    </div>
  );
}

// ── 結果展示 ───────────────────────────────────────────────────
function DMResult({ data }) {
  const [tab, setTab] = useState('review');
  const [pptLoading, setPptLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const TABS = [
    { key: 'review',     label: '📋 去年回顧' },
    { key: 'categories', label: '🗂️ 商品分類' },
    { key: 'products',   label: '🛒 選品建議' },
    { key: 'ideas',      label: '💡 創意企劃' },
    { key: 'report',     label: '📝 完整建議書' },
  ];

  const handlePPT = async () => {
    setPptLoading(true);
    try { await downloadDMPPTX(data); } finally { setPptLoading(false); }
  };

  const handleCopy = () => {
    copyText(data.report_text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const avoid         = safeText(data.avoid);
  const continueGood  = safeText(data.continue_good);
  const strategy      = safeText(data.strategy);
  const reportText    = safeText(data.report_text);
  const stars         = (data.products_star  || []).filter(p => p?.name);
  const avoids        = (data.products_avoid || []).filter(p => p?.name);
  const ideas         = (data.campaign_ideas || []).filter(c => c?.title);
  const actions       = (data.action_items   || []).filter(a => a && typeof a === 'string');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* 概覽 Banner */}
      <div style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
        <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--brand)' }}>{data.overview?.period}</p>
        <p style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: 'var(--brand-dark)' }}>{data.overview?.festival || 'DM 策略分析完成'}</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{data.overview?.one_line}</p>
      </div>

      {/* 匯出按鈕 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={handleCopy} style={{
          flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
          background: copied ? 'var(--green-bg)' : 'var(--brand)',
          color: copied ? 'var(--green)' : '#fff', fontWeight: 700, fontSize: 14,
          border: copied ? '1px solid var(--green-border)' : 'none',
        }}>{copied ? '✓ 已複製！' : '📋 複製全文'}</button>
        <button onClick={handlePPT} disabled={pptLoading} style={{
          flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--brand-border)', cursor: pptLoading ? 'wait' : 'pointer',
          background: 'var(--brand-bg)', color: pptLoading ? 'var(--text-muted)' : 'var(--brand-dark)', fontWeight: 700, fontSize: 14,
        }}>{pptLoading ? '⏳ 生成中...' : '📊 下載 PPT'}</button>
      </div>

      {/* 分頁 */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 12px', border: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap',
            background: tab === t.key ? 'var(--brand)' : 'var(--bg-2)',
            color: tab === t.key ? '#fff' : 'var(--text-2)',
            fontWeight: tab === t.key ? 700 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab: 去年回顧 */}
      {tab === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {avoid ? (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--red-border)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--red)' }}>⚠️ 去年踩坑 → 今年避開</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{avoid}</p>
            </div>
          ) : <EmptyHint icon="⚠️" msg="去年踩坑分析暫無資料" />}

          {continueGood ? (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--green-border)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--green)' }}>✅ 去年亮點 → 今年延續</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{continueGood}</p>
            </div>
          ) : <EmptyHint icon="✅" msg="去年亮點分析暫無資料" />}

          {strategy && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--brand)' }}>🎯 今年整體策略</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{strategy}</p>
            </div>
          )}

          {actions.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--amber)' }}>⚡ 行動清單</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {actions.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                    <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i + 1}</span>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: 商品分類 */}
      {tab === 'categories' && (() => {
        const cats = data.categories || {};
        const TREND_COLOR = { '成長': 'var(--green)', '持平': 'var(--amber)', '衰退': 'var(--red)' };
        const entries = Object.entries(cats).filter(([, v]) => v?.items?.length || v?.note);
        if (!entries.length) return (
          <EmptyHint icon="🗂️" msg="AI 未產出分類資料，建議同時上傳銷售 Excel 讓分析更完整" />
        );
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map(([catName, cat]) => {
              const trendColor = TREND_COLOR[cat.trend] || 'var(--text-muted)';
              return (
                <div key={catName} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{catName}</p>
                    {cat.trend && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${trendColor}22`, color: trendColor, border: `1px solid ${trendColor}44` }}>
                        {cat.trend === '成長' ? '↑' : cat.trend === '衰退' ? '↓' : '→'} {cat.trend}
                      </span>
                    )}
                  </div>
                  {cat.items?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: cat.note ? 8 : 0 }}>
                      {cat.items.map((item, i) => (
                        <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: 'var(--bg)', color: 'var(--text-2)' }}>{item}</span>
                      ))}
                    </div>
                  )}
                  {cat.note && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>📌 {cat.note}</p>}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Tab: 選品建議 */}
      {tab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stars.length > 0 ? (
            <>
              <h3 style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--green)' }}>🌟 今年主推品項</h3>
              {stars.map((p, i) => (
                <div key={i} style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--green-border)' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{p.name}</p>
                  {p.reason && <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-muted)' }}>推薦原因：{p.reason}</p>}
                  {p.action && <p style={{ margin: 0, fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>→ {p.action}</p>}
                </div>
              ))}
            </>
          ) : <EmptyHint icon="🛒" msg="AI 未從 DM 中偵測到足夠的品項資訊，請上傳包含品名的文字型 PDF 或銷售 Excel" />}

          {avoids.length > 0 && (
            <>
              <h3 style={{ margin: '12px 0 6px', fontSize: 13, color: 'var(--red)' }}>🚫 建議迴避品項</h3>
              {avoids.map((p, i) => (
                <div key={i} style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--red-border)' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{p.name}</p>
                  {p.reason && <p style={{ margin: 0, fontSize: 12, color: 'var(--red)' }}>{p.reason}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Tab: 創意企劃 */}
      {tab === 'ideas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ideas.length > 0 ? ideas.map((c, i) => (
            <div key={i} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 15, color: 'var(--amber)' }}>💡 {c.title}</p>
              {c.desc && <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{c.desc}</p>}
              {c.kv && <p style={{ margin: 0, fontSize: 12, color: 'var(--brand)', background: 'var(--bg)', padding: '6px 10px', borderRadius: 6 }}>主視覺概念：{c.kv}</p>}
            </div>
          )) : <EmptyHint icon="💡" msg="AI 未產出創意企劃，建議同時上傳銷售 Excel 讓分析更完整" />}
        </div>
      )}

      {/* Tab: 完整建議書 */}
      {tab === 'report' && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
          {reportText ? (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, fontFamily: 'inherit' }}>
              {reportText}
            </pre>
          ) : (
            <EmptyHint icon="📝" msg="完整建議書尚未生成，請重新分析，或同時上傳 PDF 與銷售 Excel" />
          )}
        </div>
      )}
    </div>
  );
}

// ── 稽核比對元件 ──────────────────────────────────────────────────
function AuditMode() {
  const [dmPdfs, setDmPdfs]     = useState([]);
  const [priceExcel, setPriceExcel] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const dmRef    = useRef();
  const xlsRef   = useRef();

  const addPdfs = (files) =>
    setDmPdfs(prev => [...prev, ...Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    )]);

  const audit = async () => {
    if (!dmPdfs.length || !priceExcel) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      dmPdfs.forEach((f, i) => form.append(`dm_pdf_${i}`, f));
      form.append('price_excel', priceExcel);
      const res = await fetch(`${API}/api/module2/audit`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || res.statusText);
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const ISSUE_STYLE = {
    '價格不符': { bg: 'var(--red-bg)',   color: 'var(--red)',   border: 'var(--red-border)',   icon: '💰' },
    '規格不符': { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber-border)', icon: '📐' },
    '品名不符': { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber-border)', icon: '🏷️' },
    'DM 有但 Excel 無': { bg: 'var(--blue-bg)', color: 'var(--blue)', border: 'var(--blue-border)', icon: '📄' },
    'Excel 有但 DM 無': { bg: 'var(--bg-2)',    color: 'var(--text-2)', border: 'var(--border)', icon: '📊' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 10, padding: '12px 16px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>📋 DM × Excel 稽核比對</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
          上傳當期 DM（PDF）+ 商品價格 Excel，AI 自動比對找出：價格錯誤、規格不符、品名差異、DM 漏列品項。
        </p>
      </div>

      {/* 上傳 DM */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em' }}>
          當期 DM 目錄（PDF）<span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — 支援掃描圖片型 PDF，AI 用視覺辨識</span>
        </p>
        <div onClick={() => dmRef.current.click()}
          onDrop={e => { e.preventDefault(); addPdfs(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
          style={{ border: `2px dashed ${dmPdfs.length ? 'var(--brand-border)' : 'var(--border)'}`, borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)' }}>
          <input ref={dmRef} type="file" accept=".pdf,image/*" multiple style={{ display: 'none' }} onChange={e => addPdfs(e.target.files)} />
          <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
          <p style={{ margin: 0, fontSize: 13, color: dmPdfs.length ? 'var(--brand-dark)' : 'var(--text-muted)', fontWeight: dmPdfs.length ? 600 : 400 }}>
            {dmPdfs.length ? `✓ ${dmPdfs.map(f => f.name).join('、')}` : '點選或拖放 DM PDF 或照片（可多份）'}
          </p>
          {!dmPdfs.length && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>PDF · 截圖 · 手機拍攝實體 DM 皆可</p>}
        </div>
        {dmPdfs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {dmPdfs.map((f, i) => (
              <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--brand-bg)', color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {f.name.slice(0, 20)}
                <button onClick={() => setDmPdfs(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 上傳商品 Excel */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em' }}>
          商品資料 Excel <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — 含品名、規格、官方售價的對照表</span>
        </p>
        <div onClick={() => xlsRef.current.click()}
          style={{ border: `2px dashed ${priceExcel ? 'var(--green-border)' : 'var(--border)'}`, borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)' }}>
          <input ref={xlsRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => setPriceExcel(e.target.files[0])} />
          <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
          <p style={{ margin: 0, fontSize: 13, color: priceExcel ? 'var(--green)' : 'var(--text-muted)', fontWeight: priceExcel ? 700 : 400 }}>
            {priceExcel ? `✓ ${priceExcel.name}` : '點選上傳商品對照 Excel'}
          </p>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>
          Excel 需含欄位：品名 / 規格（克數/容量）/ 售價（建議欄位名稱即可，AI 自動對應）
        </p>
      </div>

      {/* 比對按鈕 */}
      <button onClick={audit} disabled={!dmPdfs.length || !priceExcel || loading} style={{
        width: '100%', padding: 16, borderRadius: 12, border: 'none',
        background: (dmPdfs.length && priceExcel && !loading) ? 'var(--amber)' : 'var(--border)',
        color: (dmPdfs.length && priceExcel && !loading) ? '#fff' : 'var(--text-muted)',
        fontWeight: 700, fontSize: 17, cursor: (dmPdfs.length && priceExcel) ? 'pointer' : 'not-allowed',
        letterSpacing: '-0.3px',
      }}>
        {loading ? '🔍 AI 逐頁比對中（可能需要 1~2 分鐘）...' : '🔍 開始 DM × Excel 稽核比對'}
      </button>

      {/* 錯誤 */}
      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '12px 16px' }}>
          <p style={{ margin: '0 0 8px', color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>⚠️ 比對失敗</p>
          <p style={{ margin: 0, color: 'var(--red)', fontSize: 12 }}>{error}</p>
        </div>
      )}

      {/* 比對結果 */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 摘要 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'DM 品項數', value: result.summary?.dm_items ?? '—', color: 'var(--brand)' },
              { label: '成功比對', value: result.summary?.matched ?? '—', color: 'var(--green)' },
              { label: '發現異常', value: result.summary?.issues ?? '—', color: result.summary?.issues > 0 ? 'var(--red)' : 'var(--green)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* 異常清單 */}
          {(result.issues || []).length > 0 ? (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                🚨 異常品項（{result.issues.length} 筆）
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.issues.map((issue, i) => {
                  const s = ISSUE_STYLE[issue.type] || ISSUE_STYLE['品名不符'];
                  return (
                    <div key={i} style={{ background: 'var(--surface)', borderRadius: 10, border: `1px solid ${s.border}`, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: s.bg }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{issue.type}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: s.color, fontWeight: 600 }}>{issue.product_name}</span>
                      </div>
                      <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
                          <p style={{ margin: '0 0 4px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>📄 DM 顯示</p>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{issue.dm_value || '—'}</p>
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
                          <p style={{ margin: '0 0 4px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>📊 Excel 正確值</p>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{issue.excel_value || '—'}</p>
                        </div>
                      </div>
                      {issue.suggestion && (
                        <p style={{ margin: 0, padding: '8px 14px', fontSize: 12, color: s.color, borderTop: `1px solid ${s.border}` }}>
                          💡 {issue.suggestion}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', background: 'var(--green-bg)', borderRadius: 12, border: '1px solid var(--green-border)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>DM 資訊與 Excel 完全一致，未發現異常！</p>
            </div>
          )}

          {/* 正常品項 */}
          {(result.matched_items || []).length > 0 && (
            <details style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <summary style={{ padding: '12px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                ✓ 正常品項（{result.matched_items.length} 筆，點開查看）
              </summary>
              <div style={{ padding: '0 14px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.matched_items.map((item, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)' }}>
                    ✓ {item}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ── 主元件 ─────────────────────────────────────────────────────
export default function Module2DM() {
  const [mode, setMode]           = useState('strategy'); // 'strategy' | 'audit'
  const [prevPdfs, setPrevPdfs]   = useState([]);
  const [lastPdfs, setLastPdfs]   = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [year, setYear]           = useState(new Date().getFullYear().toString());
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [retryInfo, setRetryInfo] = useState('');
  const { history, addHistory, clearHistory } = useHistory('module2');
  const prevRef = useRef();
  const lastRef = useRef();
  const xlsRef  = useRef();

  // 接受 PDF + 圖片
  const addPdfs = (setter, files) =>
    setter(prev => [...prev, ...Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    )]);

  const analyze = async (attempt = 0) => {
    if (!prevPdfs.length && !lastPdfs.length && !excelFile) {
      setError('請至少上傳一份 DM PDF 或銷售 Excel'); return;
    }
    setLoading(true); setError(null); setResult(null); setRetryInfo('');
    try {
      const form = new FormData();
      prevPdfs.forEach((f, i) => form.append(`prev_pdf_${i}`, f));
      lastPdfs.forEach((f, i) => form.append(`last_pdf_${i}`, f));
      if (excelFile) form.append('sales_excel', excelFile);
      form.append('year', year);
      const res = await fetch(`${API}/api/module2/analyze`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || json.error) {
        const msg = json.error || res.statusText;
        if ((msg.includes('529') || msg.includes('overloaded')) && attempt < 2) {
          const wait = (attempt + 1) * 5000;
          setRetryInfo(`AI 伺服器忙碌，${Math.round(wait/1000)} 秒後自動重試（第 ${attempt+1} 次）…`);
          await new Promise(r => setTimeout(r, wait));
          setRetryInfo('');
          return analyze(attempt + 1);
        }
        throw new Error(msg);
      }
      setResult(json);
      addHistory({
        label: `${json.overview?.festival || '節慶分析'} ${year}`,
        summary: json.overview?.one_line || '',
        data: json,
      });
    } catch (e) {
      setError(e.message?.includes('overloaded') ? '529_overloaded' : e.message);
    } finally {
      setLoading(false);
    }
  };

  const canAnalyze = (prevPdfs.length > 0 || lastPdfs.length > 0 || !!excelFile) && !loading;
  const prevYear   = String(Number(year) - 2);
  const lastYear   = String(Number(year) - 1);

  // ── PDF / 圖片 上傳方塊 ────────────────────────────────────────
  const PdfZone = ({ label, year: yr, files, setFiles, inputRef, color }) => {
    const imgFiles = files.filter(f => f.type.startsWith('image/'));
    const pdfFiles = files.filter(f => !f.type.startsWith('image/'));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color, letterSpacing: '0.05em' }}>
          {label}（{yr} 年）{files.length > 0 && <span style={{ color: 'var(--green)' }}>✓ {files.length} 份</span>}
        </p>
        <div onClick={() => inputRef.current.click()}
          onDrop={e => { e.preventDefault(); addPdfs(setFiles, e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
          style={{
            border: `2px dashed ${files.length ? 'var(--brand-border)' : 'var(--border)'}`,
            borderRadius: 12, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', minHeight: 80, background: 'var(--bg)',
          }}>
          <input ref={inputRef} type="file" accept=".pdf,image/*" multiple style={{ display: 'none' }}
            onChange={e => addPdfs(setFiles, e.target.files)} />
          {/* 縮圖預覽（有圖片時顯示）*/}
          {imgFiles.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              {imgFiles.slice(0, 3).map((f, i) => (
                <img key={i} src={URL.createObjectURL(f)} alt=""
                  style={{ width: 48, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
              ))}
              {imgFiles.length > 3 && <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>+{imgFiles.length - 3}</span>}
            </div>
          ) : (
            <div style={{ fontSize: 22, marginBottom: 4 }}>📄</div>
          )}
          <p style={{ margin: 0, fontSize: 12, color: files.length ? 'var(--brand-dark)' : 'var(--text-muted)', fontWeight: files.length ? 600 : 400 }}>
            {files.length
              ? `✓ ${pdfFiles.length ? pdfFiles.length + '份PDF ' : ''}${imgFiles.length ? imgFiles.length + '張圖片' : ''}`
              : '點選或拖放'}
          </p>
          {!files.length && (
            <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>PDF · 截圖 · 手機拍照 皆可</p>
          )}
        </div>
        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {files.map((f, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--bg)', color, display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${color}33` }}>
                {f.name.slice(0, 15)}
                <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 0, fontSize: 11 }}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <ModuleHero
        icon="👁️"
        title="節慶 DM 分析"
        desc="策略分析：三年 DM 對比生成今年企劃｜稽核比對：找出 DM 標示錯誤"
        steps={mode === 'strategy' ? ['上傳 DM PDF', 'AI 三年對比', '選品 & 企劃', '下載 PPT'] : ['上傳當期 DM', '上傳商品 Excel', 'AI 逐頁比對', '查看異常清單']}
      />

      {/* ── 模式切換 ── */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', borderRadius: 10, padding: 4 }}>
        {[
          { key: 'strategy', icon: '🧭', label: '策略分析', desc: '歷年 DM 對比，生成今年企劃' },
          { key: 'audit',    icon: '🔍', label: 'DM 稽核比對', desc: '找出 DM 標示錯誤 / 價格不符' },
        ].map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{
            flex: 1, padding: '11px 8px', border: 'none', cursor: 'pointer', borderRadius: 8,
            background: mode === m.key ? 'var(--brand)' : 'transparent',
            color: mode === m.key ? '#fff' : 'var(--text-2)',
            fontWeight: mode === m.key ? 700 : 400, fontSize: 14, transition: 'all 0.15s',
          }}>
            {m.icon} {m.label}
            <span style={{ display: 'block', fontSize: 11, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* 稽核模式 */}
      {mode === 'audit' && <AuditMode />}

      {/* 策略分析模式 */}
      {mode === 'strategy' && (<>

      {/* 上傳區：前年 + 去年 並排 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <PdfZone label="前年 DM" yr={prevYear} files={prevPdfs} setFiles={setPrevPdfs} inputRef={prevRef} color="var(--brand)" />
        <PdfZone label="去年 DM" yr={lastYear} files={lastPdfs} setFiles={setLastPdfs} inputRef={lastRef} color="var(--brand-dark)" />
      </div>

      {/* 提示 */}
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface)', padding: '7px 12px', borderRadius: 8 }}>
        💡 至少上傳「去年 DM」。若同時有前年，AI 會進行三年對比，分析更深入。
      </p>

      {/* 舊的 PDF + Excel 區域仍保留 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        {/* Excel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.05em' }}>銷售明細 Excel（選填，有更精準建議）</p>
          <div onClick={() => xlsRef.current.click()}
            style={{ border: `2px dashed ${excelFile ? 'var(--brand-border)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)' }}>
            <input ref={xlsRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
              onChange={e => setExcelFile(e.target.files[0])} />
            <div style={{ fontSize: 22, marginBottom: 4 }}>📊</div>
            <p style={{ margin: 0, fontSize: 12, color: excelFile ? 'var(--brand-dark)' : 'var(--text-muted)' }}>
              {excelFile ? excelFile.name : '點選上傳銷售明細'}
            </p>
          </div>
        </div>
      </div>

      {/* 年份 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>今年目標年份：</label>
        <input value={year} onChange={e => setYear(e.target.value)}
          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }}
          placeholder={new Date().getFullYear().toString()} />
        <VoiceBtn onResult={text => { const y = text.replace(/[^0-9]/g, ''); if (y.length === 4) setYear(y); }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          前年 {prevYear}｜去年 {lastYear}
        </span>
      </div>

      {/* 分析按鈕 */}
      <button onClick={() => analyze(0)} disabled={!canAnalyze} style={{
        width: '100%', padding: 16, borderRadius: 12, border: 'none',
        background: canAnalyze ? 'var(--brand)' : 'var(--border)',
        color: canAnalyze ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: 17,
        cursor: canAnalyze ? 'pointer' : 'not-allowed', transition: 'all 0.2s', letterSpacing: '-0.3px',
      }}>
        {loading ? '⏳ AI 分析中...' : '🔍 開始分析 → 生成策略建議書'}
      </button>

      {/* 重試提示 */}
      {retryInfo && (
        <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 10, padding: '12px 16px', color: 'var(--amber)', fontSize: 13 }}>
          ⏳ {retryInfo}
        </div>
      )}

      {/* 錯誤 */}
      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 8px', color: 'var(--red)', fontSize: 14, fontWeight: 700 }}>
            {error === '529_overloaded' ? '😅 AI 伺服器暫時過載' : '⚠️ 分析失敗'}
          </p>
          <p style={{ margin: '0 0 12px', color: 'var(--red)', fontSize: 12, lineHeight: 1.5 }}>
            {error === '529_overloaded' ? 'Anthropic 目前使用量過高，已自動重試 2 次。請稍後 30 秒再試。' : error}
          </p>
          <button onClick={() => analyze(0)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--red-bg)', color: 'var(--red)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🔄 重試</button>
        </div>
      )}

      {/* 歷史記錄 */}
      <HistoryPanel
        history={history}
        clearHistory={clearHistory}
        onRestore={data => { setResult(data); setError(null); }}
      />

      {/* 結果 */}
      {result && !result.error && <DMResult data={result} />}
      </>)}
    </div>
  );
}
