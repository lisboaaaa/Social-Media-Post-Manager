-- Introduces a real access boundary: "marketing" (full board/calendar access)
-- vs. everyone else (suggestion-box only). Run once, after schema.sql,
-- auth-setup.sql, protect-published.sql and add-post-number.sql.
--
-- Everyone with a profile today is, by definition, someone who already had
-- full board access — backfilled to is_marketing = true below. Every future
-- sign-in defaults to false, except a short pre-approved allow-list for
-- marketing hires who haven't signed in yet.

-- 1. Role flag --------------------------------------------------------------
alter table public.profiles add column if not exists is_marketing boolean not null default false;

update public.profiles set is_marketing = true;

-- Promotion is an explicit, out-of-band admin action (one-off SQL in the
-- Supabase dashboard), not something the app itself can do — prevents any
-- authenticated client from ever flipping this on themselves or anyone else.
revoke update (is_marketing) on public.profiles from authenticated;

-- 2. Pre-approve marketing hires who haven't signed in yet ------------------
-- Redefines handle_new_user() from auth-setup.sql, adding one allow-list
-- check so their very first login already lands as is_marketing = true.
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

    insert into public.profiles (id, full_name, email, initials, is_marketing)
    values (
      gen_random_uuid(),
      computed_full_name,
      new.email,
      computed_initials,
      new.email in ('ivo.bernardo@daredata.engineering') -- pre-approved marketing allow-list
    );
  end if;
  return new;
end;
$$;

-- 3. Helper functions RLS policies key off -----------------------------------
-- profiles.id is a fresh gen_random_uuid(), not auth.users.id — match the
-- caller's profile by verified JWT email, same as handle_new_user() does.
-- security definer avoids recursive RLS lookups on profiles.
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where email = auth.jwt() ->> 'email';
$$;

create or replace function public.is_marketing()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_marketing from public.profiles where email = auth.jwt() ->> 'email'), false);
$$;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_marketing() to authenticated;

-- 4. Lock the board down to marketing ----------------------------------------
drop policy if exists "open access" on public.categories;
create policy "categories marketing only" on public.categories for all
  using (public.is_marketing()) with check (public.is_marketing());

drop policy if exists "posts read" on public.posts;
drop policy if exists "posts insert" on public.posts;
drop policy if exists "posts update" on public.posts;
drop policy if exists "posts delete unless published" on public.posts;
drop policy if exists "open access" on public.posts;
create policy "posts marketing read" on public.posts for select using (public.is_marketing());
create policy "posts marketing insert" on public.posts for insert with check (public.is_marketing());
create policy "posts marketing update" on public.posts for update
  using (public.is_marketing()) with check (public.is_marketing());
create policy "posts marketing delete unless published" on public.posts for delete
  using (public.is_marketing() and status <> 'published');

drop policy if exists "open access" on public.post_platforms;
create policy "post_platforms marketing only" on public.post_platforms for all
  using (public.is_marketing()) with check (public.is_marketing());

drop policy if exists "open access" on public.post_images;
create policy "post_images marketing only" on public.post_images for all
  using (public.is_marketing()) with check (public.is_marketing());

drop policy if exists "open access" on public.post_categories;
create policy "post_categories marketing only" on public.post_categories for all
  using (public.is_marketing()) with check (public.is_marketing());

drop policy if exists "open access" on public.comments;
create policy "comments marketing only" on public.comments for all
  using (public.is_marketing()) with check (public.is_marketing());

drop policy if exists "open access" on public.comment_reactions;
create policy "comment_reactions marketing only" on public.comment_reactions for all
  using (public.is_marketing()) with check (public.is_marketing());

-- 5. Suggestions table --------------------------------------------------------
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade default public.current_profile_id(),
  description text not null,
  image_url text,
  status text not null default 'new' check (status in ('new', 'accepted', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resulting_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.suggestions enable row level security;

drop policy if exists "suggestions insert own" on public.suggestions;
create policy "suggestions insert own" on public.suggestions for insert
  with check (submitted_by = public.current_profile_id());

drop policy if exists "suggestions select own or marketing" on public.suggestions;
create policy "suggestions select own or marketing" on public.suggestions for select
  using (submitted_by = public.current_profile_id() or public.is_marketing());

drop policy if exists "suggestions marketing update" on public.suggestions;
create policy "suggestions marketing update" on public.suggestions for update
  using (public.is_marketing()) with check (public.is_marketing());
-- No delete policy — "dismiss" is a status update, not a row delete.

do $$
begin
  alter publication supabase_realtime add table public.suggestions;
exception when duplicate_object then null;
end $$;

-- 6. Bonus hardening: same class of gap as the MCP one, but for direct
-- anon-key REST/browser access. -----------------------------------------------
drop policy if exists "open access" on public.api_tokens;
create policy "api_tokens own rows only" on public.api_tokens for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

drop policy if exists "post-media write" on storage.objects;
create policy "post-media write" on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

drop policy if exists "post-media delete" on storage.objects;
create policy "post-media delete" on storage.objects for delete
  using (bucket_id = 'post-media' and auth.role() = 'authenticated');
