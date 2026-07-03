-- Run this in the SQL Editor to enable real file uploads (photos and videos)
-- instead of today's temporary browser-only preview links.

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post-media read" on storage.objects
  for select using (bucket_id = 'post-media');

create policy "post-media write" on storage.objects
  for insert with check (bucket_id = 'post-media');

create policy "post-media delete" on storage.objects
  for delete using (bucket_id = 'post-media');

-- Track whether each attachment is a photo or a video.
alter table post_images add column if not exists media_type text not null default 'image' check (media_type in ('image', 'video'));
