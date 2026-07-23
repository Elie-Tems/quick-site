alter table businesses add column if not exists weekly_editor_data jsonb default '{}'::jsonb;
