-- Social Media Post Manager — database schema
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste this whole file → Run.

-- 1. TABLES ------------------------------------------------------------

create table profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  initials text not null,
  created_at timestamptz not null default now()
);
-- Note: once Google login is wired up, this table will link to Supabase's
-- built-in auth.users instead of having its own id — a follow-up step, not needed yet.

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  status text not null check (status in ('backlog', 'writing', 'designing', 'in_review', 'approved', 'scheduled', 'published')),
  target_date date,
  needs_changes boolean not null default false,
  published_url text,
  assignee_id uuid references profiles(id) on delete set null,
  requested_by_id uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per platform a post targets, each with its own copy —
-- this is how "Acme case study" ends up with a LinkedIn row and an X row.
create table post_platforms (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'instagram', 'x')),
  description text not null default '',
  unique (post_id, platform)
);

create table post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  image_url text not null,
  position int not null default 0
);

-- Pairing table: a post can have several categories, a category can apply
-- to several posts, so this just links the two, one row per pairing.
create table post_categories (
  post_id uuid not null references posts(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (post_id, category_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade, -- null = general team note, not tied to a post
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- 2. ACCESS RULES --------------------------------------------------------
-- Row Level Security is Supabase's own gatekeeper, separate from the app's code.
-- There's no login yet, so for now every table just allows anyone with the
-- publishable key to read/write everything — matches "everyone's equal, shared
-- board" from the plan. TIGHTEN THIS once Google login is wired up (swap
-- `using (true)` for a check against auth.uid()).

alter table profiles enable row level security;
alter table categories enable row level security;
alter table posts enable row level security;
alter table post_platforms enable row level security;
alter table post_images enable row level security;
alter table post_categories enable row level security;
alter table comments enable row level security;

create policy "open access" on profiles for all using (true) with check (true);
create policy "open access" on categories for all using (true) with check (true);
create policy "open access" on posts for all using (true) with check (true);
create policy "open access" on post_platforms for all using (true) with check (true);
create policy "open access" on post_images for all using (true) with check (true);
create policy "open access" on post_categories for all using (true) with check (true);
create policy "open access" on comments for all using (true) with check (true);

-- 3. SEED DATA — same people/posts you've been testing with locally ------

insert into profiles (id, full_name, email, initials) values
  ('11111111-1111-1111-1111-111111111111', 'Laura Lisboa', 'laura.lisboa@daredata.engineering', 'LL'),
  ('22222222-2222-2222-2222-222222222222', 'Mia Pereira', 'mia.pereira@daredata.engineering', 'MP'),
  ('33333333-3333-3333-3333-333333333333', 'Tomás Rocha', 'tomas.rocha@daredata.engineering', 'TR');

insert into categories (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Meet the Team'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Internal'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'GenOS');

-- the same 9 example posts you've been testing with on the board
insert into posts (id, title, status, target_date, needs_changes, published_url, assignee_id, requested_by_id, created_by) values
  ('00000000-0000-0000-0000-000000000001', 'GenOS offsite reel', 'backlog', null, false, null, '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0000-000000000002', 'Pricing tiers teaser', 'backlog', null, false, null, '33333333-3333-3333-3333-333333333333', null, '33333333-3333-3333-3333-333333333333'),
  ('00000000-0000-0000-0000-000000000003', 'Acme case study', 'writing', '2026-07-09', false, null, '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),
  ('00000000-0000-0000-0000-000000000004', 'New hires carousel', 'designing', '2026-07-11', true, null, '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0000-000000000005', 'Q3 roadmap webinar', 'in_review', '2026-07-14', false, null, '33333333-3333-3333-3333-333333333333', null, '33333333-3333-3333-3333-333333333333'),
  ('00000000-0000-0000-0000-000000000006', 'Outage postmortem thread', 'in_review', '2026-07-12', true, null, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
  ('00000000-0000-0000-0000-000000000007', 'Hiring: data engineer', 'approved', '2026-07-15', false, null, '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0000-000000000008', 'Dark mode teaser', 'scheduled', '2026-07-16', false, null, '33333333-3333-3333-3333-333333333333', null, '33333333-3333-3333-3333-333333333333'),
  ('00000000-0000-0000-0000-000000000009', 'GenOS 2.4 release thread', 'published', '2026-07-02', false, 'https://x.com/genos/status/example', '11111111-1111-1111-1111-111111111111', null, '11111111-1111-1111-1111-111111111111');

insert into post_platforms (post_id, platform, description) values
  ('00000000-0000-0000-0000-000000000001', 'instagram', 'Behind-the-scenes reel from the GenOS offsite — the whole team in one room for the first time this year.'),
  ('00000000-0000-0000-0000-000000000002', 'x', 'Quick take on the new pricing tiers we''re rolling out next month.'),
  ('00000000-0000-0000-0000-000000000003', 'linkedin', 'Case study: how Acme cut onboarding time by 40% using GenOS.

We sat down with their ops team to break down what changed, what didn''t, and what surprised them most. Full writeup in the comments.'),
  ('00000000-0000-0000-0000-000000000003', 'x', 'How Acme cut onboarding time by 40% using GenOS — the short version. 🧵'),
  ('00000000-0000-0000-0000-000000000004', 'instagram', 'Carousel introducing the new hires who joined us this quarter.'),
  ('00000000-0000-0000-0000-000000000005', 'linkedin', 'Announcing the GenOS Q3 roadmap webinar — save the date and bring your questions.'),
  ('00000000-0000-0000-0000-000000000006', 'x', 'Thread recapping last week''s outage postmortem, in plain language.'),
  ('00000000-0000-0000-0000-000000000007', 'linkedin', 'We''re hiring: looking for a senior data engineer to join the platform team.'),
  ('00000000-0000-0000-0000-000000000008', 'instagram', 'Product teaser: dark mode is finally here.'),
  ('00000000-0000-0000-0000-000000000009', 'x', 'GenOS 2.4 is live — release notes thread.');

insert into post_images (post_id, image_url, position) values
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/genos-case-study/800/600', 0),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/genos-new-hire-1/800/600', 0),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/genos-new-hire-2/800/600', 1),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/genos-webinar-1/800/600', 0),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/genos-webinar-2/800/600', 1),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/genos-webinar-3/800/600', 2),
  ('00000000-0000-0000-0000-000000000008', 'https://picsum.photos/seed/genos-dark-mode/800/600', 0),
  ('00000000-0000-0000-0000-000000000009', 'https://picsum.photos/seed/genos-release-1/800/600', 0),
  ('00000000-0000-0000-0000-000000000009', 'https://picsum.photos/seed/genos-release-2/800/600', 1);

insert into post_categories (post_id, category_id) values
  ('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000003');

insert into comments (post_id, author_id, body, created_at) values
  ('00000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Can we swap the last slide for a group photo instead of headshots?', '2026-06-28T10:15:00.000Z'),
  ('00000000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'Legal wants to review the wording around the outage cause before this goes out.', '2026-06-29T14:40:00.000Z'),
  (null, '33333333-3333-3333-3333-333333333333', 'Reminder: no posts going out the week of the 20th, I''m out on leave.', '2026-06-30T08:00:00.000Z');
