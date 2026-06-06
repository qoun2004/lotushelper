import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 只在瀏覽器環境建立 client（避免 SSR 時存取 localStorage 報錯）
let _supabase = null;
if (typeof window !== 'undefined' && url && key) {
  try {
    _supabase = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (e) {
    console.warn('Supabase init failed:', e.message);
  }
}

export const supabase = _supabase;
export const isSupabaseReady = () => !!_supabase;
