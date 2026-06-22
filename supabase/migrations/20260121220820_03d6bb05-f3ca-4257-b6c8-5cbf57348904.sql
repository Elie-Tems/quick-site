-- Add editable storefront text fields to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS hero_title text,
ADD COLUMN IF NOT EXISTS hero_badge text DEFAULT 'חדש בחנות',
ADD COLUMN IF NOT EXISTS promo_text text DEFAULT 'משלוח חינם בהזמנה מעל ₪199 ⭐ הנחה 10% לנרשמים חדשים',
ADD COLUMN IF NOT EXISTS cta_text text DEFAULT 'לקולקציה';

-- Add comments explaining the fields
COMMENT ON COLUMN public.businesses.hero_title IS 'Main hero section title (defaults to business name if null)';
COMMENT ON COLUMN public.businesses.hero_badge IS 'Badge text shown above hero title';
COMMENT ON COLUMN public.businesses.promo_text IS 'Promotional banner text in header';
COMMENT ON COLUMN public.businesses.cta_text IS 'Call-to-action button text';