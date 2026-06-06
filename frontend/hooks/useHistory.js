'use client';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MAX = 5;

export default function useHistory(moduleKey) {
  const lsKey = `cvs_history_${moduleKey}`;
  const [history, setHistory] = useState([]);
  const [userId, setUserId]   = useState(null);

  // 載入：有 Supabase 且已登入 → 從雲端；否則從 localStorage
  useEffect(() => {
    const load = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          const { data } = await supabase
            .from('user_history')
            .select('label,summary,data,created_at')
            .eq('user_id', session.user.id)
            .eq('module', moduleKey)
            .order('created_at', { ascending: false })
            .limit(MAX);
          if (data) {
            setHistory(data.map(r => ({ label: r.label, summary: r.summary, data: r.data, ts: new Date(r.created_at).getTime() })));
            return;
          }
        }
      }
      // fallback: localStorage
      try { setHistory(JSON.parse(localStorage.getItem(lsKey) || '[]')); } catch { setHistory([]); }
    };
    load();
  }, [moduleKey, lsKey]);

  const addHistory = useCallback(async (entry) => {
    const item = { ...entry, ts: Date.now() };
    setHistory(prev => {
      const next = [item, ...prev.filter(h => h.label !== entry.label)].slice(0, MAX);
      try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
      return next;
    });
    // 雲端同步
    if (supabase && userId) {
      await supabase.from('user_history').insert({
        user_id: userId,
        module: moduleKey,
        label: entry.label,
        summary: entry.summary || '',
        data: entry.data,
      });
    }
  }, [lsKey, moduleKey, userId]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    try { localStorage.removeItem(lsKey); } catch {}
    if (supabase && userId) {
      await supabase.from('user_history').delete()
        .eq('user_id', userId).eq('module', moduleKey);
    }
  }, [lsKey, moduleKey, userId]);

  return { history, addHistory, clearHistory };
}
