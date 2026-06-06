'use client';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LS_KEY = 'cvs_vendor_db';

function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function lsSave(arr) { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {} }

export const VENDOR_STATUS = ['潛在', '洽談中', '合作中', '暫停'];

export const EMPTY_VENDOR = {
  name: '', brand: '', category: '', location: '',
  contact_name: '', title: '', email: '', phone: '',
  line_id: '', website: '',
  tags: [], score: 80, notes: '', status: '潛在',
};

export default function useVendorDB() {
  const [vendors, setVendors] = useState([]);
  const [userId, setUserId]   = useState(null);
  const [syncing, setSyncing] = useState(false);

  // 載入
  useEffect(() => {
    const load = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          setSyncing(true);
          const { data } = await supabase.from('vendor_contacts')
            .select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
          setSyncing(false);
          if (data?.length) { setVendors(data); lsSave(data); return; }
        }
      }
      setVendors(lsLoad());
    };
    load();
  }, []);

  // 新增
  const add = useCallback(async (vendor) => {
    const item = { ...EMPTY_VENDOR, ...vendor, id: Date.now(), created_at: new Date().toISOString() };
    let remoteId = null;
    if (supabase && userId) {
      const { data } = await supabase.from('vendor_contacts')
        .insert({ ...item, user_id: userId }).select('id').single();
      remoteId = data?.id;
    }
    const saved = { ...item, id: remoteId || item.id };
    setVendors(prev => { const next = [saved, ...prev]; lsSave(next); return next; });
    return saved;
  }, [userId]);

  // 批次新增（CSV 匯入）
  const addBatch = useCallback(async (items) => {
    const stamped = items.map(v => ({ ...EMPTY_VENDOR, ...v, id: Date.now() + Math.random(), created_at: new Date().toISOString() }));
    if (supabase && userId) {
      await supabase.from('vendor_contacts').insert(stamped.map(v => ({ ...v, user_id: userId })));
    }
    setVendors(prev => { const next = [...stamped, ...prev]; lsSave(next); return next; });
    return stamped.length;
  }, [userId]);

  // 更新
  const update = useCallback(async (id, patch) => {
    setVendors(prev => {
      const next = prev.map(v => v.id === id ? { ...v, ...patch } : v);
      lsSave(next);
      if (supabase && userId) supabase.from('vendor_contacts').update(patch).eq('id', id);
      return next;
    });
  }, [userId]);

  // 刪除
  const remove = useCallback(async (id) => {
    setVendors(prev => {
      const next = prev.filter(v => v.id !== id);
      lsSave(next);
      if (supabase && userId) supabase.from('vendor_contacts').delete().eq('id', id);
      return next;
    });
  }, [userId]);

  // 解析 CSV
  const parseCSV = useCallback((text) => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    // 欄位對應表（中英文都接受）
    const MAP = {
      '公司名稱': 'name', '公司': 'name', 'name': 'name', 'company': 'name',
      '品牌': 'brand', 'brand': 'brand',
      '類別': 'category', '商品類別': 'category', 'category': 'category',
      '地區': 'location', '縣市': 'location', 'location': 'location',
      '聯絡人': 'contact_name', '聯絡人姓名': 'contact_name', 'contact': 'contact_name',
      'email': 'email', 'Email': 'email', '電子郵件': 'email',
      '電話': 'phone', 'phone': 'phone', '手機': 'phone',
      'line_id': 'line_id', 'LINE': 'line_id', 'LINE ID': 'line_id', 'Line': 'line_id',
      '官網': 'website', 'website': 'website', '網站': 'website',
      '備註': 'notes', 'notes': 'notes', '說明': 'notes',
      '狀態': 'status', 'status': 'status',
      '評分': 'score', 'score': 'score',
    };
    const mapped = headers.map(h => MAP[h] || null);
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj = { ...EMPTY_VENDOR };
      mapped.forEach((field, i) => { if (field && vals[i]) obj[field] = vals[i]; });
      // name 必填
      if (!obj.name) return null;
      return obj;
    }).filter(Boolean);
  }, []);

  return { vendors, add, addBatch, update, remove, parseCSV, syncing };
}
