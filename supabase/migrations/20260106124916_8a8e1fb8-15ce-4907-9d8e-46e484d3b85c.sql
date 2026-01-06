-- Fix verify_user_login function to use access_code_hash instead of access_code
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
    COALESCE(au.two_factor_enabled, false)
  FROM app_users au
  WHERE verify_access_code(au.access_code_hash, p_access_code)
  LIMIT 1;
END;
$$;