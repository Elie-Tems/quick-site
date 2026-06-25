-- Let admins read all analytics_events (platform-wide), so the admin
-- Marketplace view can build an aggregate conversion funnel across all stores.
-- Additive: merchants still only see their own (owner policy unchanged).
-- Applied live via the management API on 2026-06-25.

create policy "admins read all events" on public.analytics_events
for select using (has_role((select auth.uid()), 'admin'::app_role));
