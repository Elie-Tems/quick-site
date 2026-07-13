-- The product form (DashboardProducts) writes video_url, but the products table
-- never had the column - so add/edit product failed with
-- "Could not find the 'video_url' column of 'products' in the schema cache".
alter table public.products
  add column if not exists video_url text;
