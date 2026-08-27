'use client';
import { useMemo, useRef, useState } from 'react';
import VoiceBtn from './VoiceBtn';
import { API_BASE as API } from '../lib/api';

const REPORT_TYPES = [
  { key: 'weekly', label: '本週週報', hint: '本週進度、問題、下週行動' },
  { key: 'monthly', label: '本月月報', hint: '月度成果、趨勢、主管摘要' },
  { key: 'meeting', label: '會議整理', hint: '決議、待辦、待確認事項' },
  { key: 'event', label: '活動/開學準備', hint: '準備清單、風險、追蹤事項' },
  { key: 'custom', label: '自訂需求', hint: '直接用語音說你想要什麼' },
];

const FOCUS_OPTIONS = [
  '成果亮點',
  '異常與風險',
  '待辦清單',
  '主管摘要',
  '數據趨勢',
  '下週計畫',
  '家長/客戶回饋',
  '課程/活動準備',
];

const STYLE_OPTIONS = [
  { key: 'executive', label: '主管簡報版' },
  { key: 'detailed', label: '詳細文字版' },
  { key: 'checklist', label: '待辦清單版' },
  { key: 'story', label: '成果敘事版' },
];

function formatBytes(size) {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function buildPlainText(data) {
  if (!data) return '';
  const lines = [
    data.title || '報告草稿',
    '',
    '摘要',
    data.summary || '',
    '',
  ];
  if (data.highlights?.length) {
    lines.push('重點亮點', ...data.highlights.map(x => `- ${x}`), '');
  }
  if (data.risks?.length) {
    lines.push('風險 / 待補資料', ...data.risks.map(x => `- ${x}`), '');
  }
  if (data.action_items?.length) {
    lines.push('下一步行動');
    data.action_items.forEach(item => {
      if (typeof item === 'string') lines.push(`- ${item}`);
      else lines.push(`- ${item.task || ''}${item.owner ? `｜${item.owner}` : ''}${item.deadline ? `｜${item.deadline}` : ''}`);
    });
    lines.push('');
  }
  lines.push(data.report_text || '');
  return lines.filter(Boolean).join('\n');
}

export default function ModuleSimpleReport() {
  const fileRef = useRef(null);
  const [reportType, setReportType] = useState('weekly');
  const [style, setStyle] = useState('executive');
  const [audience, setAudience] = useState('主管');
  const [lengthLimit, setLengthLimit] = useState('2頁內，重點條列，避免太長');
  const [request, setRequest] = useState('');
  const [focus, setFocus] = useState(['成果亮點', '異常與風險', '待辦清單']);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSec, setLoadingSec] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const canGenerate = files.length > 0 || request.trim().length > 0;
  const selectedType = REPORT_TYPES.find(t => t.key === reportType);

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    setFiles(prev => [...prev, ...incoming].slice(0, 8));
  };

  const toggleFocus = (item) => {
    setFocus(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const generate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    setLoadingSec(0);
    const timer = setInterval(() => setLoadingSec(s => s + 1), 1000);
    try {
      const form = new FormData();
      form.append('report_type', reportType);
      form.append('audience', audience);
      form.append('output_style', style);
      form.append('length_limit', lengthLimit);
      form.append('user_request', request);
      form.append('selected_focus', focus.join('、'));
      files.forEach(file => form.append('files', file));
      const res = await fetch(`${API}/api/simple_report/generate`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '產生失敗，請稍後再試');
      setResult(data);
    } catch (e) {
      setError(e.message || '產生失敗，請稍後再試');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(buildPlainText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const downloadWord = () => {
    const text = buildPlainText(result).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Microsoft JhengHei',Arial,sans-serif;line-height:1.7;color:#1C1814;}h1{font-size:22px;}p{font-size:14px;}</style></head><body><h1>${result?.title || '報告草稿'}</h1><p>${text}</p></body></html>`;
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result?.suggested_title || result?.title || '報告草稿'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="simple-report fade-in">
      <section className="sr-hero">
        <div>
          <span className="sr-kicker">老婆模式</span>
          <h2>丟資料，說需求，直接產報告</h2>
          <p>PDF、Excel、Word、過去週報月報都可以先丟進來。AI 會依照資料、限制條件和過去寫法，整理成可交付的報告草稿。</p>
        </div>
        <div className="sr-hero-note">
          <strong>最簡單用法</strong>
          <span>上傳檔案 → 按麥克風說「幫我做這個月月報」→ 下載 Word</span>
        </div>
      </section>

      <section className="sr-panel">
        <div className="sr-section-title">
          <span>01</span>
          <div>
            <h3>選報告類型</h3>
            <p>先選大方向，不確定就選自訂需求。</p>
          </div>
        </div>
        <div className="sr-type-grid">
          {REPORT_TYPES.map(type => (
            <button key={type.key} onClick={() => setReportType(type.key)} className={`sr-type-card${reportType === type.key ? ' active' : ''}`}>
              <strong>{type.label}</strong>
              <span>{type.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="sr-panel">
        <div className="sr-section-title">
          <span>02</span>
          <div>
            <h3>上傳資料</h3>
            <p>最多 8 份。建議把同一週或同一月要用的資料一次放進來。</p>
          </div>
        </div>
        <div
          className="sr-dropzone"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.md,.csv,.png,.jpg,.jpeg"
            onChange={e => addFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          <div className="sr-upload-icon">＋</div>
          <strong>點這裡選檔，或把檔案拖進來</strong>
          <span>支援 PDF / Excel / Word / TXT / 圖片文字</span>
        </div>
        {files.length > 0 && (
          <div className="sr-file-list">
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`} className="sr-file-row">
                <div>
                  <strong>{file.name}</strong>
                  <span>{formatBytes(file.size)}</span>
                </div>
                <button onClick={() => removeFile(i)}>移除</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="sr-panel">
        <div className="sr-section-title">
          <span>03</span>
          <div>
            <h3>說你要什麼</h3>
            <p>可以打字，也可以按麥克風直接講。</p>
          </div>
        </div>
        <div className="sr-request-box">
          <textarea
            value={request}
            onChange={e => setRequest(e.target.value)}
            placeholder={`例如：幫我做${selectedType?.label || '報告'}，重點放在招生狀況、課程準備和需要主管協助的地方，控制在兩頁內。`}
          />
          <VoiceBtn
            onResult={text => setRequest(prev => prev ? `${prev} ${text}` : text)}
            style={{ width: 46, height: 46, background: 'var(--brand)' }}
          />
        </div>

        <div className="sr-controls">
          <label>
            <span>給誰看</span>
            <input value={audience} onChange={e => setAudience(e.target.value)} />
          </label>
          <label>
            <span>長度/格式限制</span>
            <input value={lengthLimit} onChange={e => setLengthLimit(e.target.value)} />
          </label>
        </div>

        <div className="sr-style-row">
          {STYLE_OPTIONS.map(item => (
            <button key={item.key} onClick={() => setStyle(item.key)} className={style === item.key ? 'active' : ''}>{item.label}</button>
          ))}
        </div>

        <div className="sr-focus-list">
          {FOCUS_OPTIONS.map(item => (
            <button key={item} onClick={() => toggleFocus(item)} className={focus.includes(item) ? 'active' : ''}>{item}</button>
          ))}
        </div>
      </section>

      <button className="sr-generate" disabled={!canGenerate || loading} onClick={generate}>
        {loading ? `AI 正在整理中... 已等待 ${loadingSec} 秒` : '產生報告'}
      </button>

      {loading && (
        <div className="sr-loading">
          <strong>通常需要 1 到 5 分鐘</strong>
          <span>檔案越多越久。請不要重複按，完成後報告會直接出現在下方。</span>
        </div>
      )}

      {error && <div className="sr-error">{error}</div>}

      {result && (
        <section className="sr-result">
          <div className="sr-result-head">
            <div>
              <span>產出完成</span>
              <h3>{result.title}</h3>
              <p>{result.summary}</p>
            </div>
            <div className="sr-actions">
              <button onClick={copyResult}>{copied ? '已複製' : '複製全文'}</button>
              <button onClick={downloadWord}>下載 Word</button>
            </div>
          </div>

          <div className="sr-result-grid">
            <div>
              <h4>重點亮點</h4>
              {(result.highlights || []).map((item, i) => <p key={i}>• {item}</p>)}
            </div>
            <div>
              <h4>風險 / 待補</h4>
              {(result.risks || []).map((item, i) => <p key={i}>• {item}</p>)}
            </div>
          </div>

          <div className="sr-report-text">
            <h4>完整報告</h4>
            <pre>{result.report_text}</pre>
          </div>
        </section>
      )}
    </div>
  );
}
