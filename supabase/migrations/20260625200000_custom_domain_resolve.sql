-- Resolve a custom domain (e.g. mystore.com, bought through Siango) to the store
-- slug it should serve. The storefront is a public SPA served to anonymous
-- visitors, so it needs to map an incoming Host header -> business slug WITHOUT
-- exposing the whole domains table (which is owner/admin RLS only).
--
-- This SECURITY DEFINER function returns ONLY the slug for an ACTIVE domain, and
-- is callable by anon. It strips a leading "www." so both apex and www resolve.
create or replace function public.get_store_slug_for_domain(p_host text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select b.slug
  from public.domains d
  join public.businesses b on b.id = d.business_id
  where lower(d.domain) = lower(regexp_replace(p_host, '^www\.', ''))
    and d.status = 'active'
    and b.is_published = true
  limit 1;
$$;

grant execute on function public.get_store_slug_for_domain(text) to anon, authenticated;
