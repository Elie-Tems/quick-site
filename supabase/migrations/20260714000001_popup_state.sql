alter table business_profiles
  add column if not exists popup_state jsonb not null default '{"shown":[],"dismissed":[],"completed":[]}'::jsonb;

comment on column business_profiles.popup_state is
  'Post-launch guided tour state. shown=ids shown at least once, dismissed=ids user skipped, completed=ids user acted on (CTA clicked).';
