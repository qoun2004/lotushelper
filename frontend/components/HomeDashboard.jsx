'use client';
import { useState, useEffect, useRef } from 'react';
import VoiceBtn from './VoiceBtn';
import { API_BASE as API } from '../lib/api';

// ── 優先級設定 ────────────────────────────────────────────────────
const PRIORITIES = [
  { key: 'high',   icon: '🔴', label: '緊急', color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-border)' },
  { key: 'medium', icon: '🟡', label: '重要', color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
  { key: 'low',    icon: '🟢', label: '一般', color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)' },
];
const P_MAP = Object.fromEntries(PRIORITIES.map(p => [p.key, p]));
const P_ORDER = { high: 0, medium: 1, low: 2 };

// ── 工具卡片 ──────────────────────────────────────────────────────
const MODULES = [
  { id: 1, icon: '📊', accent: '#5A6EA0', accentBg: '#EEF1F8', title: '週報自駕',    desc: '上傳 Excel → AI 週報月報 → PPT 一鍵匯出', tags: ['Excel 分析', 'PPT 匯出', '三年對比'] },
  { id: 2, icon: '👁️', accent: '#7058A0', accentBg: '#F2EEF8', title: 'DM 策略分析', desc: '前年＋去年 DM PDF → 交叉銷售數據 → 今年企劃', tags: ['PDF 解析', '商品分類', '三年對比'] },
  { id: 3, icon: '🤝', accent: '#4A7059', accentBg: '#EBF4EF', title: '廠商星探',    desc: 'AI 篩選超商標準廠商 → 廠商庫管理 → 一鍵開發信', tags: ['真實資料庫', '廠商庫', 'Email 發送'] },
  { id: 4, icon: '📈', accent: '#9A7030', accentBg: '#FBF3E5', title: '口碑機',      desc: '輸入商品 → 5 組零業配爆款文案 → 短影音腳本', tags: ['Threads', 'Dcard', 'IG 文案'] },
];

// ══════════════════════════════════════════════════════════════════
// 📌 優先任務 Widget
// ══════════════════════════════════════════════════════════════════
function QuickTasksWidget() {
  const LS_KEY = 'cvs_quick_tasks';
  const [tasks, setTasks]     = useState([]);
  const [input, setInput]     = useState('');
  const [priority, setPriority] = useState('high');
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    try { setTasks(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); } catch {}
  }, []);

  const save = (next) => {
    setTasks(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  };

  const addTask = () => {
    if (!input.trim()) return;
    save([{ id: Date.now(), text: input.trim(), priority, done: false, createdAt: new Date().toISOString() }, ...tasks]);
    setInput('');
  };

  const toggle = (id) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id) => save(tasks.filter(t => t.id !== id));

  const active = [...tasks.filter(t => !t.done)].sort((a, b) => P_ORDER[a.priority] - P_ORDER[b.priority]);
  const done   = tasks.filter(t => t.done);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 260px', minWidth: 0 }}>
      {/* 標題 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
          📌 優先任務
          {active.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{active.length} 件待辦</span>}
        </p>
        {done.length > 0 && (
          <button onClick={() => setShowDone(s => !s)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            已完成 ({done.length}) {showDone ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* 新增任務 */}
      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
        {/* 優先級選擇 */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
          {PRIORITIES.map(p => (
            <button key={p.key} onClick={() => setPriority(p.key)} type="button" style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
              border: `1px solid ${priority === p.key ? p.border : 'var(--border)'}`,
              background: priority === p.key ? p.bg : 'transparent',
              color: priority === p.key ? p.color : 'var(--text-muted)',
              fontWeight: priority === p.key ? 700 : 400,
            }}>{p.icon} {p.label}</button>
          ))}
        </div>
        {/* 輸入 */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="新增任務..."
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
          />
          <VoiceBtn onResult={text => setInput(prev => prev ? prev + ' ' + text : text)} />
          <button onClick={addTask} disabled={!input.trim()} style={{
            padding: '8px 12px', borderRadius: 8, border: 'none',
            background: input.trim() ? 'var(--brand)' : 'var(--border)',
            color: '#fff', cursor: input.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700,
          }}>＋</button>
        </div>
      </div>

      {/* 任務列表 */}
      {active.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
          目前沒有待辦任務 ✨
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {active.map(task => {
          const p = P_MAP[task.priority] || P_MAP.low;
          return (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', borderRadius: 9,
              background: 'var(--surface)', border: `1px solid ${p.border}`,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
              <p style={{ margin: 0, flex: 1, fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{task.text}</p>
              <button onClick={() => toggle(task.id)} title="標記完成" style={{
                padding: '3px 8px', borderRadius: 6, border: '1px solid var(--green-border)',
                background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer', fontSize: 11, flexShrink: 0,
              }}>✓</button>
              <button onClick={() => remove(task.id)} title="刪除" style={{
                padding: '3px 6px', borderRadius: 6, border: 'none',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, flexShrink: 0,
              }}>×</button>
            </div>
          );
        })}

        {/* 已完成 */}
        {showDone && done.map(task => (
          <div key={task.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 9,
            background: 'var(--bg)', border: '1px solid var(--border)', opacity: 0.6,
          }}>
            <span style={{ fontSize: 13 }}>✅</span>
            <p style={{ margin: 0, flex: 1, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{task.text}</p>
            <button onClick={() => toggle(task.id)} style={{
              padding: '2px 7px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11,
            }}>復原</button>
            <button onClick={() => remove(task.id)} style={{
              padding: '2px 5px', borderRadius: 6, border: 'none',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
            }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 📅 今日行程 Widget（Google Calendar ICS）
// ══════════════════════════════════════════════════════════════════
function CalendarWidget() {
  const LS_KEY = 'cvs_ics_url';
  const [icsUrl, setIcsUrl]     = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [events, setEvents]     = useState(null);   // null = 尚未嘗試
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    let mounted = true;
    try {
      const saved = localStorage.getItem(LS_KEY) || '';
      if (saved) {
        setIcsUrl(saved);
        fetchEvents(saved, mounted);
      }
    } catch {}
    return () => { mounted = false; };
  }, []);

  const fetchEvents = async (url, _mounted = true) => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/api/calendar/events?ics_url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!_mounted) return;
      if (data.error && data.error !== 'no_url') setError(data.error);
      setEvents(data.events || []);
    } catch {
      if (_mounted) setError('無法連線後端');
    } finally {
      if (_mounted) setLoading(false);
    }
  };

  const saveUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    try { localStorage.setItem(LS_KEY, url); } catch {}
    setIcsUrl(url);
    setShowSetup(false);
    setUrlInput('');
    fetchEvents(url);
  };

  const disconnect = () => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    setIcsUrl(''); setEvents(null); setError('');
  };

  const today   = new Date().toISOString().slice(0, 10);
  const todayEv = events?.filter(e => e.date === today)       || [];
  const weekEv  = events?.filter(e => e.date !== today)       || [];

  const weekDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const m = d.getMonth() + 1, day = d.getDate(), wd = days[d.getDay()];
    return `${m}/${day}（週${wd}）`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 260px', minWidth: 0 }}>
      {/* 標題 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
          📅 今日行程
          {icsUrl && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)', fontWeight: 700 }}>已連結</span>}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          {icsUrl && <button onClick={() => fetchEvents(icsUrl)} style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>🔄 更新</button>}
          <button onClick={() => setShowSetup(s => !s)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {icsUrl ? '⚙️ 設定' : '＋ 連結'}
          </button>
        </div>
      </div>

      {/* 設定面板 */}
      {showSetup && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>如何取得 Google 行事曆 ICS 連結：</p>
          <ol style={{ margin: '0 0 10px', padding: '0 0 0 16px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 2 }}>
            <li>開啟電腦版 <strong style={{ color: 'var(--text)' }}>Google 日曆</strong></li>
            <li>左側欄找到要連結的行事曆 → 點選 ⋮ → <strong style={{ color: 'var(--text)' }}>「設定和共用」</strong></li>
            <li>頁面往下找到 <strong style={{ color: 'var(--text)' }}>「以 iCal 格式提供的私人通訊錄」</strong></li>
            <li>複製那個 <code style={{ background: 'var(--bg)', padding: '1px 4px', borderRadius: 3 }}>webcal://...</code> 連結貼到下方</li>
          </ol>
          <input
            value={urlInput} onChange={e => setUrlInput(e.target.value)}
            placeholder="webcal://calendar.google.com/calendar/ical/..."
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {icsUrl && (
              <button onClick={disconnect} style={{
                padding: '7px 12px', borderRadius: 7, border: '1px solid var(--red-border)',
                background: 'var(--red-bg)', color: 'var(--red)', cursor: 'pointer', fontSize: 12,
              }}>斷開連結</button>
            )}
            <button onClick={saveUrl} disabled={!urlInput.trim()} style={{
              flex: 1, padding: '7px', borderRadius: 7, border: 'none',
              background: urlInput.trim() ? 'var(--brand)' : 'var(--border)',
              color: '#fff', cursor: urlInput.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700,
            }}>✅ 確認連結</button>
          </div>
        </div>
      )}

      {/* 未連結狀態 */}
      {!icsUrl && !showSetup && (
        <button onClick={() => setShowSetup(true)} style={{
          padding: '20px', borderRadius: 10, border: '1.5px dashed var(--border)',
          background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1.8,
        }}>
          📅 點此連結 Google 行事曆<br />
          <span style={{ fontSize: 11, opacity: 0.8 }}>用私人 ICS 連結，不需要帳號授權</span>
        </button>
      )}

      {/* 載入中 */}
      {loading && <div style={{ textAlign: 'center', padding: '16px', color: 'var(--brand)', fontSize: 12 }}>⏳ 載入行程中...</div>}

      {/* 錯誤 */}
      {error && !loading && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--red-bg)', border: '1px solid var(--red-border)' }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--red)' }}>⚠️ {error === 'timeout' ? '連線逾時，請確認 ICS 連結是否正確' : error}</p>
        </div>
      )}

      {/* 今日行程 */}
      {!loading && events && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* 今天 */}
          {todayEv.length > 0 ? (
            todayEv.map((ev, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '9px 12px', borderRadius: 9,
                background: 'var(--amber-bg)', border: '1px solid var(--amber-border)',
              }}>
                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
                  {ev.all_day
                    ? <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700 }}>全天</span>
                    : <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--amber)' }}>{ev.time}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.summary}</p>
                  {ev.location && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>📍 {ev.location}</p>}
                </div>
              </div>
            ))
          ) : (
            icsUrl && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>今天沒有行程 ✨</p>
          )}

          {/* 本週 */}
          {weekEv.length > 0 && (
            <>
              <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>本週行程</p>
              {weekEv.slice(0, 5).map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 12px', borderRadius: 9,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <div style={{ flexShrink: 0, minWidth: 64 }}>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{weekDayLabel(ev.date)}</p>
                    {!ev.all_day && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>{ev.time}</p>}
                  </div>
                  <p style={{ margin: 0, flex: 1, fontSize: 12, color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.summary}</p>
                </div>
              ))}
              {weekEv.length > 5 && (
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>還有 {weekEv.length - 5} 個行程…</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 工具卡片
// ══════════════════════════════════════════════════════════════════
function ModuleCard({ mod, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => onClick(mod.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? mod.accentBg : 'var(--surface)',
        border: `1.5px solid ${hover ? mod.accent : 'var(--border)'}`,
        borderRadius: 'var(--radius)', padding: '18px 18px 16px',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.15s ease', width: '100%',
        boxShadow: hover ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: mod.accentBg, border: `1.5px solid ${mod.accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>{mod.icon}</div>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '-0.3px' }}>{mod.title}</p>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{mod.desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {mod.tags.map(t => (
            <span key={t} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: mod.accentBg, color: mod.accent,
              border: `1px solid ${mod.accent}44`, fontWeight: 500,
            }}>{t}</span>
          ))}
        </div>
        <span style={{
          fontSize: 12, color: mod.accent, fontWeight: 600,
          whiteSpace: 'nowrap', flexShrink: 0,
          opacity: hover ? 1 : 0.6, transition: 'opacity 0.15s',
        }}>開始 →</span>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════
// 今日廠商推薦
// ══════════════════════════════════════════════════════════════════
function DailyVendors({ onNavigate }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/module3/daily_vendors`);
      setData(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const picks = data?.daily_picks || [];

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: picks.length ? '1px solid var(--border)' : 'none' }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          🔍 今日廠商推薦
          {data && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>{data.date}</span>}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {picks.length > 0 && (
            <button onClick={() => onNavigate(3)} style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>廠商星探 →</button>
          )}
          <button onClick={load} disabled={loading} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)', cursor: 'pointer' }}>
            {loading ? '掃描中…' : data ? '更新' : '載入推薦'}
          </button>
        </div>
      </div>
      {picks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {picks.slice(0, 3).map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-dark)', background: 'var(--brand-bg)', borderRadius: 5, padding: '1px 6px', flexShrink: 0, border: '1px solid var(--brand-border)' }}>#{i + 1}</span>
              <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
              {p.reason && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.reason}</p>}
              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>{p.score}分</span>
            </div>
          ))}
        </div>
      )}
      {!data && !loading && (
        <p style={{ margin: 0, padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>每天 08:00 自動掃描台灣廠商資料庫，按「載入推薦」查看今日結果</p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 首頁主體
// ══════════════════════════════════════════════════════════════════
export default function HomeDashboard({ onNavigate }) {
  const [mounted, setMounted] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const [tipIdx, setTipIdx]   = useState(0);

  const TIPS = [
    '口碑機：貼入爆紅貼文，AI 解剖公式後改寫成你的版本 🔬',
    '廠商星探：展開廠商卡片後可直接 LINE 聯繫或一鍵寄開發信 🤝',
    '商機雷達：每天 08:05 自動掃描爆紅商品與品牌聯名 📡',
    'DM 分析：掃描型 PDF 也支援，AI 自動視覺辨識 👁️',
    '口碑機：貼入商品網址，AI 自動讀取名稱、價格幫你生成文案 🔗',
    '週報自駕：同時上傳今年＋去年 Excel，可跑出 YoY 深度比較 📊',
    '會議記錄：手機逐字稿貼上後，AI 直接整理決議與待辦 📝',
    '知識庫：填越詳細，AI 生成的報告語氣就越像你寫的 🧠',
  ];

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      const g = h < 6 ? '深夜好' : h < 12 ? '早安' : h < 18 ? '午安' : '晚安';
      setTimeStr(`${g}，${now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">

      {/* ── 問候列（精簡版）── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'var(--surface)',
        borderRadius: 'var(--radius)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{timeStr}</p>
          <p style={{ margin: '1px 0 0', fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>CVS 行銷 AI 面板</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--brand-bg)', borderRadius: 9, border: '1px solid var(--brand-border)', maxWidth: 260 }}>
          <span style={{ fontSize: 13 }}>💡</span>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--brand-dark)', lineHeight: 1.5 }}>{TIPS[tipIdx]}</p>
        </div>
      </div>

      {/* ── 今日焦點：任務 + 行事曆 ── */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 16, border: '1px solid var(--border)' }}>
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>今日焦點</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <QuickTasksWidget />
          <CalendarWidget />
        </div>
      </div>

      {/* ── 四大工具 ── */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>四大工具</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {MODULES.map(m => <ModuleCard key={m.id} mod={m} onClick={onNavigate} />)}
        </div>
      </div>

      {/* ── 今日廠商推薦 ── */}
      <DailyVendors onNavigate={onNavigate} />

      {/* ── 商機雷達入口 ── */}
      <button
        onClick={() => onNavigate(5)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', background: 'var(--surface)',
          borderRadius: 'var(--radius)', border: '1.5px solid var(--green-border)',
          cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--green-bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--green-bg)', border: '1.5px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📡</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
            商機雷達
            <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)', fontWeight: 700, verticalAlign: 'middle' }}>每日自動掃描</span>
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>爆紅商品 / 媒體採訪小店 / 超商新品 → 找下一個開發合作機會</p>
        </div>
        <span style={{ fontSize: 14, color: 'var(--green)', flexShrink: 0, fontWeight: 700 }}>→</span>
      </button>

      {/* ── 底部工具列 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => onNavigate(6)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', background: 'var(--surface)',
            borderRadius: 'var(--radius)', border: '1px solid var(--blue-border)',
            cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
        >
          <span style={{ fontSize: 24 }}>📝</span>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>會議記錄</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>貼逐字稿，AI 整理摘要 / 決議 / 待辦</p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--blue)', flexShrink: 0 }}>→</span>
        </button>

        <button
          onClick={() => onNavigate(7)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', background: 'var(--surface)',
            borderRadius: 'var(--radius)', border: '1px solid var(--brand-border)',
            cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
        >
          <span style={{ fontSize: 24 }}>🧠</span>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>個人知識庫</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>上傳週報 / 案例，AI 學習你的語氣</p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--brand)', flexShrink: 0 }}>→</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 18 }}>📱</span>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-2)' }}>加到手機主畫面：</strong>
            瀏覽器「分享」→「加入主畫面」，像原生 App 使用
          </p>
        </div>
      </div>

    </div>
  );
}
