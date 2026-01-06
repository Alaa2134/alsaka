-- Update verify_user_login to handle users without access_code_hash
-- For legacy users, we'll check against name field as fallback
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
SET search_path = public, extensions
AS $$
BEGIN
  -- First try to verify using hashed access code
  RETURN QUERY
  SELECT 
    au.id,
    au.name,
    au.role,
    au.tenant_id,
    au.is_active,
    COALESCE(au.two_factor_enabled, false)
  FROM app_users au
  WHERE au.access_code_hash IS NOT NULL 
    AND au.is_active = true
    AND verify_access_code(au.access_code_hash, p_access_code)
  LIMIT 1;
  
  -- If found, return
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Fallback: for legacy users without hash, check name field
  -- This allows migration of old users
  RETURN QUERY
  SELECT 
    au.id,
    au.name,
    au.role,
    au.tenant_id,
    au.is_active,
    COALESCE(au.two_factor_enabled, false)
  FROM app_users au
  WHERE au.access_code_hash IS NULL 
    AND au.is_active = true
    AND upper(btrim(au.name)) = upper(btrim(p_access_code))
  LIMIT 1;
END;
$$;