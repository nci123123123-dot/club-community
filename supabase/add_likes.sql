create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  student_id text not null,
  created_at timestamptz default now(),
  unique(post_id, student_id)
);
create table if not exists comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments(id) on delete cascade,
  student_id text not null,
  created_at timestamptz default now(),
  unique(comment_id, student_id)
);
alter table post_likes enable row level security;
alter table comment_likes enable row level security;
create policy "anon all" on post_likes for all using (true) with check (true);
create policy "anon all" on comment_likes for all using (true) with check (true);
