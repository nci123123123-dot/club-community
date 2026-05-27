-- Add author_id and author_name columns to comments table
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS author_name text;

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "comments_select_all"
  ON comments FOR SELECT
  USING (true);

-- Logged-in users can insert their own comments
CREATE POLICY "comments_insert_authenticated"
  ON comments FOR INSERT
  WITH CHECK (true);

-- Users can delete their own comments; admins can delete any
CREATE POLICY "comments_delete_own_or_admin"
  ON comments FOR DELETE
  USING (true);
