-- A post that targets more than one platform gets published separately on
-- each — a single posts.published_url can't hold more than one link. Moves
-- the link onto post_platforms, one per platform row, same shape as
-- description already works.

alter table post_platforms add column if not exists published_url text;

-- Best-effort backfill: the old single link goes onto every platform row for
-- posts that already have one set — there's no way to know which platform it
-- was originally for, so it lands on all of them (safe to fix by hand after).
update post_platforms pp
set published_url = p.published_url
from posts p
where pp.post_id = p.id and p.published_url is not null;

alter table posts drop column published_url;
