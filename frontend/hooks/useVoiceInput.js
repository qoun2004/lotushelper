'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useVoiceInput — 中文語音輸入 Hook
 * @param {function} onResult - 辨識成功後的回調，接收辨識文字
 * @returns {{ recording, toggle, supported }}
 */
export default function useVoiceInput(onResult) {
  const [recording, setRecording] = useState(false);
  // 用 useEffect 確保 SSR 與 client 初始 render 都是 false，hydration 後才更新
  const [supported, setSupported] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('請使用 Chrome 或 Safari 以使用語音輸入'); return; }
    const rec = new SR();
    rec.lang = 'zh-TW';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript || '';
      if (text) onResult(text);
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    rec.start();
    recRef.current = rec;
    setRecording(true);
  }, [onResult]);

  const toggle = useCallback(() => {
    recording ? stop() : start();
  }, [recording, start, stop]);

  return { recording, toggle, supported };
}
