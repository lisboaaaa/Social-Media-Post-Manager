-- Adds emoji reactions on comments (both post comments and Team Notes'
-- general notes, since they're the same table). Run this in the Supabase
-- Dashboard -> SQL Editor.

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (comment_id, author_id, emoji)
);

alter table public.comment_reactions enable row level security;

create policy "open access" on public.comment_reactions for all using (true) with check (true);
