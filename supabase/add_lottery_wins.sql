-- Run this in the Supabase SQL Editor after schema.sql has been applied.

create table if not exists lottery_wins (
  id      uuid        primary key default gen_random_uuid(),
  user_id text        not null references users(student_id) on delete cascade,
  won_at  timestamptz not null default now(),
  prize   text        not null default 'coffee_gift_card'
);

create index if not exists idx_lottery_wins_user on lottery_wins (user_id, won_at desc);

alter table lottery_wins enable row level security;

create policy "anon can insert" on lottery_wins for insert to anon with check (true);
create policy "anon can select own" on lottery_wins for select to anon using (true);
