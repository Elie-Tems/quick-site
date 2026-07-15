-- Audit findings #28/#29: admin actions that write another merchant's profiles row
-- (reset onboarding, save internal CRM notes) silently affect 0 rows because
-- profiles has only owner-scoped UPDATE RLS (user_id = auth.uid()) and no admin
-- policy - so the write is blocked while the UI still reports success.
--
-- Grant admins UPDATE on any profiles row. has_role() is the SECURITY DEFINER role
-- check already used across the app's admin gates.

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
