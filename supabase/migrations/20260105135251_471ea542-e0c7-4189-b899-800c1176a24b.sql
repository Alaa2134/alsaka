-- Create a function to get app_user data during login (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_for_login(user_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  role app_role,
  is_active boolean,
  tenant_id uuid,
  auth_id uuid,
  device_id text,
  device_locked_at timestamptz,
  two_factor_enabled boolean,
  two_factor_secret text,
  backup_codes text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id,
    au.name,
    au.role,
    au.is_active,
    au.tenant_id,
    au.auth_id,
    au.device_id,
    au.device_locked_at,
    au.two_factor_enabled,
    au.two_factor_secret,
    au.backup_codes
  FROM app_users au
  WHERE au.id = user_uuid
  AND au.is_active = true
  LIMIT 1
$$;

-- Grant execute to anon (needed during login before auth)
GRANT EXECUTE ON FUNCTION public.get_user_for_login(uuid) TO anon, authenticated;