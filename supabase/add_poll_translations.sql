-- Add translation JSONB columns to polls and poll_options.
-- Run this in the Supabase SQL Editor.
-- Columns default to '{}' so existing rows are unaffected.

alter table polls
  add column if not exists question_translations jsonb not null default '{}';

alter table poll_options
  add column if not exists label_translations jsonb not null default '{}';
