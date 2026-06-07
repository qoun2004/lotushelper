'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE as API } from '../lib/api';

// ── 個人 AI 名片的區段定義 ─────────────────────────────────────────
const PROFILE_SECTIONS = [
  {
    key:         'basic',
    icon:        '👤',
    label:       '基本資訊',
    hint:        '姓名、職稱、公司、年資',
    placeholder: '姓名：王小明\n職稱：行銷經理\n公司：台灣超商股份有限公司\n年資：8 年',
  },
  {
    key:         'background',
    icon:        '💼',
    label:       '學經歷與成果',
    hint:        '學歷、過去工作、重要成果',
    placeholder: '學歷：政治大學企管系\n過去任職：全家便利商店行銷企劃 3 年\n重要成果：主導 2023 年聯名商品，業績成長 35%...',
  },
  {
    key:         'personality',
    icon:        '🎯',
    label:       '個性與工作風格',
    hint:        '個性特質、決策習慣、工作節奏',
    placeholder: '個性務實、重視數據、喜歡直接給結論\n報告習慣從數字切入，再說故事\n開會偏好先看 1 張摘要，再展開討論...',
  },
  {
    key:         'writing',
    icon:        '✍️',
    label:       '慣用寫作語氣',
    hint:        '寫報告/文案的習慣風格',
    placeholder: '用詞簡潔，不用過多形容詞\n數字一定要百分比+實際數值並列\n段落開頭習慣用「根據數據顯示...」「相較去年同期...」\n結論段落用「綜合以上，建議...」',
  },
  {
    key:         'email',
    icon:        '📧',
    label:       '信件與溝通口氣',
    hint:        '商業書信的慣用開場、稱謂、結尾',
    placeholder: '開頭稱謂：「XX 總監 您好，」\n信件開場：「感謝您撥冗閱覽，」\n結尾：「如有任何疑問，歡迎隨時聯繫，謝謝。」\n整體風格：正式但親切，不用太生硬的文言文',
  },
  {
    key:         'report',
    icon:        '📊',
    label:       '常用報告架構',
    hint:        '固定的報告結構、慣用段落標題',
    placeholder: '週報架構：本週重點 → 數據表現 → 問題與對策 → 下週計畫\n月報額外加：市場動態觀察、競品動向\n慣用開頭：「本週 CVS 通路整體表現如下...」',
  },
  {
    key:         'hobbies',
    icon:        '🎨',
    label:       '個人特質與嗜好',
    hint:        '興趣、個人特質、生活背景（幫助 AI 更了解你）',
    placeholder: '嗜好：烘焙、親子料理、週末市集\n個人特質：職場媽媽，重視效率\n生活背景：有兩個小孩，對親子/家庭類商品特別有感...',
  },
];

// ── 文件類型 ─────────────────────────────────────────────────────
const DOC_TYPES = [
  { key: 'report',   label: '週/月報',  icon: '📊', color: 'var(--brand)' },
  { key: 'template', label: '報告範本', icon: '📋', color: 'var(--brand)' },
  { key: 'case',     label: '成功案例', icon: '🏆', color: 'var(--green)' },
  { key: 'email_ex', label: '信件範例', icon: '📧', color: 'var(--blue)' },
  { key: 'other',    label: '其他文件', icon: '📄', color: 'var(--text-2)' },
];

// ── 文件卡片 ──────────────────────────────────────────────────────
function DocCard({ doc, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const typeInfo = DOC_TYPES.find(t => t.key === doc.type) || DOC_TYPES[4];

  const handleDelete = async () => {
    if (!confirm(`確定刪除「${doc.title}」？`)) return;
    setDeleting(true);
    try {
      await fetch(`${API}/api/knowledge/delete/${doc.id}`, { method: 'DELETE' });
      onDelete(doc.id);
    } finally { setDeleting(false); }
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{typeInfo.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{doc.title}</p>
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: `${typeInfo.color}22`, color: typeInfo.color, flexShrink: 0 }}>{typeInfo.label}</span>
          </div>
          {doc.summary && <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{doc.summary}</p>}
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{doc.char_count?.toLocaleString()} 字 · {doc.created_at}</p>
        </div>
        <button onClick={handleDelete} disabled={deleting} style={{
          padding: '4px 8px', borderRadius: 6, border: 'none', background: 'var(--red-bg)',
          color: 'var(--red)', cursor: 'pointer', fontSize: 11, flexShrink: 0,
        }}>{deleting ? '...' : '🗑️'}</button>
      </div>
    </div>
  );
}

// ── 個人 AI 名片 Tab ──────────────────────────────────────────────
function ProfileTab({ profile, onSave }) {
  const [form, setForm]       = useState(profile);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [expanded, setExpanded] = useState({}); // 預設全收合

  // 同步 profile prop（首次從後端載入後更新）
  useEffect(() => { setForm(profile); }, [profile]);

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/api/knowledge/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const filledCount = PROFILE_SECTIONS.filter(s => form[s.key]?.trim()).length;
  const allOpen = PROFILE_SECTIONS.every(s => expanded[s.key] === true);
  const toggleAll = () => {
    const next = {};
    PROFILE_SECTIONS.forEach(s => { next[s.key] = !allOpen; });
    setExpanded(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 說明卡 */}
      <div style={{ background: 'var(--brand-bg)', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--brand-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--brand-dark)' }}>
            🪪 個人 AI 名片
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
              已填 {filledCount} / {PROFILE_SECTIONS.length} 個區段
            </span>
          </p>
          {/* 全展開 / 全收合 */}
          <button onClick={toggleAll} type="button" style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 8,
            border: '1px solid var(--brand-border)', background: 'transparent',
            color: 'var(--brand-dark)', cursor: 'pointer', fontWeight: 600,
          }}>{allOpen ? '⬆ 全收合' : '⬇ 全展開'}</button>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
          填越詳細，AI 生成的報告語氣就越像你。填完後可收合，不影響 AI 學習。
        </p>
      </div>

      {/* 7 個區段 — 預設收合 */}
      {PROFILE_SECTIONS.map(section => {
        const isOpen = expanded[section.key] === true; // 預設收合
        const filled = !!(form[section.key]?.trim());
        return (
          <div key={section.key} style={{ background: 'var(--surface)', borderRadius: 12, border: `1px solid ${filled ? 'var(--green-border)' : 'var(--border)'}`, overflow: 'hidden' }}>
            {/* 標題列 */}
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [section.key]: !isOpen }))}
              type="button"
              style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: 18 }}>{section.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{section.label}</p>
                {/* 收合時若有填內容，預覽前 30 字 */}
                {!isOpen && filled
                  ? <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{form[section.key].slice(0, 40)}…</p>
                  : <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{section.hint}</p>
                }
              </div>
              {filled
                ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)', fontWeight: 700, flexShrink: 0 }}>✓ 已填</span>
                : <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 400, flexShrink: 0 }}>未填</span>
              }
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* 輸入區 */}
            {isOpen && (
              <div style={{ padding: '0 14px 14px' }}>
                <textarea
                  value={form[section.key] || ''}
                  onChange={e => set(section.key, e.target.value)}
                  rows={4}
                  placeholder={section.placeholder}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                    borderRadius: 9, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)',
                    fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* 儲存按鈕 */}
      <button onClick={handleSave} disabled={saving} style={{
        width: '100%', padding: 14, borderRadius: 12, border: 'none',
        background: saved ? 'var(--green)' : saving ? 'var(--border)' : 'var(--brand)',
        color: '#fff', fontWeight: 700, fontSize: 15, cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s',
      }}>
        {saved ? '✅ 已儲存！' : saving ? '⏳ 儲存中...' : '💾 儲存個人 AI 名片'}
      </button>

      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        儲存後，所有 AI 生成功能都會自動參考你的個人資料，讓輸出更符合你的風格
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 主元件
// ══════════════════════════════════════════════════════════════════
export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'docs'

  // 個人 AI 名片（預設立刻顯示空表單，後端資料回來後更新）
  const [profile, setProfile]     = useState({});
  const [profileLoaded, setProfileLoaded] = useState(true);

  // 文件庫
  const [docs, setDocs]           = useState([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType]     = useState('report');
  const [title, setTitle]         = useState('');
  const [msg, setMsg]             = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef();

  // 載入個人資料 + 文件列表（後端未啟動時直接顯示空表單）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [pRes, dRes] = await Promise.all([
          fetch(`${API}/api/knowledge/profile`),
          fetch(`${API}/api/knowledge/list`),
        ]);
        const pData = await pRes.json();
        const dData = await dRes.json();
        if (!mounted) return;
        if (pData && typeof pData === 'object') setProfile(pData);
        setDocs(dData.docs || []);
      } catch {
        // 後端未啟動 — 直接顯示空表單，不影響使用
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fetchDocs = async () => {
    try {
      const res  = await fetch(`${API}/api/knowledge/list`);
      const data = await res.json();
      setDocs(data.docs || []);
    } catch {}
  };

  const handleExport = async (fmt = 'markdown') => {
    if (!docs.length && !Object.values(profile).some(v => v)) return;
    setExporting(true);
    try {
      const res  = await fetch(`${API}/api/knowledge/export?format=${fmt}`);
      if (!res.ok) { alert('匯出失敗，請稍後再試'); return; }
      const blob = await res.blob();
      const ext  = fmt === 'json' ? 'json' : 'md';
      const today = new Date().toISOString().slice(0, 10);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `my_ai_knowledge_${today}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', title || file.name.replace(/\.[^.]+$/, ''));
      form.append('doc_type', docType);
      const res  = await fetch(`${API}/api/knowledge/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.success) {
        setMsg(`✅ 已加入知識庫：${data.title}（${data.char_count?.toLocaleString()} 字）`);
        setTitle('');
        fetchDocs();
        setShowUpload(false);
      } else {
        setMsg(`⚠️ ${data.error}`);
      }
    } catch (err) {
      setMsg(`⚠️ 上傳失敗：${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const hasContent = docs.length > 0 || Object.values(profile).some(v => v?.trim());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── 頁首 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>🧠 個人知識庫</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)' }}>AI 名片 + 文件庫，讓 AI 真正了解你</p>
        </div>
        {hasContent && (
          <button onClick={() => handleExport('markdown')} disabled={exporting} style={{
            padding: '8px 14px', borderRadius: 9,
            border: '1px solid var(--green-border)', background: 'transparent',
            color: exporting ? 'var(--text-muted)' : 'var(--green)',
            cursor: exporting ? 'default' : 'pointer', fontSize: 13, fontWeight: 600,
          }}>{exporting ? '⏳ 生成中...' : '📦 匯出知識包'}</button>
        )}
      </div>

      {/* ── Tab 切換 ── */}
      <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)' }}>
        {[
          { key: 'profile', icon: '🪪', label: '個人 AI 名片' },
          { key: 'docs',    icon: '📚', label: `文件庫 ${docs.length ? `(${docs.length})` : ''}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, padding: '11px', border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? 'var(--brand)' : 'transparent',
            color: activeTab === tab.key ? '#fff' : 'var(--text-2)',
            fontWeight: activeTab === tab.key ? 700 : 400, fontSize: 13,
            transition: 'all 0.15s',
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* ══ Tab：個人 AI 名片 ══ */}
      {activeTab === 'profile' && profileLoaded && (
        <ProfileTab profile={profile} onSave={setProfile} />
      )}
      {activeTab === 'profile' && !profileLoaded && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: 13 }}>⏳ 載入中...</div>
      )}

      {/* ══ Tab：文件庫 ══ */}
      {activeTab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 匯出說明 */}
          {docs.length > 0 && (
            <div style={{ background: 'var(--green-bg)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--green-border)' }}>
              <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>📦 知識包用途</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                匯出的 <strong style={{ color: 'var(--text)' }}>.md 檔</strong> 包含個人名片 + 所有文件，可貼入
                <strong style={{ color: 'var(--text)' }}> ChatGPT「自訂指示」</strong>、
                <strong style={{ color: 'var(--text)' }}>Claude Projects</strong> 讓其他 AI 也用你的語氣
              </p>
            </div>
          )}

          {/* 上傳按鈕 */}
          <button onClick={() => setShowUpload(s => !s)} style={{
            padding: '10px 14px', borderRadius: 9, border: 'none',
            background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          }}>＋ 上傳文件</button>

          {/* 上傳表單 */}
          {showUpload && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>文件類型</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {DOC_TYPES.map(t => (
                  <button key={t.key} onClick={() => setDocType(t.key)} type="button" style={{
                    padding: '6px 12px', borderRadius: 16,
                    border: `1px solid ${docType === t.key ? t.color : 'var(--border)'}`,
                    background: docType === t.key ? `${t.color}22` : 'transparent',
                    color: docType === t.key ? t.color : 'var(--text-2)',
                    cursor: 'pointer', fontSize: 12, fontWeight: docType === t.key ? 700 : 400,
                  }}>{t.icon} {t.label}</button>
                ))}
              </div>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="文件名稱（選填，預設用檔名）"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />
              <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.txt,.md,.docx" style={{ display: 'none' }} onChange={handleUpload} />
              <button onClick={() => fileRef.current.click()} disabled={uploading} style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none',
                background: uploading ? 'var(--border)' : 'var(--green)',
                color: '#fff', cursor: uploading ? 'default' : 'pointer', fontSize: 14, fontWeight: 700,
              }}>{uploading ? '⏳ AI 正在讀取並生成摘要...' : '📂 選擇檔案（PDF / Excel / Word / TXT）'}</button>
            </div>
          )}

          {msg && <p style={{ margin: 0, fontSize: 13, color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8 }}>{msg}</p>}

          {/* 文件列表 */}
          {docs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map(d => <DocCard key={d.id} doc={d} onDelete={id => setDocs(prev => prev.filter(d => d.id !== id))} />)}
            </div>
          ) : (
            !showUpload && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📚</div>
                <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text-2)' }}>文件庫是空的</p>
                <p style={{ margin: 0, fontSize: 12 }}>上傳週報、月報、成功案例、信件範例</p>
                <p style={{ margin: '2px 0 0', fontSize: 12 }}>AI 學習後，生成的報告語氣會更像你</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
