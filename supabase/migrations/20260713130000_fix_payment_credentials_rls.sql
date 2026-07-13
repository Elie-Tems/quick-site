-- FIX: merchants could never save payment credentials (iCount / PayPlus).
--
-- businesses.owner_id REFERENCES profiles(id) - NOT auth.uid(). The original
-- policy (20260623120000_payplus_integration.sql) compared owner_id directly to
-- auth.uid(), so the WITH CHECK never matched and every client-side upsert failed
-- with "new row violates row-level security policy for table payment_credentials".
-- The same class of bug was already fixed for page_views (20260625120000); this
-- applies the correct profiles-join pattern here too.

drop policy if exists "owner manages own payment credentials" on public.payment_credentials;

create policy "owner manages own payment credentials"
  on public.payment_credentials
  for all
  using (
    business_id in (
      select b.id
      from public.businesses b
      join public.profiles p on p.id = b.owner_id
      where p.user_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select b.id
      from public.businesses b
      join public.profiles p on p.id = b.owner_id
      where p.user_id = auth.uid()
    )
  );
