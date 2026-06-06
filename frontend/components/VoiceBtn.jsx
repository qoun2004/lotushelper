'use client';
import useVoiceInput from '../hooks/useVoiceInput';

/**
 * VoiceBtn — 麥克風按鈕
 * @param {function} onResult - 辨識成功的文字
 * @param {string}   mode     - 'append'（追加）| 'replace'（取代）
 */
export default function VoiceBtn({ onResult, mode = 'append', style = {} }) {
  const { recording, toggle, supported } = useVoiceInput(onResult);
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={recording ? '停止錄音' : '語音輸入（中文）'}
      style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: recording ? 'var(--red)' : 'var(--border)',
        color: '#fff', fontSize: 16, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: recording ? 'pulse 1s infinite' : 'none',
        transition: 'background 0.2s',
        ...style,
      }}
    >
      {recording ? '⏹' : '🎙️'}
    </button>
  );
}
