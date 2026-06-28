-- Security phase 2 - close two open RLS UPDATE holes (neither is needed by any
-- real flow). Guarded so a missing table (ad_links isn't deployed to prod yet)
-- doesn't abort the migration.

-- H2: ad_links "Public can increment clicks" = FOR UPDATE USING(true) -> anyone
-- could edit any link (open redirect / cross-business). Nothing increments clicks
-- via this path. (ad_links not yet in prod; guarded.)
DO $$
BEGIN
  IF to_regclass('public.ad_links') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public can increment clicks" ON public.ad_links;
  END IF;
END $$;

-- H6: referral_logs UPDATE policy let a user self-grant rewards on their own
-- referral rows. Rewards are granted only by SECURITY DEFINER functions (which
-- bypass RLS), so the user-facing UPDATE policy is unnecessary - drop it.
DROP POLICY IF EXISTS "System can update referral logs" ON public.referral_logs;
