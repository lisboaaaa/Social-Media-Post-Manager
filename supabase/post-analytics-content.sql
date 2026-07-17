-- Adds a content dimension to post_analytics, matching utm_content — lets
-- one post+platform have separate rows per placement (the caption link vs.
-- one dropped in a comment vs. an Instagram Story link), since the team
-- tags each of those with a different utm_content value on purpose.
-- Dropped and recreated rather than altered: only ever held test rows.
drop table if exists public.post_analytics;

create table public.post_analytics (
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram', 'x')),
  date date not null,
  content text not null default '', -- utm_content value; '' = no content tag set (the plain caption link)
  sessions integer not null default 0,
  users integer not null default 0,
  page_views integer not null default 0,
  engaged_sessions integer not null default 0,
  engagement_rate numeric, -- 0-1 fraction, as GA4 returns it
  avg_engagement_time numeric, -- seconds
  bounce_rate numeric, -- 0-1 fraction
  updated_at timestamptz not null default now(),
  primary key (post_id, platform, date, content)
);

alter table public.post_analytics enable row level security;

create policy "post_analytics marketing only" on public.post_analytics for all
  using (public.is_marketing()) with check (public.is_marketing());

do $$
begin
  alter publication supabase_realtime add table public.post_analytics;
exception when duplicate_object then null;
end $$;
