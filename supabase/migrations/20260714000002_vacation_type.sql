-- Extend business_type check constraint to allow 'vacation'
alter table business_profiles
  drop constraint if exists business_profiles_business_type_check;

alter table business_profiles
  add constraint business_profiles_business_type_check
  check (business_type in ('products','services','realestate','nonprofit','synagogue','vacation'));
