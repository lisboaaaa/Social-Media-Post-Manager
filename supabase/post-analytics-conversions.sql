-- Adds new-user and conversion counts to post_analytics — both are plain
-- GA4 metrics (newUsers, conversions), not new dimensions, so they slot
-- into the existing (post_id, platform, date, content) rows without
-- changing the primary key or exploding row counts.
-- Additive (not drop+recreate) since this table now holds real synced data.
alter table public.post_analytics
  add column if not exists new_users integer not null default 0,
  add column if not exists conversions integer not null default 0;
