-- "המודולים שלי" marketplace: a per-business override for which modules are on.
--
-- NULL  = use the business_type preset (DEFAULT_MODULES in src/lib/businessModules.ts).
-- array = the explicit set the merchant chose in the dashboard.
--
-- getEnabledModules() already honors this column when present (override wins,
-- else the type default), so existing businesses (NULL) keep today's behavior
-- with zero change until the merchant edits their modules.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS enabled_modules text[] DEFAULT NULL;

COMMENT ON COLUMN public.businesses.enabled_modules IS
  'Per-business module override for the dashboard module marketplace. NULL = use the business_type preset.';
