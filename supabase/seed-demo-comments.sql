-- Preview-only seed: adds a few sample comments authored by teammates other
-- than you, spread across several days, so the Team Notes UI (date
-- separators, "You" vs. others, the two tabs) has something to show.
-- Run this in the Supabase Dashboard -> SQL Editor. Safe to run once;
-- see the DELETE at the bottom to remove it again afterwards.

with others as (
  select id, row_number() over (order by full_name) as rn
  from public.profiles
  where email <> 'laura.lisboa@daredata.engineering'
),
recent_posts as (
  select id, row_number() over (order by created_at desc) as rn
  from public.posts
),
seed as (
  select * from (values
    (1, null::uuid, 'Lembrete: não se esqueçam de marcar a categoria certa nos posts esta semana!', 6),
    (2, null::uuid, 'Boa gente, o post de LinkedIn da semana passada teve ótimo engagement 🎉', 4),
    (1, null::uuid, 'Vou estar fora sexta-feira, reatribuam o que for urgente se precisarem', 2),
    (2, null::uuid, 'Alguém pode rever o carrossel do Instagram antes de ir para Review?', 0)
  ) as t(author_rn, post_id, body, days_ago)
)
insert into public.comments (id, post_id, author_id, body, created_at)
select gen_random_uuid(), seed.post_id, others.id, seed.body, now() - (seed.days_ago || ' days')::interval
from seed
join others on others.rn = seed.author_rn
where exists (select 1 from others);

-- Also drop two comments on your most recent post, to preview the "Post
-- comments" tab and a post's own comment thread with more than one author.
with others as (
  select id, row_number() over (order by full_name) as rn
  from public.profiles
  where email <> 'laura.lisboa@daredata.engineering'
),
target_post as (
  select id from public.posts order by created_at desc limit 1
)
insert into public.comments (id, post_id, author_id, body, created_at)
select gen_random_uuid(), target_post.id, others.id, body, now() - (days_ago || ' days')::interval
from target_post
cross join (values
  (1, 'Achas que dá para trocar a imagem de capa? Acho que fica melhor.', 1),
  (2, 'Ficou ótimo, só falta agendar a data 👍', 0)
) as c(author_rn, body, days_ago)
join others on others.rn = c.author_rn
where exists (select 1 from others);

-- To remove all of this demo data again later, run:
-- delete from public.comments
-- where body in (
--   'Lembrete: não se esqueçam de marcar a categoria certa nos posts esta semana!',
--   'Boa gente, o post de LinkedIn da semana passada teve ótimo engagement 🎉',
--   'Vou estar fora sexta-feira, reatribuam o que for urgente se precisarem',
--   'Alguém pode rever o carrossel do Instagram antes de ir para Review?',
--   'Achas que dá para trocar a imagem de capa? Acho que fica melhor.',
--   'Ficou ótimo, só falta agendar a data 👍'
-- );
