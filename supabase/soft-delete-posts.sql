-- Deleting a post no longer removes the row — it's marked deleted (with a
-- required reason) so it can show up in a "Trash" view and be restored.
-- No RLS change needed: the existing "posts update" policy already allows
-- this for marketing, and it applies regardless of status (unlike the old
-- "posts delete unless published" policy this replaces the need for).

alter table public.posts add column if not exists deleted_at timestamptz;
alter table public.posts add column if not exists deleted_by uuid references public.profiles(id) on delete set null;
alter table public.posts add column if not exists delete_reason text;
