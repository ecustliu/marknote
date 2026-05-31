-- 分享功能补全迁移（若已执行 share_token 列，只需运行下方 RPC 部分）
-- 在 Supabase Dashboard → SQL Editor 中执行此文件

alter table public.notes add column if not exists share_token text;

create unique index if not exists notes_share_token on public.notes (share_token)
  where share_token is not null;

create or replace function public.get_shared_note(p_token text)
returns table (
  title text,
  content text,
  tags text[],
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select n.title, n.content, n.tags, n.updated_at
  from public.notes n
  where n.share_token = p_token
    and n.deleted_at is null
  limit 1;
$$;

grant execute on function public.get_shared_note(text) to anon, authenticated;
