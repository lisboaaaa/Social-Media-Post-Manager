-- Records when needs_changes was last set true — lets the UI show the
-- comment that actually explains why (whatever was posted after this
-- moment), instead of guessing from whichever comment happens to be most
-- recent on the post overall.
alter table public.posts
  add column if not exists needs_changes_set_at timestamptz;
