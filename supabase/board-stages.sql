-- Turns the fixed 7-value post workflow (backlog/writing/designing/in_review/
-- approved/scheduled/published) into a team-editable, shared list of stages.
-- posts.status keeps its column name and its existing 7 literal values —
-- those already ARE valid slugs, so this is a constraint swap, not a data
-- migration: drop the inline CHECK, add a foreign key to this new table
-- instead. Old app code (mid-deploy, or on a rollback) keeps writing the
-- same 7 literals, which still satisfy the new FK — no compatibility
-- window, no backfill, no follow-up cleanup migration needed.

create table public.board_stages (
  id text primary key,                             -- slug; reuses 'backlog' etc. for the seed rows, generated from label for new ones
  label text not null,
  position integer not null,
  requires_target_date boolean not null default false,
  requires_published_url boolean not null default false,
  blocks_delete boolean not null default false,
  counts_for_media_purge boolean not null default false,
  is_review_stage boolean not null default false,
  is_archive_stage boolean not null default false,
  locks_editing boolean not null default false,
  is_default_new_post_stage boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.board_stages
  (id, label, position, requires_target_date, requires_published_url, blocks_delete, counts_for_media_purge, is_review_stage, is_archive_stage, locks_editing, is_default_new_post_stage)
values
  ('backlog', 'Backlog', 0, false, false, false, false, false, false, false, true),
  ('writing', 'Writing', 1, false, false, false, false, false, false, false, false),
  ('designing', 'Designing', 2, false, false, false, false, false, false, false, false),
  ('in_review', 'In Review', 3, false, false, false, false, true, false, false, false),
  ('approved', 'Approved', 4, false, false, false, false, false, false, false, false),
  ('scheduled', 'Scheduled', 5, true, false, false, false, false, false, false, false),
  ('published', 'Published', 6, false, true, true, true, false, true, true, false);

-- Swap posts.status's constraint from a fixed CHECK to a real FK against the
-- new table. The CHECK's auto-generated name follows Postgres's default
-- <table>_<column>_check convention for an unnamed inline constraint —
-- verify with the query below if this DROP ever fails to find it:
--   select conname from pg_constraint where conrelid = 'public.posts'::regclass and contype = 'c';
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_fkey foreign key (status) references public.board_stages(id);
create index if not exists idx_posts_status on public.posts (status);

-- Deleting/unflagging every "blocks_delete" stage would silently remove the
-- "can't delete finished posts" guarantee app-wide — that's real, irreversible
-- data loss, unlike losing the (cosmetic) review-stage auto-flag. Guard it at
-- the DB level. Deferred so a single transaction can move the flag from one
-- stage to another without a spurious mid-transaction failure.
create or replace function public.check_at_least_one_delete_guard()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.board_stages where blocks_delete) then
    raise exception 'At least one stage must be flagged "blocks delete" to protect finished posts from deletion.';
  end if;
  return null;
end;
$$;

create constraint trigger board_stages_guard_delete_flag
  after insert or update or delete on public.board_stages
  deferrable initially deferred
  for each row execute function public.check_at_least_one_delete_guard();

-- Same marketing-only access shape as categories (marketing-role-and-suggestions.sql:76-78).
alter table public.board_stages enable row level security;
drop policy if exists "board_stages marketing only" on public.board_stages;
create policy "board_stages marketing only" on public.board_stages for all
  using (public.is_marketing()) with check (public.is_marketing());

do $$
begin
  alter publication supabase_realtime add table public.board_stages;
exception when duplicate_object then null;
end $$;

-- Replace the "published"-literal delete guard with one that reads the
-- blocks_delete flag off whichever stage a post currently sits in.
drop policy if exists "posts marketing delete unless published" on public.posts;
create policy "posts marketing delete unless blocked" on public.posts for delete
  using (
    public.is_marketing()
    and not exists (select 1 from public.board_stages bs where bs.id = posts.status and bs.blocks_delete)
  );
