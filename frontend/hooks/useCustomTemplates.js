'use client';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LS_KEY = 'cvs_custom_templates';

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsSave(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}

export default function useCustomTemplates() {
  const [templates, setTemplates] = useState([]);
  const [userId, setUserId]       = useState(null);
  const [syncing, setSyncing]     = useState(false);

  useEffect(() => {
    const load = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          setSyncing(true);
          const { data } = await supabase
            .from('custom_templates')
            .select('id,name,icon,description,prompt,min_files')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: true });
          setSyncing(false);
          if (data?.length) {
            const mapped = data.map(r => ({ _id: r.id, name: r.name, icon: r.icon, desc: r.description, prompt: r.prompt, minFiles: r.min_files }));
            setTemplates(mapped);
            lsSave(mapped);
            return;
          }
        }
      }
      setTemplates(lsLoad());
    };
    load();
  }, []);

  const add = useCallback(async (tpl) => {
    let _id = null;
    if (supabase && userId) {
      const { data } = await supabase.from('custom_templates').insert({
        user_id: userId, name: tpl.name, icon: tpl.icon,
        description: tpl.desc || '', prompt: tpl.prompt, min_files: tpl.minFiles || 1,
      }).select('id').single();
      _id = data?.id;
    }
    const item = { ...tpl, _id };
    setTemplates(prev => { const next = [...prev, item]; lsSave(next); return next; });
  }, [userId]);

  const remove = useCallback(async (idx) => {
    setTemplates(prev => {
      const item = prev[idx];
      if (item?._id && supabase && userId) {
        supabase.from('custom_templates').delete().eq('id', item._id);
      }
      const next = prev.filter((_, i) => i !== idx);
      lsSave(next);
      return next;
    });
  }, [userId]);

  const update = useCallback(async (idx, tpl) => {
    setTemplates(prev => {
      const item = prev[idx];
      const updated = { ...item, ...tpl };
      if (item?._id && supabase && userId) {
        supabase.from('custom_templates').update({
          name: tpl.name, icon: tpl.icon, description: tpl.desc || '',
          prompt: tpl.prompt, min_files: tpl.minFiles || 1,
        }).eq('id', item._id);
      }
      const next = prev.map((t, i) => i === idx ? updated : t);
      lsSave(next);
      return next;
    });
  }, [userId]);

  return { templates, add, remove, update, syncing };
}
