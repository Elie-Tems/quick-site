alter table businesses
  add column if not exists custom_labels jsonb default '{}'::jsonb;
