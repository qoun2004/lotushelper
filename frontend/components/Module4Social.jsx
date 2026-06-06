'use client';
import { useState } from 'react';
import VoiceBtn from './VoiceBtn';
import HistoryPanel from './HistoryPanel';
import ModuleHero from './ModuleHero';
import useHistory from '../hooks/useHistory';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PLATFORMS = [
  { key: 'threads', label: 'Threads', icon: '🧵', color: '#a855f7' },
  { key: 'dcard',   label: 'Dcard',   icon: '💬', color: '#3b82f6' },
  { key: 'ig',      label: 'IG',      icon: '📸', color: '#ec4899' },
  { key: 'line',    label: 'LINE',    icon: '💚', color: '#22c55e' },
];
const TONES = ['親切自然', '幽默搞笑', '感性真誠', '精簡犀利'];

const VIRAL_FORMATS = [
  { key: 'contrast',     icon: '🔄', label: '你以為 vs 真相',    desc: '打破期待，反差製造共鳴' },
  { key: 'identity',     icon: '🙋', label: '身為 XXX 只用這個', desc: '身份認同，引發自我投射' },
  { key: 'correction',   icon: '💡', label: '這樣用才對！',       desc: '糾錯型，讓人好奇點進看' },
  { key: 'before_after', icon: '⏰', label: '試用 30 天後...',    desc: '時間對比，真實感最強' },
  { key: 'list',         icon: '📋', label: '3 個不後悔的理由',   desc: '條列清單，乾淨易轉發' },
  { key: 'emotion',      icon: '🎢', label: '昨天崩潰今天治癒',   desc: '情緒轉折，職場媽媽最有感' },
  { key: 'authentic',    icon: '🚫', label: '不是業配但真的愛',   desc: '反業配感，信任感最高' },
  { key: 'child',        icon: '👧', label: '孩子說了一句話...',   desc: '以孩子視角切入，秒打心' },
  // 台灣特有格式
  { key: 'review',       icon: '⭐', label: '蝦皮 5 星好評型',   desc: '消費者留評口吻，真實感爆棚' },
  { key: 'ptt',          icon: '💻', label: 'PTT / 開箱型',      desc: '鄉民風格，接地氣口碑感強' },
  { key: 'mom_tip',      icon: '👩‍🍳', label: '媽媽私藏秘訣型',    desc: '生活智慧口吻，自然帶出商品' },
];

const MODES = [
  { key: 'free',    icon: '✨', label: '自由生成' },
  { key: 'dissect', icon: '🔬', label: '爆文解剖' },
  { key: 'trend',   icon: '📈', label: '趨勢跟風' },
  { key: 'format',  icon: '🎭', label: '格式套用' },
];

// ── ScriptPanel ─────────────────────────────────────────────────────
function ScriptPanel({ copy, product }) {
  const [script, setScript]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/module4/script`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, copy_text: copy.text, style: copy.style, platform: copy.platform }),
      });
      const data = await res.json();
      if (data.scenes) setScript(data);
    } finally { setLoading(false); }
  };

  const fullScript = script ? [
    `🎬 ${script.duration} 短影音腳本`, '',
    `🪝 開場勾子：${script.hook}`, '',
    ...(script.scenes || []).map(s => `⏱ ${s.time}\n畫面：${s.visual}\n字幕：${s.caption}\n動作：${s.action}`),
    '', `🎵 背景音樂：${script.bgm}`,
    `🎒 準備道具：${(script.props || []).join('、')}`,
    `💡 成功關鍵：${script.tip}`,
  ].join('\n') : '';

  const copyScript = () => {
    navigator.clipboard.writeText(fullScript).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (!script && !loading) return (
    <button onClick={generate} style={{ width: '100%', padding: '10px', borderRadius: 8, marginTop: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📱 生成 15 秒短影音腳本</button>
  );
  if (loading) return <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--brand)', fontSize: 12 }}>🎬 導演思考中...</div>;

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginTop: 4, border: '1px solid var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>🎬 {script.duration} 短影音腳本</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={copyScript} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${copied ? 'var(--green-border)' : 'var(--border)'}`, background: copied ? 'var(--green-bg)' : 'transparent', color: copied ? 'var(--green)' : 'var(--text-2)', cursor: 'pointer', fontSize: 11 }}>{copied ? '✓ 已複製' : '複製腳本'}</button>
          <button onClick={() => setScript(null)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>重生成</button>
        </div>
      </div>
      <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--amber)', fontWeight: 700 }}>🪝 前3秒勾子</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--amber)' }}>{script.hook}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {(script.scenes || []).map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--brand)', background: 'var(--blue-bg)', padding: '2px 6px', borderRadius: 4, flexShrink: 0, height: 'fit-content', marginTop: 1 }}>{s.time}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--text-2)' }}>📷 {s.visual}</p>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--amber)' }}>💬 「{s.caption}」</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)' }}>🎬 {s.action}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>🎵 <strong>BGM：</strong>{script.bgm}</p>
        {script.props?.length > 0 && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>🎒 <strong>準備：</strong>{script.props.join('、')}</p>}
        <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 7, padding: '6px 10px' }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--green)' }}>💡 {script.tip}</p>
        </div>
      </div>
    </div>
  );
}

// ── CopyCard ────────────────────────────────────────────────────────
function CopyCard({ copy, index, product }) {
  const [copied, setCopied]       = useState(false);
  const [showScript, setShowScript] = useState(false);
  const charCount = (copy.text || '').length;
  const handle = () => {
    navigator.clipboard.writeText((copy.text || '') + '\n\n' + (copy.tags || '')).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ padding: '10px 14px', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'var(--brand)', borderRadius: 6, padding: '2px 8px' }}>#{index + 1}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-dark)' }}>{copy.style || `版本 ${index + 1}`}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>建議：{copy.platform}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{copy.text}</p>
        {copy.tags && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--brand)', lineHeight: 1.6 }}>{copy.tags}</p>}
        {copy.tip && (
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--amber)' }}>💡 文案技巧：{copy.tip}</p>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{charCount} 字</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowScript(s => !s)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${showScript ? 'var(--amber-border)' : 'var(--border)'}`, background: showScript ? 'var(--amber-bg)' : 'transparent', color: showScript ? 'var(--amber)' : 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>📱 腳本</button>
          <button onClick={handle} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${copied ? 'var(--green-border)' : 'var(--brand-border)'}`, background: copied ? 'var(--green-bg)' : 'var(--brand-bg)', color: copied ? 'var(--green)' : 'var(--brand-dark)', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }}>{copied ? '✓ 已複製！' : '📋 複製'}</button>
        </div>
        {showScript && <ScriptPanel copy={copy} product={product} />}
      </div>
    </div>
  );
}

// ── AnalysisCard（爆文解剖結果）─────────────────────────────────────
function AnalysisCard({ analysis }) {
  return (
    <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 12, padding: 16 }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: 'var(--amber)' }}>🔬 爆文 DNA 解析</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: '🪝 開場公式', value: analysis.hook_formula },
          { label: '💥 情緒觸發', value: analysis.emotion_trigger },
          { label: '📐 敘事結構', value: analysis.structure },
          { label: '✨ 關鍵句型', value: analysis.key_phrase },
        ].map(({ label, value }) => value && (
          <div key={label} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', flexShrink: 0, minWidth: 70 }}>{label}</span>
            <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>{value}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, background: 'var(--amber)', borderRadius: 8, padding: '8px 12px' }}>
        <p style={{ margin: 0, fontSize: 11, color: '#fff', fontWeight: 700 }}>以下 3 組文案已套用上述公式改寫你的商品 👇</p>
      </div>
    </div>
  );
}

// ── PlatformTonePicker（共用子元件）─────────────────────────────────
function PlatformTonePicker({ platforms, setPlatforms, tone, setTone }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>發布平台</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <button key={p.key} onClick={() => setPlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))} style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${platforms[p.key] ? p.color : 'var(--border)'}`, background: platforms[p.key] ? `${p.color}18` : 'var(--bg)', color: platforms[p.key] ? p.color : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: platforms[p.key] ? 700 : 400 }}>{p.icon} {p.label}</button>
          ))}
        </div>
      </div>
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>文案語氣</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TONES.map(t => (
            <button key={t} onClick={() => setTone(t)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${tone === t ? 'var(--amber-border)' : 'var(--border)'}`, background: tone === t ? 'var(--amber-bg)' : 'var(--bg)', color: tone === t ? 'var(--amber)' : 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontWeight: tone === t ? 700 : 400 }}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TrendChips（共用：顯示今日熱門話題）─────────────────────────────
function TrendChips({ trends, trendsLoading, fetchTrends, onSelect, selected }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: trends?.topics?.length ? 10 : 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--text-2)' }}>🔥 今日熱門話題</p>
        <button onClick={fetchTrends} disabled={trendsLoading} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--brand)', cursor: 'pointer', fontSize: 12 }}>{trendsLoading ? '⏳' : '🔄 更新'}</button>
      </div>
      {trends?.topics?.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {trends.topics.map((t, i) => (
            <span key={i} onClick={() => onSelect(t.keyword)} style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
              border: `1.5px solid ${selected === t.keyword ? 'var(--amber-border)' : 'var(--border)'}`,
              background: selected === t.keyword ? 'var(--amber-bg)' : 'var(--bg)',
              color: selected === t.keyword ? 'var(--amber)' : 'var(--text-2)',
              fontWeight: selected === t.keyword ? 700 : 400,
            }}>#{t.keyword} <span style={{ fontSize: 11 }}>{t.heat}</span></span>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>點「更新」取得今日熱門話題，點選後快速填入</p>
      )}
    </div>
  );
}

// ── ProductUrlCard（讀取商品網址後的資訊卡）────────────────────────
function ProductUrlCard({ info, onUse, onClear }) {
  const [open, setOpen] = useState(true);
  if (!info) return null;
  return (
    <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: open ? 10 : 0 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>
            ✅ 已讀取商品資訊
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{info.url}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 10, flexShrink: 0 }}>
          <button onClick={() => setOpen(o => !o)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--green-border)', background: 'transparent', color: 'var(--green)', cursor: 'pointer', fontSize: 11 }}>{open ? '收合' : '展開'}</button>
          <button onClick={onClear} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>清除</button>
        </div>
      </div>
      {open && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
            {info.name && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{info.name}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {info.price && <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>💰 {info.price}</span>}
              {info.deadline && <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>⏰ 截止：{info.deadline}</span>}
            </div>
            {info.description && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{info.description}</p>}
            {info.highlights?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {info.highlights.map((h, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green)' }}>✓ {h}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={onUse} style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            📋 套用商品資訊 → 自動填入生成欄位
          </button>
        </>
      )}
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────────────
export default function Module4Social() {
  const [mode, setMode]       = useState('free');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [results, setResults] = useState(null); // { copies: [], analysis?: {} }
  const { history, addHistory, clearHistory } = useHistory('module4');

  // 商品網址讀取
  const [urlInput, setUrlInput]       = useState('');
  const [urlLoading, setUrlLoading]   = useState(false);
  const [urlError, setUrlError]       = useState('');
  const [productInfo, setProductInfo] = useState(null); // 讀取結果

  // 共用：今日熱門話題
  const [trends, setTrends]               = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // 模式一：自由生成
  const [product, setProduct]     = useState('');
  const [platforms, setPlatforms] = useState({ threads: true, dcard: true, ig: false, line: false });
  const [tone, setTone]           = useState('親切自然');

  // 模式二：爆文解剖
  const [viralText, setViralText]           = useState('');
  const [dissectProduct, setDissectProduct] = useState('');

  // 模式三：趨勢跟風
  const [trendTopic, setTrendTopic]         = useState('');
  const [trendProduct, setTrendProduct]     = useState('');
  const [trendPlatforms, setTrendPlatforms] = useState({ threads: true, dcard: true, ig: false, line: false });
  const [trendTone, setTrendTone]           = useState('親切自然');

  // 模式四：格式套用
  const [selFormat, setSelFormat]             = useState(null);
  const [formatProduct, setFormatProduct]     = useState('');
  const [formatPlatforms, setFormatPlatforms] = useState({ threads: true, dcard: true, ig: false, line: false });

  const fetchTrends = async () => {
    setTrendsLoading(true);
    try {
      const res  = await fetch(`${API}/api/module4/trends`);
      const data = await res.json();
      setTrends(data);
    } catch { setTrends({ topics: [] }); }
    finally { setTrendsLoading(false); }
  };

  const readUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true); setUrlError('');
    try {
      const res  = await fetch(`${API}/api/module4/read_url`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (data.error) { setUrlError(data.error); return; }
      setProductInfo(data);
    } catch (e) {
      setUrlError('讀取失敗，請確認網址可以正常開啟');
    } finally { setUrlLoading(false); }
  };

  // 將商品資訊格式化為文字，塞進商品輸入欄
  const buildProductText = (info) => {
    const parts = [info.name || ''];
    if (info.price)    parts.push(`售價 ${info.price}`);
    if (info.deadline) parts.push(`預購截止 ${info.deadline}`);
    if (info.highlights?.length) parts.push(info.highlights.join('、'));
    if (info.cta)      parts.push(info.cta);
    return parts.filter(Boolean).join('｜');
  };

  const applyProductInfo = () => {
    if (!productInfo) return;
    const text = buildProductText(productInfo);
    setProduct(text);
    setDissectProduct(text);
    setTrendProduct(text);
    setFormatProduct(text);
  };

  const callAPI = async (endpoint, body, label) => {
    setLoading(true); setError(null); setResults(null);
    try {
      const res  = await fetch(`${API}/api/module4/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || res.statusText);
      setResults(data);
      addHistory({ label, summary: `${data.copies?.length || 0} 組文案 · ${mode}`, data });
    } catch (e) {
      const msg = e.message;
      if (msg === '529_overloaded') setError('😅 AI 伺服器暫時過載，請稍後 30 秒再試');
      else setError(msg);
    } finally { setLoading(false); }
  };

  const handleGenerate = () => {
    if (mode === 'free') {
      if (!product.trim()) return;
      callAPI('generate', { product, platforms, tone }, product);
    } else if (mode === 'dissect') {
      if (!viralText.trim() || !dissectProduct.trim()) return;
      callAPI('dissect', { viral_text: viralText, product: dissectProduct }, `解剖→${dissectProduct}`);
    } else if (mode === 'trend') {
      if (!trendTopic.trim() || !trendProduct.trim()) return;
      callAPI('trend_copy', { trend: trendTopic, product: trendProduct, platforms: trendPlatforms, tone: trendTone }, `${trendTopic}×${trendProduct}`);
    } else if (mode === 'format') {
      if (!selFormat || !formatProduct.trim()) return;
      callAPI('format_copy', { format_key: selFormat.key, format_label: selFormat.label, product: formatProduct, platforms: formatPlatforms }, `${selFormat.label}→${formatProduct}`);
    }
  };

  const canGenerate = () => {
    if (loading) return false;
    if (mode === 'free')    return !!product.trim();
    if (mode === 'dissect') return !!viralText.trim() && !!dissectProduct.trim();
    if (mode === 'trend')   return !!trendTopic.trim() && !!trendProduct.trim();
    if (mode === 'format')  return !!selFormat && !!formatProduct.trim();
    return false;
  };

  const btnLabel = () => {
    if (loading) {
      if (mode === 'dissect') return '🔬 AI 解剖中...';
      if (mode === 'trend')   return '📈 跟風出稿中...';
      if (mode === 'format')  return '🎭 套格式中...';
      return '✍️ AI 正在創作爆款文案...';
    }
    if (mode === 'dissect') return '🔬 解剖爆文 → 改寫成我的版本';
    if (mode === 'trend')   return '📈 跟風出 5 組文案';
    if (mode === 'format')  return '🎭 套格式生成 3 組文案';
    return '✨ 生成 5 組爆款文案';
  };

  // 傳給 ScriptPanel 的商品名稱（依模式）
  const currentProduct =
    mode === 'free'    ? product :
    mode === 'dissect' ? dissectProduct :
    mode === 'trend'   ? trendProduct :
    formatProduct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ModuleHero
        icon="📈"
        title="零預算社群口碑機"
        desc="4 種模式助你搭上爆紅浪潮：自由生成 / 爆文解剖 / 趨勢跟風 / 格式套用"
        steps={['選模式', '填入素材', 'AI 生成文案', '複製發布']}
      />

      {/* ── 商品頁面網址（選填）── */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
          🔗 商品頁面網址 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>（選填）— AI 自動讀取商品資訊</span>
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && readUrl()}
            placeholder="如：https://711go.7-11.com.tw/... 或任何電商商品頁"
            style={{ flex: 1, padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
          />
          <button onClick={readUrl} disabled={!urlInput.trim() || urlLoading} style={{
            padding: '10px 16px', borderRadius: 9, border: 'none', cursor: urlInput.trim() && !urlLoading ? 'pointer' : 'not-allowed',
            background: urlInput.trim() && !urlLoading ? 'var(--brand)' : 'var(--border)',
            color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>{urlLoading ? '讀取中...' : '📖 讀取'}</button>
        </div>
        {urlError && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--red)' }}>⚠️ {urlError}</p>}
        {!productInfo && !urlError && <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>貼入商品連結後點「讀取」，AI 自動抓取商品名稱、價格、截止日期等，幫你生成更精準的文案</p>}
      </div>

      {/* 讀取結果卡片 */}
      <ProductUrlCard
        info={productInfo}
        onUse={applyProductInfo}
        onClear={() => { setProductInfo(null); setUrlInput(''); }}
      />

      {/* ── 模式選擇 ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); setResults(null); setError(null); }} style={{
            padding: '9px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
            fontWeight: mode === m.key ? 700 : 400,
            border: `1.5px solid ${mode === m.key ? 'var(--brand-border)' : 'var(--border)'}`,
            background: mode === m.key ? 'var(--brand-bg)' : 'var(--bg)',
            color: mode === m.key ? 'var(--brand-dark)' : 'var(--text-2)',
          }}>{m.icon} {m.label}</button>
        ))}
      </div>

      {/* ═══════ 模式一：自由生成 ═══════ */}
      {mode === 'free' && (
        <>
          <TrendChips
            trends={trends} trendsLoading={trendsLoading} fetchTrends={fetchTrends}
            onSelect={kw => setProduct(prev => prev ? `${prev}、${kw}` : kw)}
            selected={null}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={product} onChange={e => setProduct(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="輸入商品名稱（如：錦霞樓年菜組合、限定茶飲禮盒）"
              style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }} />
            <VoiceBtn onResult={text => setProduct(prev => prev ? prev + ' ' + text : text)} />
          </div>
          <PlatformTonePicker platforms={platforms} setPlatforms={setPlatforms} tone={tone} setTone={setTone} />
        </>
      )}

      {/* ═══════ 模式二：爆文解剖 ═══════ */}
      {mode === 'dissect' && (
        <>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>🔬 貼上你看到的爆紅貼文</p>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>複製爆文文字貼進來 → AI 拆解為什麼它爆 → 套公式改寫成你的商品版本</p>
            <textarea
              value={viralText} onChange={e => setViralText(e.target.value)} rows={7}
              placeholder="直接貼上爆紅貼文的內容... （不需要貼網址，貼文字就好）&#10;&#10;例如：「媽媽你知道嗎，你每天這麼累，是因為...」這種開頭就可以直接貼"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}
            />
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>✅ 已輸入 {viralText.length} 字</p>
          </div>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>你的商品是什麼？</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={dissectProduct} onChange={e => setDissectProduct(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="如：有機黑糖薑母茶、手工奶油曲奇禮盒"
                style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }} />
              <VoiceBtn onResult={text => setDissectProduct(prev => prev ? prev + ' ' + text : text)} />
            </div>
          </div>
        </>
      )}

      {/* ═══════ 模式三：趨勢跟風 ═══════ */}
      {mode === 'trend' && (
        <>
          <TrendChips
            trends={trends} trendsLoading={trendsLoading} fetchTrends={fetchTrends}
            onSelect={kw => setTrendTopic(kw)}
            selected={trendTopic}
          />
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>熱門話題 / 流行梗 / 時事</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={trendTopic} onChange={e => setTrendTopic(e.target.value)}
                placeholder="如：台灣夏季熱浪、職場 emo、媽媽再累也要美"
                style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${trendTopic ? 'var(--amber-border)' : 'var(--border)'}`, background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }} />
              <VoiceBtn onResult={text => setTrendTopic(prev => prev ? prev + ' ' + text : text)} />
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>要搭上這個話題的商品</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={trendProduct} onChange={e => setTrendProduct(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="如：消暑薑黃茶、防曬身體乳"
                style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }} />
              <VoiceBtn onResult={text => setTrendProduct(prev => prev ? prev + ' ' + text : text)} />
            </div>
          </div>
          <PlatformTonePicker platforms={trendPlatforms} setPlatforms={setTrendPlatforms} tone={trendTone} setTone={setTrendTone} />
        </>
      )}

      {/* ═══════ 模式四：格式套用 ═══════ */}
      {mode === 'format' && (
        <>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>🎭 選一種爆款格式（點選後生成）</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {VIRAL_FORMATS.map(f => (
                <button key={f.key} onClick={() => setSelFormat(prev => prev?.key === f.key ? null : f)} style={{
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${selFormat?.key === f.key ? 'var(--brand-border)' : 'var(--border)'}`,
                  background: selFormat?.key === f.key ? 'var(--brand-bg)' : 'var(--surface)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: selFormat?.key === f.key ? 'var(--brand-dark)' : 'var(--text)', marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>你的商品</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={formatProduct} onChange={e => setFormatProduct(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="如：黑糖手工薑茶、天然玫瑰精華面霜"
                style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }} />
              <VoiceBtn onResult={text => setFormatProduct(prev => prev ? prev + ' ' + text : text)} />
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>發布平台</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PLATFORMS.map(p => (
                <button key={p.key} onClick={() => setFormatPlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))} style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${formatPlatforms[p.key] ? p.color : 'var(--border)'}`, background: formatPlatforms[p.key] ? `${p.color}18` : 'var(--bg)', color: formatPlatforms[p.key] ? p.color : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: formatPlatforms[p.key] ? 700 : 400 }}>{p.icon} {p.label}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── 生成按鈕 ── */}
      <button onClick={handleGenerate} disabled={!canGenerate()} style={{
        width: '100%', padding: 16, borderRadius: 12, border: 'none',
        background: canGenerate() ? 'var(--amber)' : 'var(--border)',
        color: '#fff', fontWeight: 700, fontSize: 17,
        cursor: canGenerate() ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
      }}>{btnLabel()}</button>

      {/* ── 錯誤提示 ── */}
      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 6px', color: 'var(--red)', fontWeight: 700, fontSize: 14 }}>⚠️ 生成失敗</p>
          <p style={{ margin: '0 0 10px', color: 'var(--red)', fontSize: 12 }}>{error}</p>
          <button onClick={handleGenerate} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--red-bg)', color: 'var(--red)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🔄 重試</button>
        </div>
      )}

      <HistoryPanel
        history={history} clearHistory={clearHistory}
        onRestore={data => { setResults(data); setError(null); }}
      />

      {/* ── 結果 ── */}
      {results?.copies?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.analysis && <AnalysisCard analysis={results.analysis} />}
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            共 {results.copies.length} 組文案 · 點「複製文案」即可貼到社群
          </p>
          {results.copies.map((copy, i) => (
            <CopyCard key={i} copy={copy} index={i} product={currentProduct} />
          ))}
        </div>
      )}
    </div>
  );
}
