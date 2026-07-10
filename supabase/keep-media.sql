-- Lets a post opt out of the 90-day automatic media purge (see
-- lib/mediaPurge.ts) — e.g. a hero/brand shot the team never wants deleted,
-- even once the post is old and Published or sitting in Trash.
alter table posts add column keep_media boolean not null default false;
