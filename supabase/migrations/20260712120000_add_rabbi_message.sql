-- Adds business_sub_type and rabbi/rosh-yeshiva message fields to businesses.
-- Used by torah-center sub-type (ישיבה / כולל / מרכז תורני).
alter table public.businesses
  add column if not exists business_sub_type text,
  add column if not exists rabbi_name        text,
  add column if not exists rabbi_title       text,
  add column if not exists rabbi_message     text,
  add column if not exists rabbi_image_url   text;

comment on column public.businesses.business_sub_type is 'תת-סוג העסק שנבחר בהרשמה — charity | torah-center | broker וכו''';
comment on column public.businesses.rabbi_name      is 'שם ראש הישיבה / מרא דאתרא';
comment on column public.businesses.rabbi_title     is 'תואר — ראש ישיבה / אב"ד / ראש כולל וכו''';
comment on column public.businesses.rabbi_message   is 'דבר הרב — מלל חופשי המופיע כסקציה ייחודית בחנות';
comment on column public.businesses.rabbi_image_url is 'תמונת הרב — URL לאחסון Supabase';
