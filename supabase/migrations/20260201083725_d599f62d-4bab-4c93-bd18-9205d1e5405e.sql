-- Add WhatsApp message field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS whatsapp_message text DEFAULT 'שלום, הגעתי מהאתר שלכם ואשמח לקבל פרטים נוספים';

-- Set whatsapp_enabled to true by default for better UX
COMMENT ON COLUMN public.businesses.whatsapp_message IS 'Pre-filled message for WhatsApp button on storefront';