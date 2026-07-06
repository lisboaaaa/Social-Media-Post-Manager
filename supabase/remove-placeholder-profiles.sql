-- Removes every profile except Laura's, along with anything that references
-- them (comment reactions, comments, and post assignments) — from now on,
-- the only profiles that exist are the ones people create themselves by
-- signing in. Run this once in the Supabase Dashboard -> SQL Editor.

delete from public.comment_reactions
where author_id in (select id from public.profiles where email <> 'laura.lisboa@daredata.engineering');

delete from public.comments
where author_id in (select id from public.profiles where email <> 'laura.lisboa@daredata.engineering');

update public.posts set assignee_id = null
where assignee_id in (select id from public.profiles where email <> 'laura.lisboa@daredata.engineering');

update public.posts set requested_by_id = null
where requested_by_id in (select id from public.profiles where email <> 'laura.lisboa@daredata.engineering');

update public.posts set created_by = (select id from public.profiles where email = 'laura.lisboa@daredata.engineering')
where created_by in (select id from public.profiles where email <> 'laura.lisboa@daredata.engineering');

delete from public.profiles where email <> 'laura.lisboa@daredata.engineering';
