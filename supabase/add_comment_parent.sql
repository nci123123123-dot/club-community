alter table comments add column if not exists parent_id uuid references comments(id) on delete cascade;
