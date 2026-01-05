-- Update get_user_for_login to include locked_until
DROP FUNCTION IF EXISTS public.get_user_for_login(UUID);

CREATE OR REPLACE FUNCTION public.get_user_for_login(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  role app_role,
  is_active BOOLEAN,
  tenant_id UUID,
  auth_id UUID,
  device_id TEXT,
  device_locked_at TIMESTAMPTZ,
  two_factor_enabled BOOLEAN,
  two_factor_secret TEXT,
  backup_codes TEXT[],
  locked_until TIMESTAMPTZ,
  failed_login_attempts INTEGER
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
    au.is_active,
    au.tenant_id,
    au.auth_id,
    au.device_id,
    au.device_locked_at,
    au.two_factor_enabled,
    au.two_factor_secret,
    au.backup_codes,
    au.locked_until,
    au.failed_login_attempts
  FROM app_users au
  WHERE au.id = user_uuid;
END;
$$;