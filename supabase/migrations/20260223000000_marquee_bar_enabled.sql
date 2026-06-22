-- Add marquee_bar_enabled to businesses (top strip with scrolling business name above header)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS marquee_bar_enabled boolean DEFAULT true;

COMMENT ON COLUMN public.businesses.marquee_bar_enabled IS 'When true, show the top announcement strip with scrolling business name above the store header';
