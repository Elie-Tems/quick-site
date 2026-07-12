-- Security: make the customer_contacts view honor RLS.
--
-- The backward-compat view (20260708130000_crm_core) was created WITHOUT
-- `security_invoker`, so it runs with the view owner's privileges and BYPASSES
-- the row level security on public.contacts / public.customer_crm underneath it.
-- If the view is reachable via PostgREST (default privileges on the public
-- schema), a caller could read other merchants' contacts (name/phone/email/notes)
-- cross-tenant. The sibling admin_platform_stats view already sets
-- security_invoker; this brings customer_contacts in line.
ALTER VIEW public.customer_contacts SET (security_invoker = on);

-- Belt and braces: the view is an internal backward-compat shim, not a public
-- API surface. Revoke direct access from the API roles so it is never exposed.
REVOKE ALL ON public.customer_contacts FROM anon, authenticated;
