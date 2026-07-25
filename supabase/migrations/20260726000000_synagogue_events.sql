-- Add events array to synagogue_settings so the gabbai can publish
-- special upcoming events (bar-mitzvahs, holiday events, special shiurim…)
-- that appear on the public shul site.
alter table public.synagogue_settings
  add column if not exists events jsonb not null default '[]'::jsonb;
