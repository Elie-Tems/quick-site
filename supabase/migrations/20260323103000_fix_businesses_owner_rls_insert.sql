-- Fix businesses RLS for onboarding creation.
-- Our publish-payment migration only changed SELECT visibility, but in some cases
-- INSERT/UPDATE policies may be missing, causing 42501 "new row violates RLS policy".

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Owners can insert their own business draft (is_published=false)
CREATE POLICY "Owners can insert own business (publish gate)"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = businesses.owner_id
      AND pr.user_id = auth.uid()
  )
);

-- Owners can read their own business (needed for business_is_public_or_owned())
CREATE POLICY "Owners can view own business (publish gate)"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = businesses.owner_id
      AND pr.user_id = auth.uid()
  )
);

-- Owners can update their own business draft
CREATE POLICY "Owners can update own business (publish gate)"
ON public.businesses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = businesses.owner_id
      AND pr.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = businesses.owner_id
      AND pr.user_id = auth.uid()
  )
);

-- Owners can delete their own business
CREATE POLICY "Owners can delete own business (publish gate)"
ON public.businesses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = businesses.owner_id
      AND pr.user_id = auth.uid()
  )
);

