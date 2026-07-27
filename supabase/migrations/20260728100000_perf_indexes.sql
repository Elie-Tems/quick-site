-- Performance audit (2026-07-28): customers report severe slowness.
-- pipeline_cards is read by usePipeline via .eq('pipeline_id', ...) with no
-- matching index (only (business_id, stage_key) and a partial follow-up index
-- exist), so the leads board does a sequential scan that degrades as leads
-- accumulate. Cheap, purely additive.
create index if not exists idx_cards_pipeline on public.pipeline_cards(pipeline_id, created_at desc);

-- Distinct-visitor count for the admin platform stats. The frontend used to
-- download EVERY page_views row just to Set() the visitor_ids client-side.
-- SECURITY INVOKER: respects the page_views RLS (admins can read; others get 0).
create or replace function public.admin_count_unique_visitors()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct visitor_id) from public.page_views;
$$;
