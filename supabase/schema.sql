-- 在 Supabase SQL Editor 中执行此文件即可建好所有表结构

-- 笔记表
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  content     text not null default '',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 全文搜索索引（中文需要额外安装 pg_jieba，英文/拼音开箱即用）
create index if not exists notes_fts on public.notes
  using gin(to_tsvector('simple', title || ' ' || content));

-- 按用户 + 更新时间索引，加速列表查询
create index if not exists notes_user_updated on public.notes (user_id, updated_at desc);

-- Row Level Security：每个用户只能读写自己的笔记
alter table public.notes enable row level security;

create policy "用户只能查看自己的笔记"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "用户只能创建自己的笔记"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "用户只能更新自己的笔记"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "用户只能删除自己的笔记"
  on public.notes for delete
  using (auth.uid() = user_id);

-- 自动更新 updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();
