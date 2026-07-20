-- Device/country breakdown, kept in its own table rather than added as more
-- dimensions on post_analytics: mixing this with the existing per-placement
-- (utm_content) rows would multiply that table's row count by every
-- device x country combination for every row that already exists. Separate
-- table, separate (smaller) blast radius; country is capped to each
-- campaign's top 5 (see lib/ga4Sync.ts) with the rest folded into "Other" so
-- this table doesn't grow unbounded either.
create table public.post_analytics_geo (
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram', 'x')),
  date date not null,
  device_category text not null, -- "mobile" | "desktop" | "tablet" | "(not set)"
  country text not null, -- country name, or "Other" once past the campaign's top 5
  sessions integer not null default 0,
  users integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (post_id, platform, date, device_category, country)
);

alter table public.post_analytics_geo enable row level security;

create policy "post_analytics_geo marketing only" on public.post_analytics_geo for all
  using (public.is_marketing()) with check (public.is_marketing());

do $$
begin
  alter publication supabase_realtime add table public.post_analytics_geo;
exception when duplicate_object then null;
end $$;
