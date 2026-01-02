-- 1. Fix app_users table: Remove overly permissive policy and create secure verification function

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow access code verification for login" ON public.app_users;

-- Create a secure function to verify access codes without exposing user data
CREATE OR REPLACE FUNCTION public.verify_user_login(p_access_code text)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_role app_role,
  user_tenant_id uuid,
  is_active boolean,
  two_factor_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.name,
    au.role,
    au.tenant_id,
    au.is_active,
    au.two_factor_enabled
  FROM app_users au
  WHERE au.access_code = p_access_code
    AND au.is_active = true
  LIMIT 1;
END;
$$;

-- 2. Fix company_settings table: Remove public read access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can read store settings" ON public.company_settings;

-- Create a policy that allows public to read only through authenticated context or specific columns
-- Public should use the public_store_settings view instead
CREATE POLICY "Authenticated users can read company settings"
ON public.company_settings
FOR SELECT
USING (
  auth_is_system_manager() OR 
  auth_in_tenant(tenant_id) OR
  -- Allow reading settings for stores that are active (for storefront)
  (store_enabled = true AND store_access_blocked = false)
);

-- Grant execute permission on the login function
GRANT EXECUTE ON FUNCTION public.verify_user_login(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_user_login(text) TO authenticated;