-- Lets the app receive live updates across the board — posts, comments,
-- reactions, categories, profiles — instead of only seeing changes after a
-- refresh. Run in the Supabase Dashboard -> SQL Editor.
--
-- Each table is added independently and swallows the "already a member of
-- publication" error (SQLSTATE 42710) on its own, so if some tables were
-- already enabled (e.g. via the dashboard UI) that doesn't stop the rest
-- from being added — safe to run any number of times.

do $$
begin
  begin
    alter publication supabase_realtime add table public.posts;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.post_platforms;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.post_images;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.post_categories;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.categories;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.comments;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.comment_reactions;
  exception when duplicate_object then null;
  end;
end $$;
