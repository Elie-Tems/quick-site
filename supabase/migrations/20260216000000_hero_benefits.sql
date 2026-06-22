-- Add hero_benefits column for configurable hero info strip (JSON array of strings)
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS hero_benefits jsonb DEFAULT NULL;

COMMENT ON COLUMN public.businesses.hero_benefits IS 'Hero strip benefit texts as JSON array e.g. ["משלוח חינם מעל ₪199", "החלפה והחזרה עד 14 יום", "תשלום מאובטח"]';
