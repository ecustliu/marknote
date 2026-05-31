-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- 一次性建好 folders / notes 表、RLS 策略、图片 Storage bucket

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 文件夹表 ────────────────────────────────────────────
create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default '新建文件夹',
  parent_id   uuid references public.folders(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists folders_user_parent on public.folders (user_id, parent_id);

alter table public.folders enable row level security;

drop policy if exists "用户只能查看自己的文件夹" on public.folders;
create policy "用户只能查看自己的文件夹"
  on public.folders for select
  using (auth.uid() = user_id);

drop policy if exists "用户只能创建自己的文件夹" on public.folders;
create policy "用户只能创建自己的文件夹"
  on public.folders for insert
  with check (auth.uid() = user_id);

drop policy if exists "用户只能更新自己的文件夹" on public.folders;
create policy "用户只能更新自己的文件夹"
  on public.folders for update
  using (auth.uid() = user_id);

drop policy if exists "用户只能删除自己的文件夹" on public.folders;
create policy "用户只能删除自己的文件夹"
  on public.folders for delete
  using (auth.uid() = user_id);

drop trigger if exists folders_updated_at on public.folders;
create trigger folders_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

-- ── 笔记表 ──────────────────────────────────────────────
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  content     text not null default '',
  tags        text[] not null default '{}',
  folder_id   uuid references public.folders(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 已有 notes 表时追加 folder_id 列（新库 create table 已含该列，此处兼容旧库）
alter table public.notes add column if not exists folder_id uuid references public.folders(id) on delete set null;

-- 回收站：软删除时间戳，null 表示未删除
alter table public.notes add column if not exists deleted_at timestamptz;

create index if not exists notes_user_active on public.notes (user_id, updated_at desc)
  where deleted_at is null;

create index if not exists notes_user_trash on public.notes (user_id, deleted_at desc)
  where deleted_at is not null;

create index if not exists notes_fts on public.notes
  using gin(to_tsvector('simple', title || ' ' || content));

create index if not exists notes_user_updated on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "用户只能查看自己的笔记" on public.notes;
create policy "用户只能查看自己的笔记"
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists "用户只能创建自己的笔记" on public.notes;
create policy "用户只能创建自己的笔记"
  on public.notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "用户只能更新自己的笔记" on public.notes;
create policy "用户只能更新自己的笔记"
  on public.notes for update
  using (auth.uid() = user_id);

drop policy if exists "用户只能删除自己的笔记" on public.notes;
create policy "用户只能删除自己的笔记"
  on public.notes for delete
  using (auth.uid() = user_id);

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ── 图片 Storage ────────────────────────────────────────
-- bucket 设为 public，笔记里可直接用公开 URL 渲染图片
insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do update set public = true;

drop policy if exists "note-images: public read" on storage.objects;
create policy "note-images: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'note-images');

drop policy if exists "note-images: user upload" on storage.objects;
create policy "note-images: user upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "note-images: user update" on storage.objects;
create policy "note-images: user update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "note-images: user delete" on storage.objects;
create policy "note-images: user delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
