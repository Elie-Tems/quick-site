-- Add sale_price and is_on_sale columns to products table
ALTER TABLE public.products 
ADD COLUMN sale_price numeric DEFAULT NULL,
ADD COLUMN is_on_sale boolean DEFAULT false;