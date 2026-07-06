-- Run this after schema.sql, once the login (magic link) is in place.
-- Auto-creates a basic profile the first time someone new signs in — Laura,
-- Mia and Tomás already have named profiles from the seed data, so this only
-- kicks in for teammates who aren't in there yet. Safe to re-run any time
-- (create-or-replace + drop-if-exists), unlike a plain create policy.
--
-- Company emails are firstname.lastname@daredata.engineering — this turns
-- that into a proper "Firstname Lastname" name and "FL" initials instead of
-- the raw dotted email string.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  name_part text := split_part(new.email, '@', 1);
  first_part text := split_part(name_part, '.', 1);
  last_part text := split_part(name_part, '.', 2);
  computed_full_name text;
  computed_initials text;
begin
  if not exists (select 1 from public.profiles where email = new.email) then
    if last_part = '' then
      computed_full_name := initcap(first_part);
      computed_initials := upper(left(first_part, 2));
    else
      computed_full_name := initcap(first_part) || ' ' || initcap(last_part);
      computed_initials := upper(left(first_part, 1)) || upper(left(last_part, 1));
    end if;

    insert into public.profiles (id, full_name, email, initials)
    values (gen_random_uuid(), computed_full_name, new.email, computed_initials);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
