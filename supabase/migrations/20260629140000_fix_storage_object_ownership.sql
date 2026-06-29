-- SECURITY FIX: the business-assets UPDATE/DELETE policies only checked
-- bucket_id, so ANY authenticated user could overwrite (upsert) or delete ANY
-- store's images (logos, product/hero images). Scope them to the object's owner.
--
-- Safe: edge functions upload via the service role (bypass RLS, unaffected);
-- client uploads set owner = auth.uid(), so a merchant can still manage their
-- own files. There are no client-side remove() calls. SELECT stays public
-- (assets are served publicly), INSERT stays open (creating new files is fine;
-- the overwrite attack is UPDATE, now closed).

drop policy if exists "Owners can update business assets" on storage.objects;
drop policy if exists "Owners can delete business assets" on storage.objects;

create policy "Owners update own business assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'business-assets' and owner = auth.uid())
  with check (bucket_id = 'business-assets' and owner = auth.uid());

create policy "Owners delete own business assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'business-assets' and owner = auth.uid());
