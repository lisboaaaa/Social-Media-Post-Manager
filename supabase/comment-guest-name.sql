-- Lets a comment be attributed to a typed-in name instead of a real profile.
-- Used only by the public, no-login post link (app/p/[id]) — every comment
-- made through it still has author_id = the "Someone (shared link)"
-- pseudo-profile (see shared-link-profile.sql), but this lets it also carry
-- whatever name the visitor typed in, e.g. "Aurora".
alter table public.comments add column if not exists guest_name text;
