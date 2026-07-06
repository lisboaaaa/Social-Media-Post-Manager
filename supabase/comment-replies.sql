-- Adds the ability to reply to a specific comment. Run in the Supabase
-- Dashboard -> SQL Editor. Safe to re-run (add column if not exists).

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;
