-- Run this after schema.sql, once the login (magic link) is in place.
-- Auto-creates a basic profile the first time someone new signs in — Laura,
-- Mia and Tomás already have named profiles from the seed data, so this only
-- kicks in for teammates who aren't in there yet.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where email = new.email) then
    insert into public.profiles (id, full_name, email, initials)
    values (
      gen_random_uuid(),
      split_part(new.email, '@', 1),
      new.email,
      upper(left(split_part(new.email, '@', 1), 2))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
