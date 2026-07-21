-- Tags each post_analytics row with which site's GA4 property it came from
-- (Daredata vs GenOS). Deliberately NOT part of the primary key — a given
-- tagged link only ever lives on one of the two sites in practice, so this
-- is an informational label, not a real breakdown dimension; making it part
-- of the key would risk double-counting on any accidental overlap instead.
alter table public.post_analytics
  add column if not exists site text not null default '';
