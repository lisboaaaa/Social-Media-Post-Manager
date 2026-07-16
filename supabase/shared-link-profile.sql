-- A pseudo-profile purely for attribution — edits made through a shared,
-- no-login post link (app/p/[id]) are logged against this row in
-- post_history instead of a real person, since there's no session to
-- identify who it was. is_marketing = false so it's never counted as a real
-- team member anywhere (assignee pickers, marketing-only checks, etc.), and
-- the email isn't a real address, so it can never actually sign in.
insert into public.profiles (id, full_name, email, initials, is_marketing)
values ('99999999-9999-9999-9999-999999999999', 'Someone (shared link)', 'shared-link@no-reply.internal', 'SL', false)
on conflict (id) do nothing;
