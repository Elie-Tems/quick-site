-- Seed the admin role for the platform admins (moti4384, furmand713).
-- The admin UI (/manage-x7k9) gates on has_role(auth.uid(), 'admin'), which reads
-- public.user_roles. If an admin has no row here they get "אין גישה" even though
-- CLAUDE.md lists them as admins - this reconciles the DB with that intent.
-- Idempotent: safe to run more than once (UNIQUE(user_id, role) + ON CONFLICT).
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('moti4384@gmail.com', 'furmand713@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
