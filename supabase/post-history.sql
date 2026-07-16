-- A per-post activity log — "who changed what, when" — written by the app
-- itself (never typed by a person, unlike comments). One row per changed
-- field per save, so the timeline reads as a list of small, specific events
-- rather than one big "post updated" blob.

create table public.post_history (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  summary text not null,
  created_at timestamptz not null default now()
);

alter table public.post_history enable row level security;

create policy "post_history marketing only" on public.post_history for all
  using (public.is_marketing()) with check (public.is_marketing());

do $$
begin
  alter publication supabase_realtime add table public.post_history;
exception when duplicate_object then null;
end $$;
