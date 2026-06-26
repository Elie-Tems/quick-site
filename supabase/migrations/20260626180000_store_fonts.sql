-- Per-store font customization. Merchants pick a modern font for headings and a
-- font for body text (two "areas" = granular control), applied on their
-- storefront. Stored on the business; the storefront loads the Google Font and
-- sets the family. Nullable -> falls back to the platform default (Heebo).
alter table public.businesses add column if not exists font_heading text;
alter table public.businesses add column if not exists font_body text;
