-- Add about_page_body_align to businesses (text alignment on about page: 'center' | 'right')
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS about_page_body_align text DEFAULT 'center';

COMMENT ON COLUMN public.businesses.about_page_body_align IS 'About page body text alignment: center or right';
