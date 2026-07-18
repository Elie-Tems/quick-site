-- Real-estate audit fix: contacts-capture used to lazily create a flag-less
-- 3-stage pipeline (new/in_progress/closed) for every vertical, so moving a
-- lead card to "closed" never set status='won' - the deal stayed "open"
-- forever, kept nagging the follow-up reminders strip and the daily digest
-- cron. contacts-capture now creates a tailored pipeline for realestate; this
-- backfills any EXISTING realestate pipeline that still has the old format.
-- Only the 'closed' stage's is_won flag is added - stage KEYS are left
-- untouched so existing pipeline_cards.stage_key values keep resolving.
update public.pipelines
set stages = (
  select jsonb_agg(case when elem->>'key' = 'closed' then elem || jsonb_build_object('is_won', true) else elem end order by ord)
  from jsonb_array_elements(stages) with ordinality as t(elem, ord)
)
where vertical = 'realestate'
  and jsonb_array_length(stages) = 3
  and (stages->0->>'key') = 'new'
  and (stages->1->>'key') = 'in_progress'
  and (stages->2->>'key') = 'closed'
  and coalesce((stages->2->>'is_won')::boolean, false) = false;
