-- Cached GA4 session counts per post+platform, keyed by the utm_campaign
-- value embedded in that platform's tagged link (see lib/utmCampaign.ts).
-- Cached rather than fetched live because the GA4 Data API has a daily
-- quota — a background sync job fills this in, the app just reads it.
create table public.post_analytics (
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram', 'x')),
  sessions integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (post_id, platform)
);

alter table public.post_analytics enable row level security;

create policy "post_analytics marketing only" on public.post_analytics for all
  using (public.is_marketing()) with check (public.is_marketing());

do $$
begin
  alter publication supabase_realtime add table public.post_analytics;
exception when duplicate_object then null;
end $$;
