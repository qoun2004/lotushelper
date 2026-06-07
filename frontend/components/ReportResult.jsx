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

// ── 下載 PPTX 報告（亮色專業版）────────────────────────────────
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

  // ── 亮色專業配色 ──
  const PRIMARY   = '1E3A8A';   // 深海藍
  const ACCENT    = '2563EB';   // 亮藍（標題、圖表）
  const LIGHT_BG  = 'F8FAFC';   // 近白背景
  const CARD_BG   = 'EFF6FF';   // 淡藍卡片
  const WHITE     = 'FFFFFF';
  const DARK_TXT  = '1E293B';   // 深色文字
  const MID_TXT   = '475569';   // 次要文字
  const GREEN     = '16A34A';   // 成長綠
  const RED       = 'DC2626';   // 衰退紅
  const GOLD      = 'D97706';   // 行動金

  const pres = new window.PptxGenJS();
  pres.layout = 'LAYOUT_16x9';

  // ── helper：加頁首橫條 ──
  const addHeader = (slide, label) => {
    // 左側藍色實心條
    slide.addText('', { x: 0, y: 0, w: 0.18, h: 5.63, fill: { color: PRIMARY } });
    // 頂部橫條
    slide.addText('', { x: 0, y: 0, w: 10, h: 0.08, fill: { color: ACCENT } });
    // 頁首標題
    slide.addText(label, {
      x: 0.35, y: 0.14, w: 9.2, h: 0.42,
      fontSize: 18, bold: true, color: PRIMARY, fontFace: font,
    });
    // 分隔線
    slide.addText('', { x: 0.35, y: 0.62, w: 9.3, h: 0.025, fill: { color: 'BFDBFE' } });
  };

  // ────────────────────────────────────────────
  // Slide 1：封面
  // ────────────────────────────────────────────
  const s1 = pres.addSlide();
  s1.background = { color: PRIMARY };
  // 右側裝飾色塊
  s1.addText('', { x: 7.2, y: 0, w: 2.8, h: 5.63, fill: { color: ACCENT } });
  s1.addText('', { x: 8.5, y: 0, w: 1.5, h: 5.63, fill: { color: '1D4ED8' } });
  // 頂部橫條
  s1.addText('', { x: 0, y: 0, w: 10, h: 0.1, fill: { color: GOLD } });
  // 品牌 badge
  s1.addText('寵妻神器  CVS AI', {
    x: 0.6, y: 0.3, w: 5, h: 0.38,
    fontSize: 12, color: 'BFDBFE', fontFace: font,
  });
  // 主標題
  s1.addText(title, {
    x: 0.6, y: 0.85, w: 6.3, h: 1.1,
    fontSize: 32, bold: true, color: WHITE, fontFace: font,
    lineSpacingMultiple: 1.2,
  });
  // 大數字
  if (growth) {
    s1.addText(growth, {
      x: 0.6, y: 2.1, w: 5, h: 1.0,
      fontSize: 52, bold: true, color: isUp ? '4ADE80' : isDown ? 'FCA5A5' : 'FDE68A',
      fontFace: font,
    });
  }
  if (oneLine) {
    s1.addText(oneLine, {
      x: 0.6, y: 3.2, w: 6.2, h: 0.65,
      fontSize: 14, color: 'BFDBFE', fontFace: font, lineSpacingMultiple: 1.4,
    });
  }
  s1.addText(`分析期間：${period}`, {
    x: 0.6, y: 4.1, w: 5, h: 0.38,
    fontSize: 11, color: '93C5FD', fontFace: font,
  });
  s1.addText(`報告日期：${today}`, {
    x: 0.6, y: 4.5, w: 5, h: 0.35,
    fontSize: 11, color: '93C5FD', fontFace: font,
  });
  // 底部橫條
  s1.addText('', { x: 0, y: 5.53, w: 10, h: 0.1, fill: { color: GOLD } });

  // ────────────────────────────────────────────
  // Slide 2：KPI 指標卡片
  // ────────────────────────────────────────────
  const kpis = data.kpis || [];
  if (kpis.length > 0) {
    const s2 = pres.addSlide();
    s2.background = { color: LIGHT_BG };
    addHeader(s2, '📊  關鍵績效指標 KPI');
    const cols = kpis.length <= 2 ? kpis.length : 4;
    const cardW = (9.3 / cols) - 0.15;
    kpis.slice(0, 8).forEach((k, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 0.35 + col * (cardW + 0.15);
      const y = 0.85 + row * 1.65;
      const tColor = k.trend === 'up' ? GREEN : k.trend === 'down' ? RED : MID_TXT;
      const arrow   = k.trend === 'up' ? '▲ ' : k.trend === 'down' ? '▼ ' : '';
      // 卡片底色 + 左邊彩色邊線
      s2.addText('', { x, y, w: cardW, h: 1.45, fill: { color: WHITE },
        line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.08 });
      s2.addText('', { x, y, w: 0.06, h: 1.45,
        fill: { color: k.trend === 'up' ? GREEN : k.trend === 'down' ? RED : ACCENT } });
      // 文字
      s2.addText(k.label, { x: x + 0.12, y: y + 0.12, w: cardW - 0.18, h: 0.32,
        fontSize: 11, color: MID_TXT, fontFace: font });
      s2.addText(k.value, { x: x + 0.12, y: y + 0.45, w: cardW - 0.18, h: 0.55,
        fontSize: 22, bold: true, color: DARK_TXT, fontFace: font });
      s2.addText(arrow + (k.change || ''), { x: x + 0.12, y: y + 1.02, w: cardW - 0.18, h: 0.3,
        fontSize: 12, color: tColor, fontFace: font });
    });
    s2.addText(period, { x: 0.35, y: 5.25, w: 9.3, h: 0.28,
      fontSize: 10, color: MID_TXT, fontFace: font, align: 'right' });
  }

  // ────────────────────────────────────────────
  // Slide 3：長條圖（chart_data）
  // ────────────────────────────────────────────
  const bar = data.chart_data?.bar;
  if (bar?.labels?.length > 0) {
    const s3 = pres.addSlide();
    s3.background = { color: LIGHT_BG };
    addHeader(s3, '📈  品項業績對比');
    const chartData = [];
    if (bar.current?.length) chartData.push({ name: '本期', labels: bar.labels, values: bar.current.map(Number) });
    if (bar.previous?.length) chartData.push({ name: '前期', labels: bar.labels, values: bar.previous.map(Number) });
    s3.addChart(pres.ChartType.bar, chartData, {
      x: 0.35, y: 0.78, w: 9.3, h: 4.55,
      barGrouping: 'clustered',
      chartColors: [ACCENT, 'CBD5E1'],
      showValue: true, dataLabelFontSize: 9,
      dataLabelColor: DARK_TXT, dataLabelFontFace: font,
      catAxisLabelFontSize: 10, catAxisLabelColor: DARK_TXT, catAxisLabelFontFace: font,
      valAxisLabelFontSize: 10, valAxisLabelColor: MID_TXT,
      legendFontSize: 11, legendColor: DARK_TXT,
      showLegend: chartData.length > 1,
      legendPos: 't',
    });
  }

  // ────────────────────────────────────────────
  // Slide 4：成長亮點 vs 衰退品項
  // ────────────────────────────────────────────
  const hasGrowth  = (data.top_growth  || []).length > 0;
  const hasDecline = (data.top_decline || []).length > 0;
  if (hasGrowth || hasDecline) {
    const s4 = pres.addSlide();
    s4.background = { color: LIGHT_BG };
    addHeader(s4, '🚀  成長亮點  ·  ⚠️  衰退品項');
    // 分隔線
    s4.addText('', { x: 4.92, y: 0.7, w: 0.04, h: 4.7, fill: { color: 'CBD5E1' } });
    if (hasGrowth) {
      // 成長標題 badge
      s4.addText('▲ 成長亮點', { x: 0.35, y: 0.72, w: 4.35, h: 0.38,
        fontSize: 13, bold: true, color: WHITE, fontFace: font,
        fill: { color: GREEN }, rectRadius: 0.06 });
      (data.top_growth || []).slice(0, 5).forEach((g, i) => {
        const y = 1.22 + i * 0.78;
        s4.addText('', { x: 0.35, y, w: 4.35, h: 0.65,
          fill: { color: 'F0FDF4' }, line: { color: 'BBF7D0', width: 1 }, rectRadius: 0.06 });
        s4.addText(g.growth, { x: 0.42, y: y + 0.06, w: 0.7, h: 0.52,
          fontSize: 14, bold: true, color: GREEN, fontFace: font, align: 'center' });
        s4.addText(g.name, { x: 1.18, y: y + 0.04, w: 3.4, h: 0.3,
          fontSize: 12, bold: true, color: DARK_TXT, fontFace: font });
        if (g.note) s4.addText(g.note, { x: 1.18, y: y + 0.33, w: 3.4, h: 0.28,
          fontSize: 10, color: MID_TXT, fontFace: font });
      });
    }
    if (hasDecline) {
      s4.addText('▼ 衰退品項', { x: 5.15, y: 0.72, w: 4.5, h: 0.38,
        fontSize: 13, bold: true, color: WHITE, fontFace: font,
        fill: { color: RED }, rectRadius: 0.06 });
      (data.top_decline || []).slice(0, 5).forEach((d, i) => {
        const y = 1.22 + i * 0.78;
        s4.addText('', { x: 5.15, y, w: 4.5, h: 0.65,
          fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 }, rectRadius: 0.06 });
        s4.addText(d.decline, { x: 5.22, y: y + 0.06, w: 0.7, h: 0.52,
          fontSize: 14, bold: true, color: RED, fontFace: font, align: 'center' });
        s4.addText(d.name, { x: 5.98, y: y + 0.04, w: 3.5, h: 0.3,
          fontSize: 12, bold: true, color: DARK_TXT, fontFace: font });
        if (d.note) s4.addText(d.note, { x: 5.98, y: y + 0.33, w: 3.5, h: 0.28,
          fontSize: 10, color: MID_TXT, fontFace: font });
      });
    }
  }

  // ────────────────────────────────────────────
  // Slide 5：深度分析
  // ────────────────────────────────────────────
  if (data.decline_reasons || data.market_trends) {
    const s5 = pres.addSlide();
    s5.background = { color: LIGHT_BG };
    addHeader(s5, '🔍  深度分析');
    let yPos = 0.78;
    if (data.decline_reasons) {
      s5.addText('衰退原因', { x: 0.35, y: yPos, w: 9.3, h: 0.35,
        fontSize: 13, bold: true, color: WHITE, fontFace: font,
        fill: { color: RED }, rectRadius: 0.05 });
      s5.addText(data.decline_reasons, { x: 0.35, y: yPos + 0.4, w: 9.3, h: 1.55,
        fontSize: 11, color: DARK_TXT, fontFace: font, valign: 'top',
        lineSpacingMultiple: 1.45, fill: { color: 'FEF2F2' }, rectRadius: 0.05 });
      yPos += 2.1;
    }
    if (data.market_trends) {
      s5.addText('市場趨勢', { x: 0.35, y: yPos, w: 9.3, h: 0.35,
        fontSize: 13, bold: true, color: WHITE, fontFace: font,
        fill: { color: ACCENT }, rectRadius: 0.05 });
      s5.addText(data.market_trends, { x: 0.35, y: yPos + 0.4, w: 9.3, h: 1.55,
        fontSize: 11, color: DARK_TXT, fontFace: font, valign: 'top',
        lineSpacingMultiple: 1.45, fill: { color: CARD_BG }, rectRadius: 0.05 });
    }
  }

  // ────────────────────────────────────────────
  // Slide 6：策略 & 行動清單
  // ────────────────────────────────────────────
  if (data.strategy || data.action_items?.length) {
    const s6 = pres.addSlide();
    s6.background = { color: LIGHT_BG };
    addHeader(s6, '🎯  今年策略  ·  行動清單');
    let yPos = 0.78;
    if (data.strategy) {
      s6.addText('策略方向', { x: 0.35, y: yPos, w: 9.3, h: 0.35,
        fontSize: 13, bold: true, color: WHITE, fontFace: font,
        fill: { color: ACCENT }, rectRadius: 0.05 });
      s6.addText(data.strategy, { x: 0.35, y: yPos + 0.4, w: 9.3, h: 1.55,
        fontSize: 11, color: DARK_TXT, fontFace: font, valign: 'top',
        lineSpacingMultiple: 1.45, fill: { color: CARD_BG }, rectRadius: 0.05 });
      yPos += 2.12;
    }
    if (data.action_items?.length) {
      s6.addText('⚡ 立即行動', { x: 0.35, y: yPos, w: 9.3, h: 0.35,
        fontSize: 13, bold: true, color: WHITE, fontFace: font,
        fill: { color: GOLD }, rectRadius: 0.05 });
      data.action_items.slice(0, 5).forEach((a, i) => {
        const y = yPos + 0.42 + i * 0.42;
        s6.addText(`${i + 1}`, { x: 0.35, y, w: 0.3, h: 0.35,
          fontSize: 12, bold: true, color: WHITE, fontFace: font,
          fill: { color: ACCENT }, align: 'center', rectRadius: 0.04 });
        s6.addText(a.replace(/^[•\d\.\s]+/, ''), { x: 0.72, y, w: 8.9, h: 0.35,
          fontSize: 11, color: DARK_TXT, fontFace: font, valign: 'middle',
          fill: { color: i % 2 === 0 ? WHITE : LIGHT_BG } });
      });
    }
  }

  // ────────────────────────────────────────────
  // Slide 7：完整報告草稿
  // ────────────────────────────────────────────
  if (data.report_text) {
    const s7 = pres.addSlide();
    s7.background = { color: LIGHT_BG };
    addHeader(s7, '📝  完整報告草稿');
    s7.addText(data.report_text, {
      x: 0.35, y: 0.78, w: 9.3, h: 4.6,
      fontSize: 10.5, color: DARK_TXT, fontFace: font,
      valign: 'top', lineSpacingMultiple: 1.5,
      fill: { color: WHITE }, rectRadius: 0.05,
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
