-- Allow deleting notifications (required for per-item delete and clear-all)
create policy notifications_delete on notifications for delete using (true);
