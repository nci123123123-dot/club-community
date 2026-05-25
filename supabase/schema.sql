-- =====================================================================
-- 다국어 동아리 커뮤니티 — Supabase schema
--
-- Run this in the Supabase SQL editor. Then set NEXT_PUBLIC_DATA_SOURCE=supabase
-- and implement lib/data/supabase/index.ts against these tables.
--
-- Privacy model (see security requirements):
--   * Display names and student ids must never reach normal clients.
--   * `users` is NOT readable with the anon key. Duplicate-student-id checks
--     go through the SECURITY DEFINER function `student_exists()`.
--   * Raw `poll_votes` rows are NOT readable. Vote tallies are exposed only
--     through the aggregate view `poll_results_by_nationality`, which carries
--     nationality counts but no names or ids.
--
-- NOTE: this app uses a lightweight "name + student id" identity, not Supabase
-- Auth. For production you would map these to authenticated users and tighten
-- the insert policies accordingly.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- tables ----------

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  display_name text not null,
  nationality text not null check (nationality in ('KR','JP','CN','VN','US','OTHER')),
  preferred_language text not null check (preferred_language in ('ko','ja','zh','vi','en')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users(id) on delete set null,
  author_nationality text not null,
  original_language text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists translations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  language text not null,
  title text not null,
  content text not null,
  unique (post_id, language)
);

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  question text not null,
  multi_select boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  position int not null default 0
);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  poll_option_id uuid not null references poll_options(id) on delete cascade,
  student_id text not null,
  nationality text not null,
  voted_at timestamptz not null default now(),
  -- Prevents picking the same option twice. "One participation per poll" is
  -- enforced in application logic (and could be a BEFORE INSERT trigger);
  -- a unique(poll_id, student_id) would break multi-select polls.
  unique (poll_option_id, student_id)
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  color text not null default 'var(--chart-1)',
  post_id uuid references posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_nationality text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('new_poll','poll_closing','new_schedule','new_comment')),
  payload jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------

create index if not exists idx_posts_created_at on posts (created_at desc);
create index if not exists idx_translations_post on translations (post_id);
create index if not exists idx_poll_options_poll on poll_options (poll_id);
create index if not exists idx_poll_votes_poll on poll_votes (poll_id);
create index if not exists idx_comments_post on comments (post_id);
create index if not exists idx_schedules_start on schedules (start_at);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);

-- ---------- aggregate view (names/ids never exposed) ----------

create or replace view poll_results_by_nationality as
select
  o.poll_id,
  o.id            as poll_option_id,
  o.label,
  v.nationality,
  count(v.id)     as votes
from poll_options o
left join poll_votes v on v.poll_option_id = o.id
group by o.poll_id, o.id, o.label, v.nationality;

-- ---------- duplicate-student check (no row exposure) ----------

create or replace function student_exists(p_student_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from users where student_id = p_student_id);
$$;

-- ---------- row level security ----------

alter table users         enable row level security;
alter table posts         enable row level security;
alter table translations  enable row level security;
alter table polls         enable row level security;
alter table poll_options  enable row level security;
alter table poll_votes    enable row level security;
alter table schedules     enable row level security;
alter table comments      enable row level security;
alter table notifications enable row level security;

-- users: anyone may register; NO ONE may read rows via the API (privacy).
-- Reading happens only through SECURITY DEFINER functions / server code.
create policy users_insert on users for insert with check (true);

-- public content: world-readable, insertable by clients (tighten with Auth later).
create policy posts_read   on posts        for select using (true);
create policy posts_write  on posts        for insert with check (true);
create policy tr_read      on translations for select using (true);
create policy tr_write     on translations for insert with check (true);
create policy polls_read   on polls        for select using (true);
create policy polls_write  on polls        for insert with check (true);
create policy opt_read     on poll_options for select using (true);
create policy opt_write    on poll_options for insert with check (true);

-- votes: may be cast, but raw rows are NOT selectable (use the view).
create policy votes_write  on poll_votes   for insert with check (true);

-- schedules + comments: world-readable and writable by clients.
create policy sch_read     on schedules    for select using (true);
create policy sch_write    on schedules    for all using (true) with check (true);
create policy cmt_read     on comments     for select using (true);
create policy cmt_write    on comments     for insert with check (true);

-- notifications: readable/updatable (scope to the owner once Auth is wired).
create policy notif_read   on notifications for select using (true);
create policy notif_write  on notifications for all using (true) with check (true);

-- The aggregate view runs with the definer's rights so clients can read tallies
-- without read access to poll_votes.
grant select on poll_results_by_nationality to anon, authenticated;
