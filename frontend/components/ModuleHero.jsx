'use client';

/**
 * ModuleHero — 各功能頁頂部說明橫幅
 * @param {string}   icon   - 大 emoji
 * @param {string}   title  - 模組名稱
 * @param {string}   desc   - 一句話說明
 * @param {string[]} steps  - 工作流程步驟陣列（最多 4 步）
 */
export default function ModuleHero({ icon, title, desc, steps = [] }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '18px 20px',
      marginBottom: 4,
    }}>
      {/* 標題列 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: steps.length ? 12 : 0 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 11,
          background: 'var(--brand-bg)', border: '1.5px solid var(--brand-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>{icon}</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            {title}
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</p>
        </div>
      </div>

      {/* 步驟流程 */}
      {steps.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          flexWrap: 'wrap', paddingTop: 12,
          borderTop: '1px solid var(--border)',
        }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 20,
                background: i === 0 ? 'var(--brand-bg)' : 'var(--bg-2)',
                border: `1px solid ${i === 0 ? 'var(--brand-border)' : 'var(--border)'}`,
                fontSize: 12,
                color: i === 0 ? 'var(--brand-dark)' : 'var(--text-2)',
                fontWeight: i === 0 ? 700 : 400,
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>0{i + 1}</span>
                {step}
              </span>
              {i < steps.length - 1 && (
                <span style={{ fontSize: 12, color: 'var(--border-2)', flexShrink: 0 }}>→</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
