'use client';
import { useRef, useState } from 'react';
import HistoryPanel from './HistoryPanel';
import ModuleHero from './ModuleHero';
import useHistory from '../hooks/useHistory';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const MEETING_TYPES = ['一般會議', '專案進度', '主管會議', '廠商會議', '客戶訪談', '腦力激盪'];

function FieldCard({ title, children, tone = 'brand' }) {
  const map = {
    brand: ['var(--brand-bg)', 'var(--brand-border)', 'var(--brand-dark)'],
    green: ['var(--green-bg)', 'var(--green-border)', 'var(--green)'],
    amber: ['var(--amber-bg)', 'var(--amber-border)', 'var(--amber)'],
    blue: ['var(--blue-bg)', 'var(--blue-border)', 'var(--blue)'],
    red: ['var(--red-bg)', 'var(--red-border)', 'var(--red)'],
  };
  const [bg, border, color] = map[tone] || map.brand;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 14 }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color }}>{title}</p>
      {children}
    </div>
  );
}

function ListBlock({ items, empty = '未提及' }) {
  if (!items?.length) return <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{empty}</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ marginTop: 2, width: 18, height: 18, borderRadius: 6, background: 'var(--surface)', color: 'var(--brand)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

function MeetingResult({ data }) {
  const [copied, setCopied] = useState(false);

  const lines = [
    `# ${data.title || '會議記錄'}`,
    '',
    '## 會議摘要',
    data.summary || '未提及',
    '',
    '## 出席人員',
    ...(data.attendees?.length ? data.attendees.map(x => `- ${x}`) : ['- 未提及']),
    '',
    '## 決議事項',
    ...(data.decisions?.length ? data.decisions.map(x => `- ${x}`) : ['- 未提及']),
    '',
    '## 待辦事項',
    ...(data.action_items?.length ? data.action_items.map(x => `- ${x.task}${x.owner ? `｜負責：${x.owner}` : ''}${x.deadline ? `｜期限：${x.deadline}` : ''}`) : ['- 未提及']),
    '',
    '## 待確認事項',
    ...(data.pending?.length ? data.pending.map(x => `- ${x}`) : ['- 未提及']),
    '',
    '## 下次會議',
    data.next_meeting || '未提及',
    '',
    '## 重要資訊',
    ...(data.key_points?.length ? data.key_points.map(x => `- ${x}`) : ['- 未提及']),
  ];
  const fullText = lines.join('\n');

  const copyAll = () => {
    navigator.clipboard.writeText(fullText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadTxt = () => {
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title || '會議記錄'}_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>MEETING NOTES</p>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, color: 'var(--text)', letterSpacing: '-0.4px' }}>{data.title || '會議記錄'}</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copyAll} style={{ padding: '8px 13px', borderRadius: 9, border: `1px solid ${copied ? 'var(--green-border)' : 'var(--brand-border)'}`, background: copied ? 'var(--green-bg)' : 'var(--brand-bg)', color: copied ? 'var(--green)' : 'var(--brand-dark)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{copied ? '✓ 已複製' : '📋 複製全文'}</button>
            <button onClick={downloadTxt} style={{ padding: '8px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>⬇️ 下載</button>
          </div>
        </div>
      </div>

      <FieldCard title="📋 會議摘要" tone="brand">
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.8 }}>{data.summary || '未提及'}</p>
      </FieldCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <FieldCard title="👥 出席人員" tone="blue">
          <ListBlock items={data.attendees} />
        </FieldCard>
        <FieldCard title="📅 下次會議" tone="amber">
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>{data.next_meeting || '未提及'}</p>
        </FieldCard>
      </div>

      <FieldCard title="✅ 決議事項" tone="green">
        <ListBlock items={data.decisions} />
      </FieldCard>

      <FieldCard title="📌 待辦事項" tone="brand">
        {data.action_items?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.action_items.map((item, i) => (
              <div key={i} style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.6 }}>{item.task}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--bg)', borderRadius: 8, padding: '3px 8px' }}>負責：{item.owner || '未指定'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--bg)', borderRadius: 8, padding: '3px 8px' }}>期限：{item.deadline || '未指定'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>未提及</p>}
      </FieldCard>

      <FieldCard title="⚠️ 待確認事項" tone="red">
        <ListBlock items={data.pending} />
      </FieldCard>

      <FieldCard title="💡 重要資訊 / 數字" tone="amber">
        <ListBlock items={data.key_points} />
      </FieldCard>
    </div>
  );
}

export default function Module6Meeting() {
  const [transcript, setTranscript] = useState('');
  const [meetingType, setMeetingType] = useState('一般會議');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSec, setLoadingSec] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const timerRef = useRef();
  const { history, addHistory, clearHistory } = useHistory('module6');

  const wordCount = transcript.trim() ? transcript.trim().length : 0;
  const canAnalyze = wordCount >= 30 && !loading;

  const analyze = async () => {
    if (!canAnalyze) return;
    setLoading(true);
    setLoadingSec(0);
    setError('');
    setResult(null);
    timerRef.current = setInterval(() => setLoadingSec(s => s + 1), 1000);
    try {
      const res = await fetch(`${API}/api/module6/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, meeting_type: meetingType, date }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || res.statusText);
      setResult(data);
      addHistory({
        label: data.title || `${meetingType}會議`,
        summary: data.summary || '',
        data,
      });
    } catch (e) {
      setError(e.message === '529_overloaded' ? 'AI 伺服器暫時過載，請稍後 30 秒再試' : e.message);
    } finally {
      clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setTranscript(text);
    } catch {
      setError('無法讀取剪貼簿，請直接貼上逐字稿');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ModuleHero
        icon="📝"
        title="會議記錄 AI 整理"
        desc="貼上手機語音備忘錄逐字稿，AI 自動整理摘要、決議、待辦與追蹤事項"
        steps={['貼逐字稿', '選會議類型', 'AI 分析', '複製 / 下載']}
      />

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>📱 手機使用流程</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {['語音備忘錄錄音', '點逐字稿並全選複製', '貼到下方輸入框', '按 AI 分析'].map((step, i) => (
            <div key={step} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--brand)', fontWeight: 800 }}>STEP {i + 1}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>會議類型</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MEETING_TYPES.map(t => (
              <button key={t} onClick={() => setMeetingType(t)} style={{
                padding: '7px 12px', borderRadius: 18, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${meetingType === t ? 'var(--brand-border)' : 'var(--border)'}`,
                background: meetingType === t ? 'var(--brand-bg)' : 'var(--bg)',
                color: meetingType === t ? 'var(--brand-dark)' : 'var(--text-2)',
                fontWeight: meetingType === t ? 700 : 400,
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>會議日期（選填）</p>
          <input value={date} onChange={e => setDate(e.target.value)} placeholder="例如：2026/06/08 或今天下午"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }} />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>貼上會議逐字稿</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: wordCount < 30 ? 'var(--red)' : 'var(--text-muted)' }}>{wordCount} 字</span>
            <button onClick={pasteFromClipboard} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--brand-border)', background: 'var(--brand-bg)', color: 'var(--brand-dark)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📋 貼上</button>
          </div>
        </div>
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="把手機語音備忘錄產出的逐字稿貼在這裡。可以有口語、斷句不順、重複句，AI 會自動整理。"
          rows={12}
          style={{ width: '100%', boxSizing: 'border-box', padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit' }}
        />
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>建議至少 30 字。很長的會議也可以貼，系統會優先分析前段重點內容。</p>
      </div>

      <button onClick={analyze} disabled={!canAnalyze} style={{
        width: '100%', padding: 16, borderRadius: 12, border: 'none',
        background: canAnalyze ? 'var(--brand)' : 'var(--border)',
        color: '#fff', fontWeight: 800, fontSize: 17,
        cursor: canAnalyze ? 'pointer' : 'not-allowed', letterSpacing: '-0.3px',
      }}>
        {loading ? '🧠 AI 正在整理會議記錄...' : '🧠 開始分析會議記錄'}
      </button>

      {loading && (
        <div style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>📝</div>
          <p style={{ margin: '0 0 6px', fontWeight: 800, color: 'var(--brand-dark)', fontSize: 15 }}>
            AI 正在歸納會議重點
            {loadingSec > 0 && <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>已等待 {loadingSec} 秒</span>}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            逐字稿越長越需要時間，通常約 <strong>20〜90 秒</strong><br />
            完成後結果會自動出現在 <strong>下方</strong> 👇
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '13px 15px' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>⚠️ {error}</p>
        </div>
      )}

      <HistoryPanel
        history={history}
        clearHistory={clearHistory}
        onRestore={data => { setResult(data); setError(''); }}
      />

      {result && <MeetingResult data={result} />}
    </div>
  );
}
