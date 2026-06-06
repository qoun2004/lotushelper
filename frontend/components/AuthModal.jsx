'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthModal({ onClose }) {
  const [email, setEmail]   = useState('');
  const [step, setStep]     = useState('input'); // 'input' | 'sent' | 'error'
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg]  = useState('');

  const send = async () => {
    if (!email.trim() || !email.includes('@')) { setErrMsg('請輸入有效的 Email'); return; }
    if (!supabase) { setErrMsg('Supabase 未設定，請先填寫 .env.local'); return; }
    setLoading(true); setErrMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setStep('sent');
    } catch (e) {
      setErrMsg(e.message || '發送失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'var(--surface)', borderRadius:'20px 20px 0 0', padding:'24px 20px 36px', width:'100%', maxWidth:480 }}>

        {step === 'input' ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <p style={{ margin:'0 0 2px', fontSize:18, fontWeight:800, color:'var(--text)' }}>☁️ 登入以同步資料</p>
                <p style={{ margin:0, fontSize:12, color:'var(--text-2)' }}>不用密碼，輸入 Email 收信點連結即可登入</p>
              </div>
              <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-2)', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>

            <div style={{ background:'var(--bg)', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
              <p style={{ margin:'0 0 4px', fontSize:12, color:'var(--green)', fontWeight:700 }}>✅ 同步後你可以：</p>
              <p style={{ margin:0, fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>
                • 手機和電腦使用同一份自訂模板<br/>
                • 任何裝置都能重看歷史分析結果<br/>
                • 換手機不怕資料遺失
              </p>
            </div>

            <p style={{ margin:'0 0 8px', fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>你的 Email</p>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="your@email.com"
              style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontSize:15, marginBottom:12, boxSizing:'border-box' }}
              autoFocus
            />

            {errMsg && <p style={{ margin:'0 0 10px', fontSize:12, color:'var(--red)' }}>⚠️ {errMsg}</p>}

            <button onClick={send} disabled={loading} style={{
              width:'100%', padding:14, borderRadius:12, border:'none', cursor:loading?'wait':'pointer',
              background: loading ? 'var(--border)' : 'var(--brand)',
              color:'#fff', fontWeight:700, fontSize:15,
            }}>
              {loading ? '⏳ 傳送中...' : '📧 傳送登入連結'}
            </button>

            <p style={{ margin:'12px 0 0', fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
              登入即代表同意儲存你的自訂模板與分析記錄
            </p>
          </>
        ) : (
          <>
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>📬</div>
              <p style={{ margin:'0 0 8px', fontSize:20, fontWeight:800, color:'var(--text)' }}>信件已送出！</p>
              <p style={{ margin:'0 0 20px', fontSize:14, color:'var(--text-muted)', lineHeight:1.7 }}>
                請查看 <strong style={{ color:'var(--brand)' }}>{email}</strong> 的收件匣<br/>
                點信件中的連結即可完成登入<br/>
                <span style={{ fontSize:12, color:'var(--text-2)' }}>（沒收到？請查垃圾郵件，或稍後再試）</span>
              </p>
              <button onClick={onClose} style={{
                padding:'12px 32px', borderRadius:10, border:'none', cursor:'pointer',
                background:'var(--bg-2)', color:'var(--text-2)', fontWeight:700, fontSize:14,
              }}>關閉</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
