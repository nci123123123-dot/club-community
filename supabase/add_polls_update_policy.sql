-- Allow any authenticated request to update polls (app-level auth controls who sees the button)
create policy polls_update on polls for update using (true) with check (true);
