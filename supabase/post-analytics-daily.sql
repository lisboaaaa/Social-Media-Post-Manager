-- Widens post_analytics from one lifetime total per post+platform to one row
-- per post+platform+day, with more GA4 metrics — needed to filter/group by
-- day or week in the app instead of only ever seeing one lump 90-day number.
-- Dropped and recreated rather than altered: the existing table only ever
-- held test rows (sessions = 0) from wiring up the sync, nothing real to lose.
drop table if exists public.post_analytics;

create table public.post_analytics (
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram', 'x')),
  date date not null,
  sessions integer not null default 0,
  users integer not null default 0,
  page_views integer not null default 0,
  engaged_sessions integer not null default 0,
  engagement_rate numeric, -- 0-1 fraction, as GA4 returns it
  avg_engagement_time numeric, -- seconds
  bounce_rate numeric, -- 0-1 fraction
  updated_at timestamptz not null default now(),
  primary key (post_id, platform, date)
);

alter table public.post_analytics enable row level security;

create policy "post_analytics marketing only" on public.post_analytics for all
  using (public.is_marketing()) with check (public.is_marketing());

do $$
begin
  alter publication supabase_realtime add table public.post_analytics;
exception when duplicate_object then null;
end $$;
