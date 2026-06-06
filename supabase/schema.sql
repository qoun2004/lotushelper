-- ═══════════════════════════════════════════════
--  寵妻神器 · Supabase 資料庫初始化腳本
--  到 Supabase Dashboard → SQL Editor 貼上執行
-- ═══════════════════════════════════════════════

-- 1. 自訂分析模板
create table if not exists custom_templates (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users not null,
  name        text not null,
  icon        text default '📊',
  description text default '',
  prompt      text not null,
  min_files   int  default 1,
  created_at  timestamptz default now()
);
alter table custom_templates enable row level security;
create policy "own templates" on custom_templates
  for all using (auth.uid() = user_id);

-- 2. 分析歷史記錄
create table if not exists user_history (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users not null,
  module     text not null,       -- 'module1' | 'module2' | 'module3' | 'module4'
  label      text not null,
  summary    text default '',
  data       jsonb,
  created_at timestamptz default now()
);
alter table user_history enable row level security;
create policy "own history" on user_history
  for all using (auth.uid() = user_id);

-- 清理舊記錄（只保留每個模組最新 5 筆）
create or replace function trim_user_history()
returns trigger language plpgsql as $$
begin
  delete from user_history
  where id in (
    select id from user_history
    where user_id = new.user_id and module = new.module
    order by created_at desc
    offset 5
  );
  return new;
end;
$$;
create trigger after_insert_history
  after insert on user_history
  for each row execute function trim_user_history();

-- 3. 廠商資料庫
create table if not exists vendor_contacts (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users,
  name        text not null,
  brand       text default '',
  category    text default '',
  location    text default '',
  contact_name text default '',
  email       text default '',
  phone       text default '',
  website     text default '',
  tags        text[] default '{}',
  score       int default 80,
  notes       text default '',
  status      text default '潛在',
  created_at  timestamptz default now()
);
alter table vendor_contacts enable row level security;
create policy "own vendors" on vendor_contacts
  for all using (auth.uid() = user_id);

-- 4. 個人知識庫
create table if not exists knowledge_docs (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users,
  title       text not null,
  filename    text default '',
  doc_type    text default 'report',  -- report | template | case | other
  content     text default '',        -- 文件全文（最多 8000 字）
  summary     text default '',        -- AI 生成摘要
  char_count  int default 0,
  created_at  timestamptz default now()
);
alter table knowledge_docs enable row level security;
create policy "own knowledge" on knowledge_docs
  for all using (auth.uid() = user_id);
