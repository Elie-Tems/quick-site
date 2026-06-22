-- Per-store "Shabbat mode": when on, the storefront is closed during Shabbat
-- and Yom Tov (Israel times). Merchant-controlled toggle.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS shabbat_mode boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.shabbat_mode IS 'When true, the storefront shows a closed state during Shabbat/Yom Tov (Israel time).';
