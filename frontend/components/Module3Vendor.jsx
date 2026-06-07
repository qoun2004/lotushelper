'use client';
import { useState, useRef, useEffect } from 'react';
import VoiceBtn from './VoiceBtn';
import VendorDB from './VendorDB';
import ModuleHero from './ModuleHero';
import useVendorDB from '../hooks/useVendorDB';
import { API_BASE as API } from '../lib/api';

const HISTORY_KEY = 'module3_search_history';
const MAX_HISTORY = 8;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(entry) {
  try {
    const list = loadHistory().filter(h => h.keyword !== entry.keyword || h.categoryKey !== entry.categoryKey);
    list.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  } catch {}
}

// ── 廠商類別（快速選擇）──────────────────────────────────────────
const VENDOR_CATEGORIES = [
  { key: '食品工廠',    icon: '🏭', desc: '自有生產線的食品製造商' },
  { key: '加工廠',     icon: '⚙️', desc: '代工、OEM 加工業者' },
  { key: '貿易商',     icon: '🌐', desc: '進出口代理、貿易公司' },
  { key: '自有品牌',   icon: '🏷️', desc: '自建品牌、電商品牌' },
  { key: '農產/生鮮',  icon: '🌾', desc: '農產品、生鮮、有機業者' },
  { key: '餐飲廚藝',   icon: '👨‍🍳', desc: '廚師、餐廳、料理品牌' },
  { key: '設計攝影',   icon: '📸', desc: '設計、攝影、創意工作室' },
  { key: '包材容器',   icon: '📦', desc: '包裝材料、容器供應商' },
  { key: '保健藥妝',   icon: '💊', desc: '保健品、藥妝、美容業者' },
  { key: '清潔日用',   icon: '🧴', desc: '日用品、清潔用品業者' },
  { key: '飲料茶飲',   icon: '🧋', desc: '飲料、茶飲、咖啡業者' },
  { key: '其他',       icon: '✏️', desc: '其他類別（可用關鍵字說明）' },
];

// ── 篩選條件（預設 + 可自訂）────────────────────────────────────
const DEFAULT_CRITERIA = [
  // 認證
  { key: 'iso',        label: 'ISO / HACCP 認證',  icon: '🏅', group: '認證' },
  { key: 'gmp',        label: 'GMP / GHP 認證',    icon: '✅', group: '認證' },
  { key: 'organic',    label: '有機 / 產銷履歷',    icon: '🌿', group: '認證' },
  // 供應能力
  { key: 'stable_supply', label: '供貨穩定度高',   icon: '📦', group: '供應' },
  { key: 'small_moq',  label: '可接受小量起訂',    icon: '🔢', group: '供應' },
  { key: 'spec_sheet', label: '有完整產品規格書',   icon: '📋', group: '供應' },
  { key: 'sample',     label: '可提供免費樣品',     icon: '🎁', group: '供應' },
  // 通路經驗
  { key: 'cvs_exp',    label: '超商通路合作經驗',   icon: '🏪', group: '通路' },
  { key: 'ecom_exp',   label: '電商平台銷售經驗',   icon: '💻', group: '通路' },
  { key: 'retail_exp', label: '超市/百貨通路經驗',  icon: '🛒', group: '通路' },
  // 財務條件
  { key: 'payment_terms', label: '可接受月結票期',  icon: '💳', group: '財務' },
  { key: 'consignment', label: '可接受寄賣模式',   icon: '📝', group: '財務' },
  { key: 'invoice',    label: '發票/帳務完整',      icon: '🧾', group: '財務' },
];

function ScoreBadge({ score }) {
  const color = score >= 85 ? 'var(--green)' : score >= 70 ? 'var(--amber)' : 'var(--red)';
  const bg    = score >= 85 ? 'var(--green-bg)' : score >= 70 ? 'var(--amber-bg)' : 'var(--red-bg)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2.5px solid ${color}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color, flexShrink: 0 }}>{score}</div>
    </div>
  );
}

function CopyBtn({ text, label = '複製', small = false }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} style={{
      padding: small ? '4px 10px' : '7px 14px',
      borderRadius: 7,
      border: `1px solid ${copied ? 'var(--green-border)' : 'var(--border)'}`,
      background: copied ? 'var(--green-bg)' : 'transparent',
      color: copied ? 'var(--green)' : 'var(--text-2)',
      cursor: 'pointer', fontSize: small ? 11 : 12, fontWeight: 600,
      transition: 'all 0.2s',
    }}>{copied ? '✓ 已複製' : label}</button>
  );
}

function SaveToDBBtn({ vendor, onSave }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (saved) return;
    setSaving(true);
    await onSave(vendor);
    setSaving(false);
    setSaved(true);
  };

  return (
    <button onClick={handle} disabled={saving || saved} style={{
      padding: '7px 12px', borderRadius: 7,
      border: `1px solid ${saved ? 'var(--green-border)' : 'var(--border)'}`,
      background: saved ? 'var(--green-bg)' : 'transparent',
      color: saved ? 'var(--green)' : 'var(--text-2)',
      cursor: saved ? 'default' : 'pointer',
      fontSize: 12, fontWeight: 600,
      transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}>
      {saving ? '儲存中...' : saved ? '✓ 已存入' : '📥 存入廠商庫'}
    </button>
  );
}

function VendorCard({ vendor, onGenerateEmail, emailLoading, onSaveToDB }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* 標題列 */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <ScoreBadge score={vendor.score || 80} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{vendor.name}</p>
            {vendor.brand && vendor.brand !== vendor.name && (
              <span style={{ fontSize: 11, color: 'var(--brand)', background: 'var(--blue-bg)', padding: '2px 7px', borderRadius: 10 }}>{vendor.brand}</span>
            )}
            {/* 真實資料 vs AI建議 標籤 */}
            {vendor.data_source && (
              <span style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 8,
                background: vendor.data_source === 'AI 專業建議' ? 'var(--amber-bg)' : 'var(--green-bg)',
                color: vendor.data_source === 'AI 專業建議' ? 'var(--amber)' : 'var(--green)',
                border: `1px solid ${vendor.data_source === 'AI 專業建議' ? 'var(--amber-border)' : 'var(--green-border)'}`,
              }}>
                {vendor.data_source === 'AI 專業建議' ? '🤖 AI建議' : '✓ 公開資料'}
              </span>
            )}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-2)' }}>{vendor.category} · {vendor.location}</p>
        </div>
        {/* 存入廠商庫 + 展開 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <SaveToDBBtn vendor={vendor} onSave={onSaveToDB} />
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 16, padding: 4 }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* 說明 + tags */}
      <div style={{ padding: '0 16px 12px' }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-muted)' }}>{vendor.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(vendor.tags || []).map(t => (
            <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg)', color: 'var(--brand)' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* 展開：highlights + 聯絡建議 + 信件 */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {vendor.highlights?.length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--surface)' }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em' }}>核心優勢</p>
              {vendor.highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: 'var(--green)', fontSize: 12, flexShrink: 0 }}>✓</span>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{h}</p>
                </div>
              ))}
            </div>
          )}

          {vendor.contact_hint && (
            <div style={{ padding: '10px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--amber)' }}>💡 建議聯絡方式：{vendor.contact_hint}</p>
            </div>
          )}

          {/* 信件區 */}
          <div style={{ padding: '12px 16px' }}>
            {vendor.email_draft ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>✉️ 商務邀請信草稿</p>
                  <CopyBtn text={vendor.email_draft} label="複製信件" />
                </div>
                <pre style={{ margin: 0, background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit', border: '1px solid var(--border)' }}>{vendor.email_draft}</pre>
              </div>
            ) : (
              <button
                onClick={() => onGenerateEmail(vendor)}
                disabled={emailLoading}
                style={{
                  width: '100%', padding: '11px', borderRadius: 8,
                  border: `1px solid ${emailLoading ? 'var(--border)' : 'var(--brand-border)'}`,
                  background: emailLoading ? 'var(--bg)' : 'var(--brand-bg)',
                  color: emailLoading ? 'var(--text-muted)' : 'var(--brand-dark)',
                  cursor: emailLoading ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 600,
                }}>
                {emailLoading ? '✍️ 撰寫信件中...' : '✉️ 一鍵生成商務邀請信'}
              </button>
            )}
            {vendor.email_error && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--red)' }}>⚠️ {vendor.email_error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// AI 星探頁面
function AiScout({ vendorAdd }) {
  const [keyword, setKeyword]     = useState('');
  const [categoryKey, setCategoryKey] = useState('');   // 廠商類別 key
  const [criteria, setCriteria]   = useState({ iso: true, stable_supply: true, cvs_exp: true }); // 預設勾選
  const [customCriteria, setCustomCriteria] = useState([]); // 自訂篩選條件陣列
  const [customInput, setCustomInput] = useState('');   // 新增自訂條件的暫存輸入
  const [loading, setLoading]     = useState(false);
  const [vendors, setVendors]     = useState(null);
  const [error, setError]         = useState(null);
  const [emailLoadingMap, setEmailLoadingMap] = useState({});
  const [loadingSec, setLoadingSec] = useState(0);
  const [history, setHistory]     = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [allSaved, setAllSaved]   = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const timerRef = useRef();

  useEffect(() => { setHistory(loadHistory()); }, []);

  // 廠商類別選取的 category 文字（送給後端）
  const selectedCategory = VENDOR_CATEGORIES.find(c => c.key === categoryKey);

  // 加入自訂篩選條件
  const addCustom = () => {
    const t = customInput.trim();
    if (!t || customCriteria.includes(t)) return;
    setCustomCriteria(prev => [...prev, t]);
    setCustomInput('');
  };
  const removeCustom = (t) => setCustomCriteria(prev => prev.filter(x => x !== t));

  // 整理所有篩選條件給後端
  const buildCriteriaPayload = () => {
    const base = { ...criteria };
    const customList = customCriteria;
    return { ...base, _custom: customList };
  };

  const search = async (overrideKeyword, overrideCategoryKey) => {
    const kw = overrideKeyword ?? keyword;
    const ck = overrideCategoryKey ?? categoryKey;
    if (!kw.trim()) return;
    if (overrideKeyword !== undefined) { setKeyword(overrideKeyword); setCategoryKey(overrideCategoryKey ?? ''); }
    setLoading(true); setError(null); setVendors(null); setLoadingSec(0); setAllSaved(false);
    timerRef.current = setInterval(() => setLoadingSec(s => s + 1), 1000);
    const selCat = VENDOR_CATEGORIES.find(c => c.key === ck);
    try {
      const res = await fetch(`${API}/api/module3/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: kw,
          category: selCat ? `${selCat.key}（${selCat.desc}）` : '',
          criteria: buildCriteriaPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        const msg = data.error || res.statusText;
        if (msg === '529_overloaded') throw new Error('529_overloaded');
        throw new Error(msg);
      }
      const results = (data.results || []).map((v, i) => ({ ...v, _open: i === 0 }));
      setVendors({ ...data, results });
      // 儲存搜尋紀錄
      const entry = { keyword: kw, categoryKey: ck, results, timestamp: Date.now() };
      saveHistory(entry);
      setHistory(loadHistory());
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const restoreHistory = (entry) => {
    setKeyword(entry.keyword);
    setCategoryKey(entry.categoryKey || '');
    setVendors({ results: entry.results });
    setAllSaved(false);
    setShowHistory(false);
  };

  const saveAllToDB = async () => {
    if (!vendors?.results?.length) return;
    setSavingAll(true);
    for (const vendor of vendors.results) {
      await vendorAdd({
        name: vendor.name, brand: vendor.brand || '',
        category: vendor.category || '', location: vendor.location || '',
        tags: vendor.tags || [], score: vendor.score || 80,
        notes: vendor.description || '', status: '潛在',
      });
    }
    setSavingAll(false);
    setAllSaved(true);
  };

  const generateEmail = async (vendor) => {
    const key = vendor.name;
    setEmailLoadingMap(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`${API}/api/module3/generate_email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor }),
      });
      const data = await res.json();
      setVendors(prev => ({
        ...prev,
        results: prev.results.map(v =>
          v.name === key
            ? { ...v, email_draft: data.email, email_error: data.error ? '信件生成失敗，請重試' : undefined }
            : v
        ),
      }));
    } finally {
      setEmailLoadingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveToDB = async (vendor) => {
    await vendorAdd({
      name: vendor.name,
      brand: vendor.brand || '',
      category: vendor.category || '',
      location: vendor.location || '',
      tags: vendor.tags || [],
      score: vendor.score || 80,
      notes: vendor.description || '',
      status: '潛在',
    });
  };

  // 分組顯示篩選條件
  const criteriaGroups = ['認證', '供應', '通路', '財務'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── 搜尋關鍵字 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={keyword} onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="搜尋關鍵字（如：台灣有機茶飲、冷凍年菜、健康零食）"
            style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }} />
          <VoiceBtn onResult={text => setKeyword(prev => prev ? prev + ' ' + text : text)} />
        </div>
        {/* 搜尋紀錄 */}
        {history.length > 0 && (
          <div>
            <button onClick={() => setShowHistory(v => !v)} style={{
              background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12,
              cursor: 'pointer', padding: '2px 0', fontWeight: 600,
            }}>
              🕘 最近搜尋 {history.length} 筆 {showHistory ? '▲' : '▼'}
            </button>
            {showHistory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                {history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => restoreHistory(h)} style={{
                      flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                      padding: '6px 8px', borderRadius: 7, color: 'var(--text)',
                      fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>🔍</span>
                      <span style={{ fontWeight: 600 }}>{h.keyword}</span>
                      {h.categoryKey && <span style={{ fontSize: 11, color: 'var(--brand)', background: 'var(--blue-bg)', padding: '1px 7px', borderRadius: 8 }}>{h.categoryKey}</span>}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{h.results?.length} 筆 · {new Date(h.timestamp).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </button>
                  </div>
                ))}
                <button onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); setShowHistory(false); }} style={{
                  fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'right', padding: '4px 8px 2px',
                }}>清除紀錄</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 廠商類別 ── */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em' }}>
          廠商類別 <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>（選一個，幫 AI 縮小範圍）</span>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {VENDOR_CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCategoryKey(prev => prev === c.key ? '' : c.key)}
              title={c.desc}
              style={{
                padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
                border: `1.5px solid ${categoryKey === c.key ? 'var(--brand-border)' : 'var(--border)'}`,
                background: categoryKey === c.key ? 'var(--brand-bg)' : 'var(--surface)',
                color: categoryKey === c.key ? 'var(--brand-dark)' : 'var(--text-2)',
                fontWeight: categoryKey === c.key ? 700 : 400, fontSize: 13,
                transition: 'all 0.15s',
              }}>
              {c.icon} {c.key}
            </button>
          ))}
        </div>
        {selectedCategory && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--brand)', paddingLeft: 4 }}>
            ✓ {selectedCategory.desc}
          </p>
        )}
      </div>

      {/* ── 篩選條件（分組）── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em' }}>
            硬性篩選條件
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
              已勾 {Object.values(criteria).filter(Boolean).length + customCriteria.length} 項
            </span>
          </p>
          <button onClick={() => setCriteria({})} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>清空</button>
        </div>

        {criteriaGroups.map(group => (
          <div key={group} style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>{group}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEFAULT_CRITERIA.filter(c => c.group === group).map(c => (
                <button key={c.key} onClick={() => setCriteria(prev => ({ ...prev, [c.key]: !prev[c.key] }))}
                  style={{
                    padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                    border: `1.5px solid ${criteria[c.key] ? 'var(--brand-border)' : 'var(--border)'}`,
                    background: criteria[c.key] ? 'var(--brand-bg)' : 'var(--bg)',
                    color: criteria[c.key] ? 'var(--brand-dark)' : 'var(--text-2)',
                    fontWeight: criteria[c.key] ? 700 : 400,
                    fontSize: 12, transition: 'all 0.15s',
                  }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 自訂條件 */}
        <div style={{ marginTop: 4 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--brand)', fontWeight: 700, letterSpacing: '0.06em' }}>＋ 自訂條件</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: customCriteria.length ? 8 : 0 }}>
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder="輸入自訂要求（如：需有冷鏈物流、台南在地廠商）"
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}
            />
            <button onClick={addCustom} disabled={!customInput.trim()} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: customInput.trim() ? 'pointer' : 'not-allowed',
              background: customInput.trim() ? 'var(--brand)' : 'var(--border)',
              color: customInput.trim() ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
            }}>新增</button>
          </div>
          {customCriteria.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {customCriteria.map(t => (
                <span key={t} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 20,
                  background: 'var(--green-bg)', border: '1px solid var(--green-border)',
                  color: 'var(--green)', fontSize: 12, fontWeight: 600,
                }}>
                  ✓ {t}
                  <button onClick={() => removeCustom(t)} style={{
                    background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer',
                    fontSize: 14, padding: 0, lineHeight: 1,
                  }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 搜尋按鈕 */}
      <button onClick={search} disabled={!keyword.trim() || loading} style={{
        width: '100%', padding: 16, borderRadius: 12, border: 'none',
        background: keyword.trim() && !loading ? 'var(--green)' : 'var(--border)',
        color: '#fff', fontWeight: 700, fontSize: 17,
        cursor: keyword.trim() && !loading ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s', letterSpacing: '-0.3px',
      }}>
        {loading ? '🔍 AI 正在篩選廠商...' : '🚀 搜尋符合條件的廠商'}
      </button>

      {/* Loading 進度卡 */}
      {loading && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 14, padding: '20px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#166534', fontSize: 15 }}>
            AI 廠商搜尋中
            {loadingSec > 0 && <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>已等待 {loadingSec} 秒</span>}
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            AI 篩選廠商通常需要 <strong>20〜60 秒</strong><br/>
            完成後結果會自動出現在 <strong>下方</strong> 👇
          </p>
          {loadingSec >= 30 && (
            <div style={{ marginTop: 10, background: 'var(--green)', borderRadius: 8, padding: '8px 14px', display: 'inline-block' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#fff', fontWeight: 600 }}>⏳ 快好了！AI 正在比對廠商資料，請耐心等候，不要重複按</p>
            </div>
          )}
          {loadingSec >= 90 && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--red)' }}>
              超過 90 秒？可能網路或後端有問題，可以重新整理頁面再試試
            </p>
          )}
        </div>
      )}

      {/* 錯誤 */}
      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '12px 16px' }}>
          <p style={{ margin: '0 0 8px', color: 'var(--red)', fontWeight: 700, fontSize: 14 }}>
            {error === '529_overloaded' ? '😅 AI 伺服器暫時過載' : '⚠️ 搜尋失敗'}
          </p>
          <p style={{ margin: '0 0 10px', color: 'var(--red)', fontSize: 12 }}>
            {error === '529_overloaded' ? '請稍後 30 秒再試，Anthropic 目前使用量過高。' : error}
          </p>
          <button onClick={search} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--red-bg)', color: 'var(--red)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🔄 重試</button>
        </div>
      )}

      {/* 結果 */}
      {vendors?.results?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              找到 {vendors.results.length} 家符合條件的廠商 · ▼ 展開查看詳情
            </p>
            <button
              onClick={saveAllToDB}
              disabled={savingAll || allSaved}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: allSaved ? 'default' : 'pointer',
                background: allSaved ? 'var(--green)' : savingAll ? 'var(--border)' : 'var(--brand)',
                color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {allSaved ? `✓ 已全部存入（${vendors.results.length} 家）` : savingAll ? '儲存中...' : `📥 一鍵全部加入廠商庫（${vendors.results.length} 家）`}
            </button>
          </div>
          {vendors.results.map((v, i) => (
            <VendorCard
              key={i}
              vendor={v}
              onGenerateEmail={generateEmail}
              emailLoading={!!emailLoadingMap[v.name]}
              onSaveToDB={handleSaveToDB}
            />
          ))}
        </div>
      )}
      {vendors?.results?.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
          <p style={{ margin: 0, fontSize: 13 }}>找不到符合條件的廠商，試試看放寬篩選條件或換個關鍵字</p>
        </div>
      )}
    </div>
  );
}

// ── 名片快速識別模式 ────────────────────────────────────────────
const API_URL = API;

function CardScanner({ vendorAdd }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult]     = useState(null);
  const [saved, setSaved]       = useState(false);
  const [err, setErr]           = useState('');
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true); setErr(''); setResult(null); setSaved(false);
    try {
      const form = new FormData();
      form.append('card_image', file);
      const res = await fetch(`${API_URL}/api/module3/scan_card`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setErr(e.message?.includes('overloaded') ? 'AI 忙碌，請稍後再試' : '辨識失敗，請確認圖片清晰度');
    } finally { setScanning(false); e.target.value = ''; }
  };

  const saveToDb = async () => {
    if (!result) return;
    await vendorAdd({
      name: result.name || '',
      brand: result.brand || '',
      contact_name: result.contact_name || '',
      email: result.email || '',
      phone: result.phone || '',
      line_id: result.line_id || '',
      website: result.website || '',
      location: result.location || '',
      category: result.category || '',
      notes: [result.title, result.notes].filter(Boolean).join('\n'),
      status: '潛在',
    });
    setSaved(true);
  };

  const lineHref = result?.line_id
    ? (result.line_id.startsWith('@') ? `https://line.me/R/ti/p/${result.line_id}` : `https://line.me/ti/p/~${result.line_id}`)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', borderRadius: 10, padding: '12px 16px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--brand-dark)' }}>📷 名片識別 → 自動建立廠商資料</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>拍名片或上傳圖片，AI 自動抓出品名、聯絡人、Email、LINE ID，一鍵存入廠商庫</p>
      </div>

      {/* 上傳區 */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
      <div onClick={() => fileRef.current.click()} style={{
        border: '2px dashed var(--brand-border)', borderRadius: 14, padding: '32px 20px',
        textAlign: 'center', cursor: 'pointer', background: 'var(--bg)',
        transition: 'all 0.15s',
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
        <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
          {scanning ? '⏳ AI 辨識中...' : '點此拍攝或上傳名片'}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          手機可直接拍照，電腦可上傳圖片（JPG / PNG）
        </p>
      </div>

      {err && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ margin: 0, color: 'var(--red)', fontSize: 13 }}>⚠️ {err}</p>
        </div>
      )}

      {/* 識別結果 */}
      {result && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--green-border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--green-bg)', borderBottom: '1px solid var(--green-border)' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>✓ 名片識別完成</p>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: '公司', value: result.name, icon: '🏢' },
              { label: '品牌', value: result.brand, icon: '🏷️' },
              { label: '聯絡人', value: result.contact_name + (result.title ? ` · ${result.title}` : ''), icon: '👤' },
              { label: '電話', value: result.phone, icon: '📞' },
              { label: 'Email', value: result.email, icon: '📧' },
              { label: 'LINE', value: result.line_id, icon: '💚' },
              { label: '官網', value: result.website, icon: '🌐' },
              { label: '地區', value: result.location, icon: '📍' },
              { label: '類別', value: result.category, icon: '🗂️' },
            ].filter(r => r.value).map(r => (
              <div key={r.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 40, flexShrink: 0 }}>{r.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* 快速聯繫 + 存入廠商庫 */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lineHref && (
              <a href={lineHref} target="_blank" rel="noreferrer" style={{
                flex: 1, padding: '10px', borderRadius: 8, textDecoration: 'none', textAlign: 'center',
                background: 'var(--green-bg)', border: '1px solid var(--green-border)',
                color: 'var(--green)', fontWeight: 700, fontSize: 13,
              }}>💚 LINE 聯繫</a>
            )}
            {result.email && (
              <a href={`mailto:${result.email}?subject=【超商通路合作邀請】誠邀 ${result.name} 洽談`} style={{
                flex: 1, padding: '10px', borderRadius: 8, textDecoration: 'none', textAlign: 'center',
                background: 'var(--brand-bg)', border: '1px solid var(--brand-border)',
                color: 'var(--brand-dark)', fontWeight: 700, fontSize: 13,
              }}>📧 發 Email</a>
            )}
            <button onClick={saveToDb} disabled={saved} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none',
              background: saved ? 'var(--green)' : 'var(--brand)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: saved ? 'default' : 'pointer',
            }}>{saved ? '✓ 已存入廠商庫' : '📥 存入廠商庫'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Module3Vendor() {
  const [tab, setTab] = useState('scout'); // 'scout' | 'card' | 'db'
  const { add } = useVendorDB();

  const tabStyle = (active) => ({
    flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none',
    background: active ? 'var(--brand)' : 'transparent',
    color: active ? '#fff' : 'var(--text-2)',
    fontWeight: active ? 700 : 400, fontSize: 13, cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 標題 */}
      <ModuleHero
        icon="🤝"
        title="廠商星探"
        desc="AI 搜尋廠商、名片識別建檔、LINE/Email 一鍵聯繫、廠商庫管理"
        steps={tab === 'card' ? ['拍攝名片', 'AI 識別', '一鍵聯繫', '存入廠商庫'] : ['輸入關鍵字', 'AI 評分篩選', '存入廠商庫', '發開發信']}
      />

      {/* Tab 切換 */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
        <button onClick={() => setTab('scout')} style={tabStyle(tab === 'scout')}>🔍 AI 星探</button>
        <button onClick={() => setTab('card')} style={tabStyle(tab === 'card')}>📷 名片識別</button>
        <button onClick={() => setTab('db')} style={tabStyle(tab === 'db')}>🏢 廠商庫</button>
      </div>

      {/* 內容 */}
      {tab === 'scout' && <AiScout vendorAdd={add} />}
      {tab === 'card'  && <CardScanner vendorAdd={add} />}
      {tab === 'db'    && <VendorDB />}
    </div>
  );
}
