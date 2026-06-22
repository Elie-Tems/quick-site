-- Add is_hot field to products table for featured/hot products
ALTER TABLE public.products 
ADD COLUMN is_hot boolean DEFAULT false;