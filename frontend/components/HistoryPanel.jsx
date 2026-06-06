'use client';
import { useState } from 'react';

/**
 * HistoryPanel — 折疊式歷史記錄列表
 * @param {array}    history      - useHistory 回傳的陣列
 * @param {function} onRestore    - 點「重看」時的回調，接收 entry.data
 * @param {function} clearHistory - 清除所有記錄
 */
export default function HistoryPanel({ history, onRestore, clearHistory }) {
  const [open, setOpen] = useState(false);

  if (!history.length) return null;

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* 標題列 */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 15 }}>🕐</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textAlign: 'left' }}>
          最近分析記錄（{history.length} 筆）
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* 清單 */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {history.map((h, i) => {
            const date = new Date(h.ts);
            const timeStr = date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</p>
                  {h.summary && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.summary}</p>}
                  <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{timeStr}</p>
                </div>
                <button
                  onClick={() => onRestore(h.data)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--brand)', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}
                >重看</button>
              </div>
            );
          })}

          {/* 清除按鈕 */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
            <button onClick={clearHistory} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11,
            }}>🗑️ 清除記錄</button>
          </div>
        </div>
      )}
    </div>
  );
}
