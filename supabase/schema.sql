-- =====================================================================
-- 다국어 동아리 커뮤니티 — Supabase schema
--
-- Run this entire file in the Supabase SQL editor.
-- Then set NEXT_PUBLIC_DATA_SOURCE=supabase in your environment.
--
-- Auth model: lightweight "student-id + name" identity (no Supabase Auth).
--   Users are looked up by student_id on login; the row is only created
--   on first onboarding. Tighten policies once Supabase Auth is wired.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- tables ----------

create table if not exists users (
  id                 uuid        primary key default gen_random_uuid(),
  student_id         text        not null unique,
  display_name       text        not null,
  nationality        text        not null check (nationality in ('KR','JP','CN','VN','US','OTHER')),
  preferred_language text        not null check (preferred_language in ('ko','ja','zh','vi','en')),
  is_admin           boolean     not null default false,
  created_at         timestamptz not null default now()
);

create table if not exists posts (
  id                uuid        primary key default gen_random_uuid(),
  author_id         uuid        references users(id) on delete set null,
  author_nationality text       not null,
  original_language  text       not null,
  tags               text[]     not null default '{}',
  created_at        timestamptz not null default now()
);

create table if not exists translations (
  id       uuid  primary key default gen_random_uuid(),
  post_id  uuid  not null references posts(id) on delete cascade,
  language text  not null,
  title    text  not null,
  content  text  not null,
  unique (post_id, language)
);

create table if not exists polls (
  id           uuid        primary key default gen_random_uuid(),
  post_id      uuid        not null unique references posts(id) on delete cascade,
  question     text        not null,
  multi_select boolean     not null default false,
  closes_at    timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists poll_options (
  id       uuid    primary key default gen_random_uuid(),
  poll_id  uuid    not null references polls(id) on delete cascade,
  label    text    not null,
  position integer not null default 0
);

create table if not exists poll_votes (
  id             uuid        primary key default gen_random_uuid(),
  poll_id        uuid        not null references polls(id) on delete cascade,
  poll_option_id uuid        not null references poll_options(id) on delete cascade,
  student_id     text        not null,
  nationality    text        not null,
  voted_at       timestamptz not null default now(),
  unique (poll_option_id, student_id)
);

create table if not exists schedules (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text        not null default '',
  start_at    timestamptz not null,
  end_at      timestamptz,
  color       text        not null default 'var(--chart-1)',
  post_id     uuid        references posts(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists comments (
  id                uuid        primary key default gen_random_uuid(),
  post_id           uuid        not null references posts(id) on delete cascade,
  author_nationality text       not null,
  content           text        not null,
  created_at        timestamptz not null default now()
);

create table if not exists notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references users(id) on delete cascade,
  type       text        not null check (type in ('new_poll','poll_closing','new_schedule','new_comment')),
  payload    jsonb       not null default '{}',
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------

create index if not exists idx_posts_created_at   on posts        (created_at desc);
create index if not exists idx_translations_post  on translations (post_id);
create index if not exists idx_poll_options_poll  on poll_options  (poll_id);
create index if not exists idx_poll_votes_poll    on poll_votes    (poll_id);
create index if not exists idx_poll_votes_student on poll_votes    (poll_id, student_id);
create index if not exists idx_comments_post      on comments      (post_id);
create index if not exists idx_schedules_start    on schedules     (start_at);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);

-- ---------- aggregate view ----------

create or replace view poll_results_by_nationality as
select
  o.poll_id,
  o.id       as poll_option_id,
  o.label,
  v.nationality,
  count(v.id) as votes
from poll_options o
left join poll_votes v on v.poll_option_id = o.id
group by o.poll_id, o.id, o.label, v.nationality;

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

-- users: full CRUD via anon key (student-id auth at application layer)
create policy users_select on users for select using (true);
create policy users_insert on users for insert with check (true);

-- posts: read + write + delete (admin delete enforced in app, not DB)
create policy posts_read   on posts for select using (true);
create policy posts_write  on posts for insert with check (true);
create policy posts_delete on posts for delete using (true);

-- translations: read + write (cascade delete from posts)
create policy tr_read  on translations for select using (true);
create policy tr_write on translations for insert with check (true);

-- polls + options: read + write
create policy polls_read  on polls        for select using (true);
create policy polls_write on polls        for insert with check (true);
create policy opt_read    on poll_options for select using (true);
create policy opt_write   on poll_options for insert with check (true);

-- votes: cast + read (raw rows; admin voter list uses this)
create policy votes_insert on poll_votes for insert with check (true);
create policy votes_select on poll_votes for select using (true);

-- schedules: full access
create policy sch_read  on schedules for select using (true);
create policy sch_write on schedules for all    using (true) with check (true);

-- comments: read + write
create policy cmt_read  on comments for select using (true);
create policy cmt_write on comments for insert with check (true);

-- notifications: full access (scoped by user_id in application code)
create policy notif_read  on notifications for select using (true);
create policy notif_write on notifications for all    using (true) with check (true);

-- grant view access to anon
grant select on poll_results_by_nationality to anon, authenticated;
