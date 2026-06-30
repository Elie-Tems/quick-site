-- Optional promotional popup attached to a campaign. When the campaign is active
-- and popup_enabled is true, the storefront shows the popup once per visitor session.
alter table public.campaigns
  add column if not exists popup_enabled boolean not null default false,
  add column if not exists popup_title text,
  add column if not exists popup_text text,
  add column if not exists popup_cta_text text,
  add column if not exists popup_cta_url text,
  add column if not exists popup_coupon_code text;
