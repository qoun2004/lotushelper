'use client';
import { useState, useEffect, useRef } from 'react';

// ── 簡易 Bar Chart（純 SVG，不需外部套件）──────────────────────
function BarChart({ data }) {
  if (!data?.bar?.labels?.length) return null;
  const { labels, current = [], previous = [] } = data.bar;
  const allVals = [...current, ...previous].filter(Boolean);
  const max = Math.max(...allVals, 1);
  const H = 140, barW = 18, gap = 8, groupGap = 24;
  const groupW = barW * 2 + gap + groupGap;
  const totalW = Math.max(labels.length * groupW + 40, 300);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={totalW} height={H + 50} style={{ display: 'block' }}>
        {labels.map((label, i) => {
          const x = 20 + i * groupW;
          const cH = Math.round((current[i] / max) * H) || 4;
          const pH = Math.round((previous[i] / max) * H) || 4;
          return (
            <g key={i}>
              {/* 前期 bar */}
              <rect x={x} y={H - pH} width={barW} height={pH} rx={3} fill="var(--text-muted)" opacity={0.7} />
              {/* 當期 bar */}
              <rect x={x + barW + gap} y={H - cH} width={barW} height={cH} rx={3}
                fill={current[i] >= (previous[i] || 0) ? 'var(--brand)' : 'var(--red)'} />
              {/* label */}
              <text x={x + barW + gap / 2} y={H + 14} textAnchor="middle" fontSize={10} fill="var(--text-2)">
                {label.length > 6 ? label.slice(0, 6) + '…' : label}
              </text>
              {/* 當期數值 */}
              {cH > 16 && (
                <text x={x + barW * 1.5 + gap} y={H - cH - 4} textAnchor="middle" fontSize={9} fill="var(--brand)">
                  {current[i]}
                </text>
              )}
            </g>
          );
        })}
        {/* 基線 */}
        <line x1={16} y1={H} x2={totalW - 10} y2={H} stroke="var(--border)" strokeWidth={1} />
      </svg>
      {/* 圖例 */}
      <div style={{ display: 'flex', gap: 16, paddingLeft: 20, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--text-muted)', borderRadius: 2 }} />前期
        </span>
        <span style={{ fontSize: 11, color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--brand)', borderRadius: 2 }} />當期
        </span>
      </div>
    </div>
  );
}

// ── 成長/衰退條列 ──────────────────────────────────────────────
function RankList({ items, type }) {
  const isGrowth = type === 'growth';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {(items || []).map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
          background: 'var(--bg)', borderRadius: 8,
          borderLeft: `3px solid ${isGrowth ? 'var(--green)' : 'var(--red)'}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isGrowth ? 'var(--green)' : 'var(--red)', minWidth: 44, flexShrink: 0 }}>
            {isGrowth ? item.growth : item.decline}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.name}</p>
            {item.note && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4 }}>{item.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 策略行動項目 ───────────────────────────────────────────────
function ActionList({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {(items || []).map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
          <span style={{
            minWidth: 22, height: 22, borderRadius: '50%', background: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>{i + 1}</span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

// ── 產生純文字版全部內容 ────────────────────────────────────────
function buildFullText(data, templateName) {
  const lines = [];
  const sep = '═'.repeat(40);
  lines.push(sep);
  lines.push(`【${templateName || '銷售分析報告'}】`);
  lines.push(`分析期間：${data.overview?.period || ''}`);
  lines.push(`整體表現：${data.overview?.total_growth || ''}`);
  lines.push(data.overview?.one_line || '');
  lines.push('');

  if (data.kpis?.length) {
    lines.push('▌ 關鍵指標');
    data.kpis.forEach(k => lines.push(`  • ${k.label}：${k.value}  ${k.change}`));
    lines.push('');
  }

  if (data.top_growth?.length) {
    lines.push('▌ 成長亮點');
    data.top_growth.forEach(g => lines.push(`  ↑ ${g.growth}  ${g.name}  ${g.note || ''}`));
    lines.push('');
  }

  if (data.top_decline?.length) {
    lines.push('▌ 衰退品項');
    data.top_decline.forEach(d => lines.push(`  ↓ ${d.decline}  ${d.name}  ${d.note || ''}`));
    lines.push('');
  }

  if (data.decline_reasons) {
    lines.push('▌ 衰退原因分析');
    lines.push(data.decline_reasons);
    lines.push('');
  }

  if (data.market_trends) {
    lines.push('▌ 市場趨勢');
    lines.push(data.market_trends);
    lines.push('');
  }

  if (data.strategy) {
    lines.push('▌ 今年策略規劃');
    lines.push(data.strategy);
    lines.push('');
  }

  if (data.action_items?.length) {
    lines.push('▌ 行動清單');
    data.action_items.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
    lines.push('');
  }

  if (data.report_text) {
    lines.push('▌ 完整週報');
    lines.push(data.report_text);
  }

  lines.push(sep);
  return lines.join('\n');
}

// ── 下載 PPTX 報告 ──────────────────────────────────────────────
async function downloadPPTX(data, templateName) {
  if (typeof window === 'undefined' || !window.PptxGenJS) {
    alert('PPT 函式庫載入中，請稍後再試（約 2 秒）');
    return;
  }
  const title = templateName || '銷售分析報告';
  const period = data.overview?.period || '';
  const growth = data.overview?.total_growth || '';
  const oneLine = data.overview?.one_line || '';
  const isUp = data.overview?.trend === 'up';
  const isDown = data.overview?.trend === 'down';
  const today = new Date().toLocaleDateString('zh-TW');
  const font = '微軟正黑體';
  const PRIMARY = '6366F1';
  const GREEN = '4ADE80';
  const RED = 'F87171';
  const DARK = '0F172A';
  const CARD = '1E293B';

  const pres = new window.PptxGenJS();
  pres.layout = 'LAYOUT_16x9';

  // ────────────────────────────────────────────
  // Slide 1：封面
  // ────────────────────────────────────────────
  const s1 = pres.addSlide();
  s1.background = { color: DARK };
  // 頂部色條
  s1.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
  // 品牌名
  s1.addText('💫 寵妻神器 · CVS AI 分析', {
    x: 0.5, y: 0.35, w: 9, h: 0.4,
    fontSize: 12, color: '818CF8', fontFace: font,
  });
  // 報告標題
  s1.addText(title, {
    x: 0.5, y: 0.95, w: 9, h: 0.9,
    fontSize: 30, bold: true, color: 'F1F5F9', fontFace: font,
  });
  // 大數字
  if (growth) {
    s1.addText(growth, {
      x: 0.5, y: 1.95, w: 9, h: 1.0,
      fontSize: 48, bold: true, color: isUp ? GREEN : isDown ? RED : PRIMARY, fontFace: font,
    });
  }
  // 摘要一行
  if (oneLine) {
    s1.addText(oneLine, {
      x: 0.5, y: 3.1, w: 9, h: 0.55,
      fontSize: 15, color: '94A3B8', fontFace: font,
    });
  }
  // 分析期間 + 日期
  s1.addText(`${period}  ·  ${today}`, {
    x: 0.5, y: 4.0, w: 9, h: 0.4,
    fontSize: 11, color: '475569', fontFace: font,
  });
  // 底部色條
  s1.addText('', { x: 0, y: 5.52, w: 10, h: 0.1, fill: { color: PRIMARY } });

  // ────────────────────────────────────────────
  // Slide 2：KPI 指標卡片
  // ────────────────────────────────────────────
  const kpis = data.kpis || [];
  if (kpis.length > 0) {
    const s2 = pres.addSlide();
    s2.background = { color: DARK };
    s2.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s2.addText('📊 關鍵指標', {
      x: 0.4, y: 0.15, w: 9.2, h: 0.5,
      fontSize: 20, bold: true, color: '818CF8', fontFace: font,
    });
    const cols = kpis.length <= 2 ? kpis.length : 4;
    const cardW = (9.2 / cols) - 0.15;
    kpis.slice(0, 8).forEach((k, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 0.4 + col * (cardW + 0.15);
      const y = 0.85 + row * 1.55;
      const tColor = k.trend === 'up' ? GREEN : k.trend === 'down' ? RED : '94A3B8';
      s2.addText([
        { text: k.label + '\n', options: { fontSize: 11, color: '64748B', fontFace: font } },
        { text: k.value + '\n', options: { fontSize: 22, bold: true, color: 'F1F5F9', fontFace: font } },
        { text: (k.trend === 'up' ? '↑ ' : k.trend === 'down' ? '↓ ' : '') + k.change, options: { fontSize: 12, color: tColor, fontFace: font } },
      ], {
        x, y, w: cardW, h: 1.35,
        fill: { color: CARD }, rectRadius: 0.1,
        valign: 'middle', align: 'center', inset: 0.1,
      });
    });
    s2.addText(`${period}`, { x: 0.4, y: 5.28, w: 9.2, h: 0.28, fontSize: 10, color: '475569', fontFace: font });
  }

  // ────────────────────────────────────────────
  // Slide 3：成長亮點 vs 衰退品項
  // ────────────────────────────────────────────
  const hasGrowth = (data.top_growth || []).length > 0;
  const hasDecline = (data.top_decline || []).length > 0;
  if (hasGrowth || hasDecline) {
    const s3 = pres.addSlide();
    s3.background = { color: DARK };
    s3.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s3.addText('📈 成長 vs 衰退', {
      x: 0.4, y: 0.15, w: 9.2, h: 0.5,
      fontSize: 20, bold: true, color: '818CF8', fontFace: font,
    });
    // 成長欄
    if (hasGrowth) {
      s3.addText('🚀 成長亮點', { x: 0.4, y: 0.8, w: 4.3, h: 0.4, fontSize: 13, bold: true, color: GREEN, fontFace: font });
      const rows = (data.top_growth || []).slice(0, 6).map(g => ({
        text: `${g.growth}  ${g.name}${g.note ? '\n  ' + g.note : ''}`,
        options: { bullet: { indent: 8 }, paraSpaceAfter: 4 },
      }));
      s3.addText(rows, { x: 0.4, y: 1.25, w: 4.3, h: 3.8, fontSize: 12, color: 'CBD5E1', fontFace: font, valign: 'top' });
    }
    // 衰退欄
    if (hasDecline) {
      s3.addText('⚠️ 衰退品項', { x: 5.3, y: 0.8, w: 4.3, h: 0.4, fontSize: 13, bold: true, color: RED, fontFace: font });
      const rows = (data.top_decline || []).slice(0, 6).map(d => ({
        text: `${d.decline}  ${d.name}${d.note ? '\n  ' + d.note : ''}`,
        options: { bullet: { indent: 8 }, paraSpaceAfter: 4 },
      }));
      s3.addText(rows, { x: 5.3, y: 1.25, w: 4.3, h: 3.8, fontSize: 12, color: 'CBD5E1', fontFace: font, valign: 'top' });
    }
    // 分隔線
    s3.addText('', { x: 4.9, y: 0.8, w: 0.03, h: 4.0, fill: { color: '334155' } });
  }

  // ────────────────────────────────────────────
  // Slide 4：衰退原因 & 市場趨勢（若有）
  // ────────────────────────────────────────────
  if (data.decline_reasons || data.market_trends) {
    const s4 = pres.addSlide();
    s4.background = { color: DARK };
    s4.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s4.addText('🔍 深度分析', {
      x: 0.4, y: 0.15, w: 9.2, h: 0.5,
      fontSize: 20, bold: true, color: '818CF8', fontFace: font,
    });
    let yPos = 0.85;
    if (data.decline_reasons) {
      s4.addText('衰退原因分析', { x: 0.4, y: yPos, w: 9.2, h: 0.38, fontSize: 13, bold: true, color: RED, fontFace: font });
      s4.addText(data.decline_reasons, { x: 0.4, y: yPos + 0.4, w: 9.2, h: 1.6, fontSize: 12, color: 'CBD5E1', fontFace: font, valign: 'top', lineSpacingMultiple: 1.4 });
      yPos += 2.2;
    }
    if (data.market_trends) {
      s4.addText('市場趨勢', { x: 0.4, y: yPos, w: 9.2, h: 0.38, fontSize: 13, bold: true, color: '818CF8', fontFace: font });
      s4.addText(data.market_trends, { x: 0.4, y: yPos + 0.4, w: 9.2, h: 1.6, fontSize: 12, color: 'CBD5E1', fontFace: font, valign: 'top', lineSpacingMultiple: 1.4 });
    }
  }

  // ────────────────────────────────────────────
  // Slide 5：策略 & 行動清單
  // ────────────────────────────────────────────
  if (data.strategy || data.action_items?.length) {
    const s5 = pres.addSlide();
    s5.background = { color: DARK };
    s5.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s5.addText('🎯 策略 & 行動清單', {
      x: 0.4, y: 0.15, w: 9.2, h: 0.5,
      fontSize: 20, bold: true, color: '818CF8', fontFace: font,
    });
    let yPos = 0.85;
    if (data.strategy) {
      s5.addText('今年策略規劃', { x: 0.4, y: yPos, w: 9.2, h: 0.38, fontSize: 13, bold: true, color: '818CF8', fontFace: font });
      s5.addText(data.strategy, { x: 0.4, y: yPos + 0.4, w: 9.2, h: 1.5, fontSize: 12, color: 'CBD5E1', fontFace: font, valign: 'top', lineSpacingMultiple: 1.4 });
      yPos += 2.1;
    }
    if (data.action_items?.length) {
      s5.addText('⚡ 行動清單', { x: 0.4, y: yPos, w: 9.2, h: 0.38, fontSize: 13, bold: true, color: 'FBBF24', fontFace: font });
      const rows = (data.action_items || []).slice(0, 6).map((a, i) => ({
        text: `${i + 1}.  ${a}`,
        options: { paraSpaceAfter: 6 },
      }));
      s5.addText(rows, { x: 0.4, y: yPos + 0.45, w: 9.2, h: 2.4, fontSize: 12, color: 'CBD5E1', fontFace: font, valign: 'top' });
    }
  }

  // ────────────────────────────────────────────
  // Slide 6：完整週報文字稿（若有）
  // ────────────────────────────────────────────
  if (data.report_text) {
    const s6 = pres.addSlide();
    s6.background = { color: DARK };
    s6.addText('', { x: 0, y: 0, w: 10, h: 0.06, fill: { color: PRIMARY } });
    s6.addText('📝 完整報告草稿', {
      x: 0.4, y: 0.15, w: 9.2, h: 0.5,
      fontSize: 20, bold: true, color: '818CF8', fontFace: font,
    });
    s6.addText(data.report_text, {
      x: 0.4, y: 0.85, w: 9.2, h: 4.5,
      fontSize: 11, color: 'CBD5E1', fontFace: font,
      valign: 'top', lineSpacingMultiple: 1.5,
    });
  }

  await pres.writeFile({ fileName: `${title}_${today.replace(/\//g, '-')}.pptx` });
}

// ── 主要報告元件 ───────────────────────────────────────────────
export default function ReportResult({ data, templateName }) {
  const [activeTab, setActiveTab] = useState('analysis');
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyReport = () => {
    navigator.clipboard.writeText(data.report_text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(buildFullText(data, templateName));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const [pptLoading, setPptLoading] = useState(false);
  const downloadPpt = async () => {
    setPptLoading(true);
    try { await downloadPPTX(data, templateName); }
    finally { setPptLoading(false); }
  };

  if (!data) return null;

  const trendColor = data.overview?.trend === 'up' ? 'var(--green)' : data.overview?.trend === 'down' ? 'var(--red)' : 'var(--text)';

  const TABS = [
    { key: 'analysis', label: '📊 分析總覽' },
    { key: 'strategy', label: '🎯 策略建議' },
    { key: 'report', label: '📝 完整週報' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── 一鍵匯出列 ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={copyAll} style={{
          flex: 1, padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          background: copiedAll ? 'var(--green)' : 'var(--brand)',
          color: copiedAll ? 'var(--bg)' : '#fff', transition: 'all 0.2s',
        }}>
          {copiedAll ? '✓ 已複製全部！' : '📋 複製全部分析'}
        </button>
        <button onClick={downloadPpt} disabled={pptLoading} style={{
          flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--brand-border)', cursor: pptLoading ? 'wait' : 'pointer',
          background: pptLoading ? 'var(--border)' : 'var(--bg-2)', color: pptLoading ? 'var(--text-2)' : 'var(--brand)',
          fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
        }}>
          {pptLoading ? '⏳ 生成中...' : '📊 下載 PPT'}
        </button>
      </div>

      {/* ── 總覽 Banner ── */}
      <div style={{
        background: 'var(--brand-bg)',
        border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-2)' }}>{data.overview?.period || templateName}</p>
            <p style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: trendColor }}>
              {data.overview?.total_growth || '—'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{data.overview?.one_line}</p>
          </div>
          <span style={{ fontSize: 36 }}>{data.overview?.trend === 'up' ? '📈' : data.overview?.trend === 'down' ? '📉' : '📊'}</span>
        </div>
      </div>

      {/* ── KPI 卡片 ── */}
      {data.kpis?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {data.kpis.map((kpi, i) => (
            <div key={i} style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--text-2)' }}>{kpi.label}</p>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{kpi.value}</p>
              <p style={{ margin: 0, fontSize: 11, color: kpi.trend === 'up' ? 'var(--green)' : kpi.trend === 'down' ? 'var(--red)' : 'var(--text-muted)' }}>
                {kpi.trend === 'up' ? '↑ ' : kpi.trend === 'down' ? '↓ ' : ''}{kpi.change}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── 分頁 ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', borderRadius: 8, fontSize: 12,
            background: activeTab === t.key ? 'var(--brand)' : 'var(--bg-2)',
            color: activeTab === t.key ? '#fff' : 'var(--text-2)', fontWeight: activeTab === t.key ? 700 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── 分析總覽 Tab ── */}
      {activeTab === 'analysis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 圖表 */}
          {data.chart_data?.bar?.labels?.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--brand)' }}>📊 銷售對比圖</h3>
              <BarChart data={data.chart_data} />
            </div>
          )}

          {/* 成長/衰退並排 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {data.top_growth?.length > 0 && (
              <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--green)' }}>🚀 成長亮點</h3>
                <RankList items={data.top_growth} type="growth" />
              </div>
            )}
            {data.top_decline?.length > 0 && (
              <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--red)' }}>⚠️ 衰退品項</h3>
                <RankList items={data.top_decline} type="decline" />
              </div>
            )}
          </div>

          {/* 衰退原因 */}
          {data.decline_reasons && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--red)' }}>🔍 衰退原因分析</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{data.decline_reasons}</p>
            </div>
          )}

          {/* 市場趨勢 */}
          {data.market_trends && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--brand)' }}>🌍 市場趨勢</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{data.market_trends}</p>
            </div>
          )}
        </div>
      )}

      {/* ── 策略建議 Tab ── */}
      {activeTab === 'strategy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.strategy && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--brand)' }}>🎯 今年策略規劃</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>{data.strategy}</p>
            </div>
          )}
          {data.action_items?.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--brand)' }}>⚡ 行動清單</h3>
              <ActionList items={data.action_items} />
            </div>
          )}
        </div>
      )}

      {/* ── 完整週報 Tab ── */}
      {activeTab === 'report' && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--brand)' }}>📝 完整報告草稿</h3>
            <button onClick={copyReport} style={{
              padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer',
              background: copied ? 'var(--green)' : 'transparent', color: copied ? 'var(--bg)' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600,
            }}>{copied ? '✓ 已複製' : '複製全文'}</button>
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, fontFamily: 'inherit' }}>
            {data.report_text || '（報告生成中）'}
          </pre>
        </div>
      )}
    </div>
  );
}
