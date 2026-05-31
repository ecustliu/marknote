-- 图片 Storage 迁移（在 Supabase Dashboard → SQL Editor 中执行）
-- 不影响分享功能；仅用于笔记内图片上传

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
