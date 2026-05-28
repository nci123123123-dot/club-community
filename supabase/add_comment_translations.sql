alter table comments add column if not exists translations jsonb not null default '{}';
