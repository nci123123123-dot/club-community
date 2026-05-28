-- Fix: allow DELETE on poll_votes (required for vote cancellation)
-- RLS was enabled but no DELETE policy existed, causing silent no-op deletes.
create policy votes_delete on poll_votes for delete using (true);
