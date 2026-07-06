-- Lets the app receive live updates across the board — posts, comments,
-- reactions, categories, profiles — instead of only seeing changes after a
-- refresh. Run in the Supabase Dashboard -> SQL Editor. If any line errors
-- with "already a member of publication", that table is already enabled —
-- safe to ignore and run the rest.

alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_platforms;
alter publication supabase_realtime add table public.post_images;
alter publication supabase_realtime add table public.post_categories;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.comment_reactions;
