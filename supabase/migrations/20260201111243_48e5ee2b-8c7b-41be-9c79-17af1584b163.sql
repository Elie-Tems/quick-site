-- Add sale_end_date column to products table for automatic sale expiration
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sale_end_date timestamp with time zone;