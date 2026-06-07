'use client';
import { useState, useEffect } from 'react';
import HomeDashboard from '../components/HomeDashboard';
import Module1Report from '../components/Module1Report';
import Module2DM from '../components/Module2DM';
import Module3Vendor from '../components/Module3Vendor';
import Module4Social from '../components/Module4Social';
import Module5Radar from '../components/Module5Radar';
import Module6Meeting from '../components/Module6Meeting';
import KnowledgeBase from '../components/KnowledgeBase';
import AuthModal from '../components/AuthModal';
import { supabase } from '../lib/supabase';

const TABS = [
  { id: 0, icon: '🏠', label: '首頁',    short: '首頁',  desc: '工具總覽' },
  { id: 1, icon: '📊', label: '週報自駕', short: '週報',  desc: 'Excel → 報告 PPT' },
  { id: 2, icon: '👁️', label: 'DM 分析', short: 'DM',   desc: 'PDF × 銷售對比' },
  { id: 3, icon: '🤝', label: '廠商星探', short: '星探',  desc: '廠商搜尋 & 開發' },
  { id: 4, icon: '📈', label: '口碑機',   short: '口碑',  desc: '零預算社群文案' },
  { id: 5, icon: '📡', label: '商機雷達', short: '雷達',  desc: '爆紅趨勢 & 聯名' },
  { id: 6, icon: '📝', label: '會議記錄', short: '會議',  desc: '逐字稿 → 決議待辦' },
];

// 知識庫是獨立的隱藏 tab（桌機側邊欄可進入，不佔手機 tab 列）
const KB_ID = 7;

const MOBILE_PRIMARY = [
  { id: 0, icon: '🏠', label: '首頁' },
  { id: 1, icon: '📊', label: '報告' },
  { id: 3, icon: '🤝', label: '開發' },
  { id: 4, icon: '📈', label: '內容' },
];

const MOBILE_MORE = [
  { id: 2, icon: '👁️', label: 'DM 分析', desc: 'PDF × 銷售對比' },
  { id: 5, icon: '📡', label: '商機雷達', desc: '爆紅趨勢 & 聯名' },
  { id: 6, icon: '📝', label: '會議記錄', desc: '逐字稿 → 決議待辦' },
  { id: KB_ID, icon: '🧠', label: '個人知識庫', desc: '上傳報告 / 成功案例' },
];

/* ── 側邊欄分隔標題 ── */
function SidebarLabel({ children }) {
  return (
    <p style={{
      margin: '16px 0 4px', padding: '0 18px',
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      color: 'var(--text-muted)', textTransform: 'uppercase',
    }}>{children}</p>
  );
}

export default function Home() {
  const [activeTab, setActiveTab]       = useState(0);
  const [user, setUser]                 = useState(null);
  const [showAuth, setShowAuth]         = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [mounted, setMounted]           = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = parseInt(params.get('tab') || '0', 10);
    if (tab >= 0 && tab <= 7) setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setShowAuth(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setShowUserMenu(false);
  };

  const emailShort = user?.email ? user.email.split('@')[0] : '';
  const currentTab = TABS.find(t => t.id === activeTab);
  const isMoreActive = MOBILE_MORE.some(t => t.id === activeTab);

  const navigate = (id) => {
    setActiveTab(id);
    setShowMobileMore(false);
  };

  return (
    <div className="app-shell">

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ════════════════════════════════════
          Header
          ════════════════════════════════════ */}
      <header className="app-header">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--brand)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>💫</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              寵妻神器
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>CVS 行銷 AI 自動駕駛面板</p>
          </div>
        </div>

        {/* 右側：目前模組（桌機）+ 登入 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 目前模組 pill — 桌機才顯示（透過 CSS class 控制）*/}
          {currentTab && (
            <span className="header-module-pill" style={{
              fontSize: 13, color: 'var(--text-2)', padding: '5px 14px',
              background: 'var(--bg-2)', borderRadius: 20,
              border: '1px solid var(--border)', fontWeight: 500,
              letterSpacing: '-0.2px',
            }}>
              {currentTab.icon} {currentTab.label}
            </span>
          )}
          {activeTab === KB_ID && (
            <span className="header-module-pill" style={{
              fontSize: 13, color: 'var(--text-2)', padding: '5px 14px',
              background: 'var(--bg-2)', borderRadius: 20,
              border: '1px solid var(--border)', fontWeight: 500,
            }}>
              🧠 個人知識庫
            </span>
          )}


          {/* 登入按鈕 */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(m => !m)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 14px', borderRadius: 20,
                border: '1px solid var(--green-border)',
                background: 'var(--green-bg)',
                color: 'var(--green)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                {emailShort}
              </button>
              {showUserMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 12, minWidth: 200, zIndex: 200,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-muted)', padding: '4px 8px' }}>☁️ 雲端同步啟用中</p>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-2)', padding: '4px 8px', wordBreak: 'break-all' }}>{user.email}</p>
                  <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                  <button onClick={signOut} style={{
                    width: '100%', padding: '9px', borderRadius: 8,
                    border: '1px solid var(--red-border)',
                    background: 'var(--red-bg)', color: 'var(--red)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}>登出</button>
                </div>
              )}
            </div>
          ) : (
            mounted && supabase && (
              <button onClick={() => setShowAuth(true)} className="btn btn-secondary" style={{ fontSize: 13 }}>
                ☁️ 登入同步
              </button>
            )
          )}
        </div>
      </header>

      {/* ════════════════════════════════════
          Body
          ════════════════════════════════════ */}
      <div className="app-body">

        {/* 手機：分類式 Tab 列 */}
        <nav className="mobile-nav">
          {MOBILE_PRIMARY.map(tab => (
            <button key={tab.id} onClick={() => navigate(tab.id)} style={{
              flex: 1, padding: '10px 4px', border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              borderBottom: activeTab === tab.id ? '2px solid var(--brand)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--brand)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, fontWeight: activeTab === tab.id ? 700 : 400 }}>
                {tab.label}
              </span>
            </button>
          ))}
          <div style={{ position: 'relative', flex: 1 }}>
            <button onClick={() => setShowMobileMore(s => !s)} style={{
              width: '100%', padding: '10px 4px', border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              borderBottom: isMoreActive || showMobileMore ? '2px solid var(--brand)' : '2px solid transparent',
              color: isMoreActive || showMobileMore ? 'var(--brand)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 18 }}>☰</span>
              <span style={{ fontSize: 10, fontWeight: isMoreActive || showMobileMore ? 700 : 400 }}>更多</span>
            </button>
            {showMobileMore && (
              <div style={{
                position: 'absolute', right: 6, top: 'calc(100% + 8px)', minWidth: 210,
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                boxShadow: '0 10px 30px rgba(0,0,0,0.14)', overflow: 'hidden', zIndex: 80,
              }}>
                {MOBILE_MORE.map(item => (
                  <button key={item.id} onClick={() => navigate(item.id)} style={{
                    width: '100%', padding: '11px 13px', border: 'none', borderBottom: '1px solid var(--border)',
                    background: activeTab === item.id ? 'var(--brand-bg)' : 'var(--surface)',
                    color: activeTab === item.id ? 'var(--brand-dark)' : 'var(--text-2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'inherit' }}>{item.label}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* ── 桌機：側邊欄 ── */}
        <aside className="app-sidebar">
          {/* 功能導覽 */}
          <SidebarLabel>功能模組</SidebarLabel>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={`sidebar-btn${activeTab === tab.id ? ' active' : ''}`}
            >
              <span className="sb-icon">{tab.icon}</span>
              <div>
                <div className="sb-label">{tab.label}</div>
                <div className="sb-desc">{tab.desc}</div>
              </div>
            </button>
          ))}

          {/* 個人知識庫 — 獨立入口 */}
          <SidebarLabel>工具</SidebarLabel>
          <button
            onClick={() => navigate(KB_ID)}
            className={`sidebar-btn${activeTab === KB_ID ? ' active' : ''}`}
          >
            <span className="sb-icon">🧠</span>
            <div>
              <div className="sb-label">個人知識庫</div>
              <div className="sb-desc">上傳報告 / 成功案例</div>
            </div>
          </button>

          {/* 底部：登入狀態 */}
          <div style={{ marginTop: 'auto', padding: '16px 12px 8px', borderTop: '1px solid var(--border)' }}>
            {user ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--green-bg)', border: '1px solid var(--green-border)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>已登入 · 同步中</p>
                  <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                </div>
                <button onClick={signOut} style={{
                  padding: '3px 8px', borderRadius: 6, border: 'none',
                  background: 'transparent', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 11,
                }}>登出</button>
              </div>
            ) : (
              mounted && supabase && (
                <button onClick={() => setShowAuth(true)} style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  border: '1px solid var(--brand-border)',
                  background: 'var(--brand-bg)', color: 'var(--brand-dark)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>☁️ 登入啟用雲端同步</button>
              )
            )}
          </div>
        </aside>

        {/* ── 主要內容 ── */}
        <main
          className="app-main"
          onClick={() => { if (showUserMenu) setShowUserMenu(false); if (showMobileMore) setShowMobileMore(false); }}
        >
          {activeTab === 0 && <HomeDashboard onNavigate={setActiveTab} />}
          {activeTab === 1 && <Module1Report />}
          {activeTab === 2 && <Module2DM />}
          {activeTab === 3 && <Module3Vendor />}
          {activeTab === 4 && <Module4Social />}
          {activeTab === 5 && <Module5Radar />}
          {activeTab === 6 && <Module6Meeting />}
          {activeTab === KB_ID && <KnowledgeBase />}
        </main>

      </div>
    </div>
  );
}
