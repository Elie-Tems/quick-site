-- Stores optional site sections chosen during onboarding (or later in dashboard).
-- Used currently for kolel/synagogue but designed to be generic.
alter table businesses add column if not exists enabled_features jsonb default '{}'::jsonb;
