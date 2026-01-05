-- ============================================================
-- COMPREHENSIVE SECURITY FIX - FINAL PHASE
-- ============================================================

-- 1. Create secure function to get user data without sensitive columns
CREATE OR REPLACE FUNCTION public.get_safe_user_profile()
RETURNS TABLE(
  id uuid,
  name text,
  role app_role,
  is_active boolean,
  tenant_id uuid,
  two_factor_enabled boolean,
  device_locked_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
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
    au.two_factor_enabled,
    au.device_locked_at,
    au.created_at,
    au.updated_at
  FROM app_users au
  WHERE au.auth_id = auth.uid()
  AND au.is_active = true
  LIMIT 1
$$;

-- 2. Create function to hash backup codes
CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(digest(plain_code || 'backup_salt_v2', 'sha256'), 'hex');
END;
$$;

-- 3. Create function to verify backup code (compares hashed)
CREATE OR REPLACE FUNCTION public.verify_backup_code(user_id_param uuid, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed_code text;
  stored_codes text[];
BEGIN
  hashed_code := hash_backup_code(plain_code);
  
  SELECT backup_codes INTO stored_codes
  FROM app_users
  WHERE id = user_id_param;
  
  -- Check if hashed code exists in stored codes (supports both plain and hashed)
  RETURN (
    stored_codes IS NOT NULL AND 
    (plain_code = ANY(stored_codes) OR hashed_code = ANY(stored_codes))
  );
END;
$$;

-- 4. Create secure function to get client data with role check
CREATE OR REPLACE FUNCTION public.get_tenant_clients(tenant_id_param uuid)
RETURNS TABLE(
  id uuid,
  client_number text,
  name text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.client_number,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.notes,
    c.created_at
  FROM clients c
  WHERE c.tenant_id = tenant_id_param
  AND (
    auth_is_system_manager() OR
    auth_in_tenant(tenant_id_param)
  )
  ORDER BY c.client_number
$$;

-- 5. Create restricted view for public_store_settings (already a view, but ensure security)
-- First check if it's a view or table
DROP VIEW IF EXISTS public.public_store_settings CASCADE;

-- Recreate as SECURITY INVOKER view with limited columns
CREATE VIEW public.public_store_settings
WITH (security_invoker = true)
AS
SELECT 
  tenant_id,
  store_enabled,
  store_access_blocked,
  CASE 
    WHEN subscription_expires_at IS NULL OR subscription_expires_at > now() 
    THEN true 
    ELSE false 
  END as subscription_active,
  payment_cod_enabled,
  payment_stripe_enabled,
  payment_bank_enabled,
  payment_vodafone_enabled,
  tax_percentage,
  currency,
  subdomain,
  enable_3d_effects,
  enable_glassmorphism,
  enable_particles,
  depth_intensity
FROM company_settings
WHERE store_enabled = true;