'use client';
import { useState, useRef } from 'react';
import useVendorDB, { VENDOR_STATUS, EMPTY_VENDOR } from '../hooks/useVendorDB';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// LINE URL 輔助
function lineUrl(lineId) {
  if (!lineId) return null;
  const id = lineId.trim();
  if (id.startsWith('@')) return `https://line.me/R/ti/p/${id}`;
  return `https://line.me/ti/p/~${id}`;
}

// 廠商類別快速選單（與 Module3Vendor.jsx 同步）
const CATEGORY_OPTIONS = [
  '食品工廠', '加工廠', '貿易商', '自有品牌', '農產/生鮮',
  '餐飲廚藝', '設計攝影', '包材容器', '保健藥妝', '清潔日用',
  '飲料茶飲', '其他',
];

const STATUS_COLOR = {
  '潛在':   { bg:'var(--bg-2)',        color:'var(--text-muted)',  border:'var(--border)' },
  '洽談中': { bg:'var(--amber-bg)',    color:'var(--amber)',       border:'var(--amber-border)' },
  '合作中': { bg:'var(--green-bg)',    color:'var(--green)',       border:'var(--green-border)' },
  '暫停':   { bg:'var(--blue-bg)',     color:'var(--blue)',        border:'var(--blue-border)' },
};

const inputStyle = {
  padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)',
  background:'var(--surface)', color:'var(--text)', fontSize:13,
  width:'100%', boxSizing:'border-box',
};

// ── 名片掃描按鈕（嵌入 VendorModal 頂部）────────────────────────
function CardScanBtn({ onFill }) {
  const [scanning, setScanning] = useState(false);
  const [err, setErr]           = useState('');
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true); setErr('');
    try {
      const form = new FormData();
      form.append('card_image', file);
      const res = await fetch(`${API}/api/module3/scan_card`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onFill(data);
    } catch (e) {
      setErr(e.message?.includes('overloaded') ? 'AI 忙碌，稍後再試' : '辨識失敗，請確認圖片清晰');
    } finally { setScanning(false); e.target.value = ''; }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
      <button type="button" onClick={() => fileRef.current.click()} disabled={scanning} style={{
        width: '100%', padding: '11px', borderRadius: 10,
        border: '1.5px dashed var(--brand-border)', background: 'var(--brand-bg)',
        color: scanning ? 'var(--text-muted)' : 'var(--brand-dark)',
        cursor: scanning ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {scanning ? '⏳ AI 辨識中...' : '📷 拍攝或上傳名片 → AI 自動填入'}
      </button>
      {err && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>⚠️ {err}</p>}
    </div>
  );
}

function VendorModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_VENDOR, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const row = (label, key, placeholder, type='text') => (
    <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:10 }}>
      <label style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
        placeholder={placeholder} style={inputStyle} />
    </div>
  );
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface)', borderRadius:'20px 20px 0 0', padding:'20px 18px 36px', width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', border:'1px solid var(--border)', borderBottom:'none' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <p style={{ margin:0, fontSize:17, fontWeight:800, color:'var(--text)' }}>{initial?.name ? '✏️ 編輯廠商' : '➕ 新增廠商'}</p>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {/* 名片掃描 */}
        {!initial?.name && (
          <CardScanBtn onFill={(data) => {
            if (data.name)         set('name', data.name);
            if (data.brand)        set('brand', data.brand);
            if (data.contact_name) set('contact_name', data.contact_name);
            if (data.title)        set('notes', prev => data.title + (prev ? '\n' + prev : ''));
            if (data.email)        set('email', data.email);
            if (data.phone)        set('phone', data.phone);
            if (data.line_id)      set('line_id', data.line_id);
            if (data.website)      set('website', data.website);
            if (data.location)     set('location', data.location);
            if (data.category)     set('category', data.category);
            if (data.notes)        set('notes', prev => prev ? prev + '\n' + data.notes : data.notes);
          }} />
        )}

        {row('公司名稱 *', 'name', '台灣茶飲股份有限公司')}
        {row('品牌', 'brand', '旗下品牌名稱')}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <label style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, display:'block', marginBottom:4 }}>廠商類別</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
              {CATEGORY_OPTIONS.map(cat => (
                <button key={cat} type="button" onClick={() => set('category', cat === form.category ? '' : cat)} style={{
                  padding:'4px 10px', borderRadius:16, fontSize:11, cursor:'pointer',
                  border:`1px solid ${form.category===cat ? 'var(--brand-border)' : 'var(--border)'}`,
                  background: form.category===cat ? 'var(--brand-bg)' : 'var(--bg)',
                  color: form.category===cat ? 'var(--brand-dark)' : 'var(--text-2)',
                  fontWeight: form.category===cat ? 700 : 400,
                }}>{cat}</button>
              ))}
            </div>
          </div>
          <div>{row('地區', 'location', '台北市')}</div>
        </div>
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:10, marginBottom:10 }}>
          <p style={{ margin:'0 0 8px', fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>聯絡資訊</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>{row('聯絡人', 'contact_name', '王小明')}</div>
            <div>{row('電話', 'phone', '02-12345678')}</div>
          </div>
          {row('Email', 'email', 'contact@company.com', 'email')}
          {row('LINE ID', 'line_id', 'lineID 或 @business_id')}
          {row('官網', 'website', 'https://www.company.com')}
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, display:'block', marginBottom:6 }}>合作狀態</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {VENDOR_STATUS.map(s => {
              const c = STATUS_COLOR[s];
              return <button key={s} onClick={() => set('status', s)} style={{
                padding:'5px 12px', borderRadius:16,
                border:`1px solid ${form.status===s ? c.border : 'var(--border)'}`,
                background: form.status===s ? c.bg : 'var(--bg)',
                color: form.status===s ? c.color : 'var(--text-2)',
                cursor:'pointer', fontSize:12, fontWeight: form.status===s ? 700 : 400,
              }}>{s}</button>;
            })}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, display:'block', marginBottom:4 }}>備註</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            placeholder="合作條件、上次聯絡時間等..."
            style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit' }} />
        </div>
        <button onClick={() => { if (!form.name.trim()) return; onSave(form); }} style={{
          width:'100%', padding:13, borderRadius:12, border:'none', cursor: form.name.trim() ? 'pointer' : 'not-allowed',
          background: form.name.trim() ? 'var(--green)' : 'var(--border)',
          color:'#fff', fontWeight:700, fontSize:15,
        }}>✅ 儲存廠商</button>
      </div>
    </div>
  );
}

function SendEmailPanel({ v }) {
  const [toEmail, setToEmail] = useState(v.email || '');
  const [fromName, setFromName] = useState('');
  const [draft, setDraft]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg]         = useState('');

  const generateDraft = async () => {
    setLoading(true); setMsg('');
    try {
      const res = await fetch(`${API}/api/module3/generate_email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: v }),
      });
      const data = await res.json();
      if (data.email) setDraft(data.email);
      else setMsg('⚠️ 草稿生成失敗');
    } finally { setLoading(false); }
  };

  const sendEmail = async () => {
    if (!toEmail || !draft) return;
    setSending(true); setMsg('');
    try {
      const res = await fetch(`${API}/api/module3/send_email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: toEmail, to_name: v.name,
          email_body: draft, vendor_name: v.name,
          from_name: fromName || 'CVS 採購部',
        }),
      });
      const data = await res.json();
      if (data.success) setMsg(`✅ ${data.message}`);
      else if (data.error === 'no_resend_key') {
        const subject = encodeURIComponent(`【超商通路合作邀請】誠邀 ${v.name} 成為我們的合作夥伴`);
        const body = encodeURIComponent(draft);
        window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`);
        setMsg('📧 已開啟郵件程式（可設定 RESEND_API_KEY 啟用直接發送）');
      } else {
        setMsg(`⚠️ ${data.error || data.message}`);
      }
    } finally { setSending(false); }
  };

  return (
    <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px', background:'var(--bg)' }}>
      <p style={{ margin:'0 0 8px', fontSize:12, fontWeight:700, color:'var(--brand-dark)' }}>✉️ 一鍵發送開發信</p>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        <input value={toEmail} onChange={e => setToEmail(e.target.value)}
          placeholder="收件人 Email *"
          style={{ padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:12 }} />
        <input value={fromName} onChange={e => setFromName(e.target.value)}
          placeholder="您的名稱（如：王小明 / CVS採購部）"
          style={{ padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:12 }} />
        {!draft ? (
          <button onClick={generateDraft} disabled={loading} style={{
            padding:'8px', borderRadius:7, border:'1px solid var(--brand-border)',
            background:'var(--brand-bg)', color: loading ? 'var(--text-muted)' : 'var(--brand-dark)',
            cursor: loading ? 'default' : 'pointer', fontSize:12, fontWeight:600,
          }}>{loading ? '✍️ AI 撰寫中...' : '✍️ 生成信件草稿'}</button>
        ) : (
          <>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5}
              style={{ padding:'8px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-2)', fontSize:11, resize:'vertical', fontFamily:'inherit' }} />
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setDraft('')} style={{ padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'var(--text-2)', cursor:'pointer', fontSize:11 }}>重新生成</button>
              <button onClick={sendEmail} disabled={sending || !toEmail} style={{
                flex:1, padding:'8px', borderRadius:7, border:'none',
                background: toEmail ? 'var(--green)' : 'var(--border)',
                color:'#fff', cursor: toEmail ? 'pointer' : 'default', fontSize:12, fontWeight:700,
              }}>{sending ? '發送中...' : '🚀 發送開發信'}</button>
            </div>
          </>
        )}
        {msg && <p style={{ margin:0, fontSize:11, color: msg.startsWith('✅') ? 'var(--green)' : 'var(--amber)' }}>{msg}</p>}
      </div>
    </div>
  );
}

function VendorCard({ v, onEdit, onDelete }) {
  const [open, setOpen]           = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const c = STATUS_COLOR[v.status] || STATUS_COLOR['潛在'];
  return (
    <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
      <div style={{ padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:2 }}>
            <p style={{ margin:0, fontWeight:700, fontSize:14, color:'var(--text)' }}>{v.name}</p>
            {v.brand && v.brand!==v.name && <span style={{ fontSize:11, color:'var(--brand)', background:'var(--brand-bg)', padding:'1px 6px', borderRadius:8, border:'1px solid var(--brand-border)' }}>{v.brand}</span>}
          </div>
          <p style={{ margin:'2px 0 0', fontSize:11, color:'var(--text-muted)' }}>{[v.category, v.location].filter(Boolean).join(' · ')}</p>
        </div>
        <span style={{ fontSize:11, padding:'3px 10px', borderRadius:12, background:c.bg, color:c.color, border:`1px solid ${c.border}`, flexShrink:0, fontWeight:600 }}>{v.status}</span>
        <button onClick={() => setOpen(o=>!o)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, padding:2 }}>{open?'▲':'▼'}</button>
      </div>
      {open && (
        <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px' }}>
          {v.contact_name && <p style={{ margin:'0 0 3px', fontSize:12, color:'var(--text-2)' }}>👤 {v.contact_name}</p>}
          {v.phone && <p style={{ margin:'0 0 3px', fontSize:12, color:'var(--text-2)' }}>📞 {v.phone}</p>}
          {v.email && <p style={{ margin:'0 0 3px', fontSize:12, color:'var(--brand)' }}>✉️ {v.email}</p>}
          {v.line_id && <p style={{ margin:'0 0 3px', fontSize:12, color:'var(--green)' }}>💚 LINE：{v.line_id}</p>}
          {v.website && <p style={{ margin:'0 0 6px', fontSize:12 }}><a href={v.website} target="_blank" rel="noreferrer" style={{ color:'var(--brand)' }}>🌐 {v.website}</a></p>}
          {v.notes && <p style={{ margin:'0 0 10px', fontSize:12, color:'var(--text-2)', background:'var(--bg)', padding:'6px 10px', borderRadius:7 }}>💬 {v.notes}</p>}

          {/* 快速聯繫按鈕 */}
          <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
            {v.line_id && (
              <a href={lineUrl(v.line_id)} target="_blank" rel="noreferrer" style={{
                flex:1, padding:'9px 8px', borderRadius:8, textDecoration:'none', textAlign:'center',
                border:'1px solid var(--green-border)', background:'var(--green-bg)',
                color:'var(--green)', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              }}>💚 LINE 聯繫</a>
            )}
            {v.email && (
              <a href={`mailto:${v.email}?subject=【超商通路合作邀請】誠邀 ${v.name} 洽談合作&body=您好，我是 CVS 通路採購，有意洽談合作機會，請問是否方便進一步交流？`}
                style={{
                  flex:1, padding:'9px 8px', borderRadius:8, textDecoration:'none', textAlign:'center',
                  border:'1px solid var(--brand-border)', background:'var(--brand-bg)',
                  color:'var(--brand-dark)', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                }}>📧 發 Email</a>
            )}
          </div>

          {/* 管理按鈕 */}
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => setShowEmail(e=>!e)} style={{
              flex:1, padding:'8px', borderRadius:8,
              border:`1px solid ${showEmail ? 'var(--green-border)' : 'var(--border)'}`,
              background: showEmail ? 'var(--green-bg)' : 'transparent',
              color: showEmail ? 'var(--green)' : 'var(--text-2)',
              cursor:'pointer', fontSize:12, fontWeight:600,
            }}>✉️ 草稿發信</button>
            <button onClick={() => onEdit(v)} style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid var(--brand-border)', background:'var(--brand-bg)', color:'var(--brand-dark)', cursor:'pointer', fontSize:12, fontWeight:600 }}>✏️ 編輯</button>
            <button onClick={() => onDelete(v.id)} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid var(--red-border)', background:'var(--red-bg)', color:'var(--red)', cursor:'pointer', fontSize:12 }}>🗑️</button>
          </div>
        </div>
      )}
      {open && showEmail && <SendEmailPanel v={v} />}
    </div>
  );
}

export default function VendorDB() {
  const { vendors, add, addBatch, update, remove, parseCSV, syncing } = useVendorDB();
  const [modal, setModal]         = useState(null);
  const [filter, setFilter]       = useState('全部');
  const [catFilter, setCatFilter] = useState('');    // 類別篩選
  const [search, setSearch]       = useState('');
  const [csvMsg, setCsvMsg]       = useState('');
  const csvRef = useRef();

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const items = parseCSV(text);
    if (!items.length) { setCsvMsg('⚠️ 讀取失敗，請確認格式（需有「公司名稱」欄位）'); return; }
    const count = await addBatch(items);
    setCsvMsg(`✅ 成功匯入 ${count} 筆廠商！`);
    setTimeout(() => setCsvMsg(''), 4000);
    e.target.value = '';
  };

  const buildCSV = () => {
    const headers = ['公司名稱','品牌','類別','地區','聯絡人','Email','電話','官網','備註','狀態'];
    const rows = vendors.map(v => [
      v.name, v.brand, v.category, v.location,
      v.contact_name, v.email, v.phone, v.website, v.notes, v.status,
    ].map(f => `"${(f || '').replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const handleExportCSV = () => {
    if (!vendors.length) return;
    const csv = buildCSV();
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `廠商庫_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleOpenGoogleSheets = () => {
    if (!vendors.length) return;
    handleExportCSV();
    setTimeout(() => {
      window.open('https://sheets.new', '_blank');
      setCsvMsg('📋 CSV 已下載！在 Google Sheets 中選「檔案 → 匯入 → 上傳」即可');
      setTimeout(() => setCsvMsg(''), 6000);
    }, 300);
  };

  const handleSave = async (form) => {
    if (modal === 'add') await add(form);
    else await update(modal.id, form);
    setModal(null);
  };

  const filtered = vendors
    .filter(v => filter === '全部' || v.status === filter)
    .filter(v => !catFilter || v.category === catFilter)
    .filter(v => !search || [v.name, v.brand, v.category, v.contact_name, v.email].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  const btnSm = {
    padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)',
    background:'var(--bg)', color:'var(--text-2)', cursor:'pointer', fontSize:12,
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {modal && <VendorModal initial={modal==='add'?{}:modal} onSave={handleSave} onClose={() => setModal(null)} />}

      {/* 標題 + 操作 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div>
          <p style={{ margin:'0 0 1px', fontSize:15, fontWeight:700, color:'var(--text)' }}>
            我的廠商庫 <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:400 }}>({vendors.length} 筆)</span>
            {syncing && <span style={{ fontSize:10, color:'var(--brand)', marginLeft:6 }}>☁️ 同步中…</span>}
          </p>
          <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>存放聯絡過或有興趣的廠商</p>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <input ref={csvRef} type="file" accept=".csv" style={{ display:'none' }} onChange={handleCSV} />
          <button onClick={() => csvRef.current.click()} style={btnSm}>📂 匯入</button>
          <button onClick={handleExportCSV} disabled={!vendors.length} style={{ ...btnSm, opacity: vendors.length ? 1 : 0.4 }}>📤 CSV</button>
          <button onClick={handleOpenGoogleSheets} disabled={!vendors.length} style={{ ...btnSm, color:'var(--green)', opacity: vendors.length ? 1 : 0.4 }}>📊 Sheets</button>
          <button onClick={() => setModal('add')} style={{
            padding:'7px 14px', borderRadius:8, border:'none',
            background:'var(--green)', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700,
          }}>＋ 新增廠商</button>
        </div>
      </div>

      {csvMsg && <p style={{ margin:0, fontSize:13, color: csvMsg.startsWith('✅') ? 'var(--green)' : 'var(--amber)', background:'var(--bg)', padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)' }}>{csvMsg}</p>}

      {/* CSV 格式說明 */}
      <div style={{ background:'var(--bg)', borderRadius:8, padding:'8px 12px', border:'1px solid var(--border)' }}>
        <p style={{ margin:'0 0 3px', fontSize:11, color:'var(--text-2)', fontWeight:600 }}>📋 CSV 匯入格式（第一列為標題）</p>
        <p style={{ margin:0, fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>公司名稱,品牌,類別,地區,聯絡人,Email,電話,官網,備註,狀態</p>
      </div>

      {/* 搜尋 + 類別篩選 + 狀態篩選 */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 搜尋廠商名稱、聯絡人..."
        style={{ padding:'10px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontSize:13 }} />

      {/* 類別篩選 */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, flexShrink:0 }}>類別：</span>
        <button onClick={() => setCatFilter('')} style={{
          padding:'4px 12px', borderRadius:16, fontSize:12, cursor:'pointer',
          border:`1px solid ${!catFilter ? 'var(--brand-border)' : 'var(--border)'}`,
          background: !catFilter ? 'var(--brand-bg)' : 'var(--bg)',
          color: !catFilter ? 'var(--brand-dark)' : 'var(--text-2)',
          fontWeight: !catFilter ? 700 : 400,
        }}>全部</button>
        {CATEGORY_OPTIONS.filter(cat => vendors.some(v => v.category === cat)).map(cat => (
          <button key={cat} onClick={() => setCatFilter(prev => prev === cat ? '' : cat)} style={{
            padding:'4px 12px', borderRadius:16, fontSize:12, cursor:'pointer',
            border:`1px solid ${catFilter===cat ? 'var(--brand-border)' : 'var(--border)'}`,
            background: catFilter===cat ? 'var(--brand-bg)' : 'var(--bg)',
            color: catFilter===cat ? 'var(--brand-dark)' : 'var(--text-2)',
            fontWeight: catFilter===cat ? 700 : 400,
          }}>{cat} ({vendors.filter(v=>v.category===cat).length})</button>
        ))}
      </div>

      {/* 狀態篩選 */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['全部', ...VENDOR_STATUS].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:'5px 12px', borderRadius:16,
            border:`1px solid ${filter===s ? 'var(--brand-border)' : 'var(--border)'}`,
            background: filter===s ? 'var(--brand-bg)' : 'var(--bg)',
            color: filter===s ? 'var(--brand-dark)' : 'var(--text-2)',
            cursor:'pointer', fontSize:12, fontWeight: filter===s ? 700 : 400,
          }}>
            {s} {s!=='全部' ? `(${vendors.filter(v=>v.status===s).length})` : ''}
          </button>
        ))}
      </div>

      {/* 廠商列表 */}
      {filtered.length > 0 ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((v, i) => (
            <VendorCard key={v.id||i} v={v} onEdit={setModal} onDelete={remove} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🏢</div>
          <p style={{ margin:'0 0 6px', fontSize:14, color:'var(--text-2)' }}>
            {vendors.length ? '沒有符合篩選條件的廠商' : '廠商庫是空的'}
          </p>
          <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>
            點「＋ 新增廠商」手動加入，或「📂 匯入 CSV」批次匯入
          </p>
        </div>
      )}
    </div>
  );
}
