-- Published posts should never be deletable, from anywhere (not just hiding
-- the button in the UI) — this replaces the single "open access" policy on
-- posts with per-action policies, adding a real guard on delete.

drop policy if exists "open access" on posts;

create policy "posts read" on posts for select using (true);
create policy "posts insert" on posts for insert with check (true);
create policy "posts update" on posts for update using (true) with check (true);
create policy "posts delete unless published" on posts for delete using (status <> 'published');
