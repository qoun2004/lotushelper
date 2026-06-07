'use client';
import { useState, useRef } from 'react';
import ModuleHero from './ModuleHero';
import useVendorDB, { EMPTY_VENDOR } from '../hooks/useVendorDB';
import { API_BASE as API } from '../lib/api';

const CATEGORIES = [
  { key: 'viral',  icon: '🔥', label: '爆紅商品',  desc: '社群、口碑、爆款' },
  { key: 'media',  icon: '📰', label: '媒體採訪',  desc: '小店、新聞、人氣' },
  { key: 'cvs',    icon: '🏪', label: '超商新品',  desc: '7-11、全家、萊爾富' },
  { key: 'collab', icon: '🤝', label: '品牌聯名',  desc: 'IP、限定、聯名話題' },
];

const SCORE_COLOR = {
  5: { bg: 'var(--red-bg)',   border: 'var(--red-border)',   color: 'var(--red)',   label: '🔴 必追蹤' },
  4: { bg: 'var(--amber-bg)', border: 'var(--amber-border)', color: 'var(--amber)', label: '🟡 值得聯繫' },
  3: { bg: 'var(--blue-bg)',  border: 'var(--blue-border)',  color: 'var(--blue)',  label: '🔵 持續觀察' },
  2: { bg: 'var(--bg)',       border: 'var(--border)',        color: 'var(--text-muted)', label: '⚪ 參考' },
  1: { bg: 'var(--bg)',       border: 'var(--border)',        color: 'var(--text-muted)', label: '⚪ 無需關注' },
};

function ScoreBadge({ score }) {
  const s = SCORE_COLOR[score] || SCORE_COLOR[2];
  return (
    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontWeight: 700, flexShrink: 0 }}>{s.label}</span>
  );
}

// ── 深度分析面板 ───────────────────────────────────────────────────
function AnalysisPanel({ item }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/module5/analyze_url`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.link, title: item.title, snippet: item.snippet }),
      });
      const d = await res.json();
      setData(d);
    } finally { setLoading(false); }
  };

  if (!data && !loading) return (
    <button onClick={analyze} style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid var(--brand-border)', background: 'var(--brand-bg)', color: 'var(--brand-dark)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
      🔍 深度分析商機潛力
    </button>
  );
  if (loading) return <div style={{ padding: '10px', textAlign: 'center', color: 'var(--brand)', fontSize: 12 }}>🧠 AI 深度分析中...</div>;

  const rows = [
    { label: '📦 品牌概況',   value: data.brand_summary },
    { label: '💥 爆紅原因',   value: data.viral_reason },
    { label: '🏪 超商適合度', value: data.cvs_fit },
    { label: '🤝 合作建議',   value: data.collab_suggestion },
    { label: '💡 建議行動',   value: data.next_action, highlight: true },
    { label: '📞 如何接觸',   value: data.contact_hint },
  ];

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: '1px solid var(--border)', marginTop: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--brand-dark)' }}>🔍 商機深度分析</p>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: data.value === '高' ? 'var(--red-bg)' : data.value === '中' ? 'var(--amber-bg)' : 'var(--bg)', color: data.value === '高' ? 'var(--red)' : data.value === '中' ? 'var(--amber)' : 'var(--text-muted)', border: `1px solid ${data.value === '高' ? 'var(--red-border)' : data.value === '中' ? 'var(--amber-border)' : 'var(--border)'}`, fontWeight: 700 }}>
          合作價值：{data.value || '中'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(({ label, value, highlight }) => value && (
          <div key={label} style={{ padding: highlight ? '10px 12px' : '0', borderRadius: highlight ? 8 : 0, background: highlight ? 'var(--green-bg)' : 'transparent', border: highlight ? '1px solid var(--green-border)' : 'none' }}>
            <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: highlight ? 'var(--green)' : 'var(--text-muted)' }}>{label}</p>
            <p style={{ margin: 0, fontSize: 12, color: highlight ? 'var(--green)' : 'var(--text-2)', lineHeight: 1.6 }}>{value}</p>
          </div>
        ))}
      </div>
      {data.value_reason && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          💰 合作價值說明：{data.value_reason}
        </p>
      )}
    </div>
  );
}

// ── 存入廠商庫表單 ────────────────────────────────────────────────────
function AddVendorForm({ item, onAdd, onClose }) {
  const [name, setName]       = useState(item.title?.slice(0, 50) || '');
  const [website, setWebsite] = useState(item.link || '');
  const [notes, setNotes]     = useState(item.snippet || '');
  const [category, setCategory] = useState('其他');
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);

  const CATS = ['食品工廠', '加工廠', '貿易商', '自有品牌', '農產/生鮮', '餐飲廚藝', '保健藥妝', '飲料茶飲', '其他'];

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd({
      ...EMPTY_VENDOR,
      name: name.trim(),
      website: website.trim(),
      notes: notes.trim(),
      category,
      status: '潛在',
    });
    setSaving(false);
    setDone(true);
  };

  if (done) return (
    <div style={{ padding: '12px 14px', background: 'var(--green-bg)', borderTop: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16 }}>✅</span>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>已加入廠商庫！可到「廠商星探」查看</p>
      <button onClick={onClose} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--green-border)', background: 'transparent', color: 'var(--green)', cursor: 'pointer', fontSize: 12 }}>收合</button>
    </div>
  );

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', background: 'var(--bg)' }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>➕ 快速加入廠商庫</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="公司 / 品牌名稱 *"
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
        <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="官網 / 連結"
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCategory(c)} type="button" style={{
              padding: '3px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
              border: `1px solid ${category===c ? 'var(--brand-border)' : 'var(--border)'}`,
              background: category===c ? 'var(--brand-bg)' : 'var(--bg)',
              color: category===c ? 'var(--brand-dark)' : 'var(--text-2)',
              fontWeight: category===c ? 700 : 400,
            }}>{c}</button>
          ))}
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="備註（來源/爆紅原因等）"
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>取消</button>
          <button onClick={save} disabled={!name.trim() || saving} style={{
            flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
            background: name.trim() ? 'var(--green)' : 'var(--border)',
            color: '#fff', fontSize: 13, fontWeight: 700,
          }}>{saving ? '儲存中...' : '✅ 存入廠商庫'}</button>
        </div>
      </div>
    </div>
  );
}

// ── 結果卡片 ──────────────────────────────────────────────────────────
function ResultCard({ item, onAddVendor }) {
  const [expanded, setExpanded]       = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{item.title}</p>
          <ScoreBadge score={item.score} />
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{item.snippet}</p>
        {item.reason && (
          <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 7, padding: '6px 10px', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--amber)' }}>💡 {item.action}｜{item.reason}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {item.link && (
            <a href={item.link} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--brand)', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
              🔗 開啟原頁
            </a>
          )}
          <button onClick={() => { setExpanded(e => !e); setShowAddForm(false); }} style={{
            padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            border: `1px solid ${expanded ? 'var(--brand-border)' : 'var(--border)'}`,
            background: expanded ? 'var(--brand-bg)' : 'transparent',
            color: expanded ? 'var(--brand-dark)' : 'var(--text-2)',
          }}>{expanded ? '▲ 收合' : '🔍 深度分析'}</button>
          <button onClick={() => { setShowAddForm(f => !f); setExpanded(false); }} style={{
            padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            border: `1px solid ${showAddForm ? 'var(--green-border)' : 'var(--border)'}`,
            background: showAddForm ? 'var(--green-bg)' : 'transparent',
            color: showAddForm ? 'var(--green)' : 'var(--text-2)',
          }}>➕ 加入廠商庫</button>
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
          <AnalysisPanel item={item} />
        </div>
      )}
      {showAddForm && (
        <AddVendorForm
          item={item}
          onAdd={onAddVendor}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────────────
export default function Module5Radar() {
  const { add: addVendor } = useVendorDB();

  const [activeCategory, setActiveCategory] = useState('viral');
  const [customQuery, setCustomQuery]       = useState('');
  const [loading, setLoading]               = useState(false);
  const [results, setResults]               = useState(null);
  const [error, setError]                   = useState('');
  const [source, setSource]                 = useState('');
  const [loadingSec, setLoadingSec]         = useState(0);
  const timerRef = useRef();

  // 每日快報
  const [dailyLoading, setDailyLoading] = useState(false);
  const [daily, setDaily]               = useState(null);
  const [dailyTab, setDailyTab]         = useState('viral');

  const scan = async () => {
    setLoading(true); setError(''); setResults(null); setLoadingSec(0);
    timerRef.current = setInterval(() => setLoadingSec(s => s + 1), 1000);
    try {
      const res  = await fetch(`${API}/api/module5/scan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: activeCategory, custom_query: customQuery }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      setSource(data.source || '');
    } catch (e) {
      setError(e.message);
    } finally { clearInterval(timerRef.current); setLoading(false); }
  };

  const fetchDaily = async () => {
    setDailyLoading(true);
    try {
      const res  = await fetch(`${API}/api/module5/daily_report`);
      const data = await res.json();
      setDaily(data);
    } catch (e) {
      setError('每日快報載入失敗');
    } finally { setDailyLoading(false); }
  };

  const currentCat = CATEGORIES.find(c => c.key === activeCategory);
  const dailyCatData = daily?.categories?.[dailyTab] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ModuleHero
        icon="📡"
        title="商機雷達"
        desc="AI 掃描爆紅商品、媒體採訪、超商新品、品牌聯名，幫你第一時間找到開發合作機會"
        steps={['選類別', 'AI 掃描', '深度分析', '聯繫合作']}
      />

      {/* ── 每日快報 ── */}
      <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: daily ? '1px solid var(--border)' : 'none' }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>📋 今日商機快報</p>
            {daily?.date && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>更新時間：{daily.date}</p>}
            {!daily && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>每天 08:00 自動更新，或手動載入</p>}
          </div>
          <button onClick={fetchDaily} disabled={dailyLoading} style={{
            padding: '8px 16px', borderRadius: 9, border: 'none', cursor: dailyLoading ? 'default' : 'pointer',
            background: 'var(--brand)', color: '#fff', fontSize: 13, fontWeight: 700,
          }}>{dailyLoading ? '⏳ 載入中...' : daily ? '🔄 重新掃描' : '📡 載入快報'}</button>
        </div>

        {daily && (
          <>
            {/* 類別 tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setDailyTab(cat.key)} style={{
                  padding: '10px 16px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: dailyTab === cat.key ? 700 : 400,
                  background: dailyTab === cat.key ? 'var(--brand-bg)' : 'transparent',
                  color: dailyTab === cat.key ? 'var(--brand-dark)' : 'var(--text-2)',
                  borderBottom: dailyTab === cat.key ? '2px solid var(--brand)' : '2px solid transparent',
                }}>{cat.icon} {cat.label}</button>
              ))}
            </div>

            {/* 快報結果 */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dailyCatData.length > 0 ? (
                dailyCatData.map((item, i) => <ResultCard key={i} item={item} onAddVendor={addVendor} />)
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>此類別暫無資料</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 手動搜尋 ── */}
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 16, border: '1px solid var(--border)' }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>🔎 即時掃描</p>

        {/* 類別選擇 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{
              padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              border: `1.5px solid ${activeCategory === cat.key ? 'var(--brand-border)' : 'var(--border)'}`,
              background: activeCategory === cat.key ? 'var(--brand-bg)' : 'var(--bg)',
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 18 }}>{cat.icon}</p>
              <p style={{ margin: '0 0 1px', fontSize: 12, fontWeight: 700, color: activeCategory === cat.key ? 'var(--brand-dark)' : 'var(--text)' }}>{cat.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{cat.desc}</p>
            </button>
          ))}
        </div>

        {/* 自訂關鍵字 */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
            自訂關鍵字 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>（選填，留空使用預設搜尋）</span>
          </p>
          <input
            value={customQuery} onChange={e => setCustomQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scan()}
            placeholder={`如：${currentCat?.desc || '台灣新品'}、泡麵聯名、環保包材...`}
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
          />
        </div>

        <button onClick={scan} disabled={loading} style={{
          width: '100%', padding: 14, borderRadius: 10, border: 'none',
          background: loading ? 'var(--border)' : 'var(--brand)',
          color: '#fff', fontWeight: 700, fontSize: 16, cursor: loading ? 'default' : 'pointer',
        }}>
          {loading ? `⏳ AI 掃描${currentCat?.label || ''}中...` : `📡 掃描 ${currentCat?.label || ''}`}
        </button>
      </div>

      {/* Loading 進度卡 */}
      {loading && (
        <div style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', borderRadius: 14, padding: '20px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--brand-dark)', fontSize: 15 }}>
            AI 雷達掃描中
            {loadingSec > 0 && <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>已等待 {loadingSec} 秒</span>}
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            市場雷達掃描通常需要 <strong>20〜60 秒</strong><br/>
            完成後結果會自動出現在 <strong>下方</strong> 👇
          </p>
          {loadingSec >= 30 && (
            <div style={{ marginTop: 10, background: 'var(--brand)', borderRadius: 8, padding: '8px 14px', display: 'inline-block' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#fff', fontWeight: 600 }}>⏳ 快好了！AI 正在分析市場資料，請耐心等候，不要重複按</p>
            </div>
          )}
          {loadingSec >= 90 && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--red)' }}>
              超過 90 秒？可能網路或後端有問題，可以重新整理頁面再試試
            </p>
          )}
        </div>
      )}

      {/* 來源提示 */}
      {source && (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          {source === 'google' ? '✅ 資料來源：Google 即時搜尋' : '🤖 資料來源：AI 市場知識庫（設定 GOOGLE_API_KEY 可啟用即時搜尋）'}
        </p>
      )}

      {/* 錯誤 */}
      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '12px 14px' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>⚠️ {error}</p>
        </div>
      )}

      {/* 掃描結果 */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            找到 {results.length} 筆資訊 · 按商機潛力排序 · 點「深度分析」取得合作建議
          </p>
          {results.length > 0 ? (
            results.map((item, i) => <ResultCard key={i} item={item} onAddVendor={addVendor} />)
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔍</p>
              <p style={{ margin: 0, fontSize: 13 }}>沒有找到相關結果，試試其他關鍵字</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
