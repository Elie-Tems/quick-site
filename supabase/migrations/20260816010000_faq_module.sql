ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS faq_items jsonb DEFAULT '[]'::jsonb;
