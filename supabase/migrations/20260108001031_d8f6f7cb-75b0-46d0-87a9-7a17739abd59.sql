-- Fix the encrypt_company_settings_trigger function that references non-existent columns
CREATE OR REPLACE FUNCTION encrypt_company_settings_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- These columns don't exist anymore - the encrypted versions are used directly
  -- So we just return NEW without modification
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add public SELECT policy for tenants (for store link pages)
DO $$
BEGIN
  -- Drop existing restrictive policy if exists
  DROP POLICY IF EXISTS "Public can view basic tenant info" ON public.tenants;
  
  -- Create new policy for public tenant access (name, slug, logo only needed for store pages)
  CREATE POLICY "Public can view basic tenant info"
  ON public.tenants
  FOR SELECT
  USING (is_active = true);
END $$;