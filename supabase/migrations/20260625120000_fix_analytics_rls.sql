-- Fix analytics RLS so store owners can actually read their own traffic.
--
-- businesses.owner_id references profiles.id (NOT auth.uid()). The old
-- page_views owner policy compared owner_id directly to auth.uid(), so it never
-- matched and owners always saw zero page views. Correct it via the profiles
-- join (same pattern analytics_events already uses), and wrap auth.uid() in a
-- subselect so Postgres evaluates it once per query (Supabase perf guidance).

drop policy if exists "Business owners can view their page views" on page_views;
create policy "Business owners can view their page views" on page_views
for select using (
  business_id in (
    select b.id from businesses b
    join profiles p on p.id = b.owner_id
    where p.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can view all page views" on page_views;
create policy "Admins can view all page views" on page_views
for select using (has_role((select auth.uid()), 'admin'::app_role));

drop policy if exists "owner reads events" on analytics_events;
create policy "owner reads events" on analytics_events
for select using (
  exists (
    select 1 from businesses b
    join profiles p on p.id = b.owner_id
    where b.id = analytics_events.business_id
      and p.user_id = (select auth.uid())
  )
);
