-- ============================================================
-- FINAL SECURITY FIX - Views don't support RLS, use functions
-- ============================================================

-- Drop views that can't have RLS
DROP VIEW IF EXISTS public.safe_app_users;
DROP VIEW IF EXISTS public.public_store_settings;

-- 1. Create secure function for app users (excludes sensitive data)
CREATE OR REPLACE FUNCTION public.get_safe_app_users()
RETURNS TABLE(
  id uuid,
  name text,
  role app_role,
  is_active boolean,
  tenant_id uuid,
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
    au.device_locked_at,
    au.created_at,
    au.updated_at
  FROM app_users au
  WHERE 
    auth_is_system_manager() OR
    auth_in_tenant(au.tenant_id) OR
    (auth.uid() IS NOT NULL AND au.auth_id = auth.uid())
$$;

-- 2. Create secure function for public store settings
CREATE OR REPLACE FUNCTION public.get_public_store_settings(tenant_slug text DEFAULT NULL)
RETURNS TABLE(
  tenant_id uuid,
  store_enabled boolean,
  store_access_blocked boolean,
  subscription_active boolean,
  payment_cod_enabled boolean,
  payment_stripe_enabled boolean,
  payment_bank_enabled boolean,
  payment_vodafone_enabled boolean,
  tax_percentage numeric,
  currency text,
  subdomain text,
  custom_domain text,
  enable_3d_effects boolean,
  enable_glassmorphism boolean,
  enable_particles boolean,
  depth_intensity integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.tenant_id,
    cs.store_enabled,
    cs.store_access_blocked,
    CASE 
      WHEN cs.subscription_expires_at IS NULL OR cs.subscription_expires_at > now() 
      THEN true 
      ELSE false 
    END as subscription_active,
    cs.payment_cod_enabled,
    cs.payment_stripe_enabled,
    cs.payment_bank_enabled,
    cs.payment_vodafone_enabled,
    cs.tax_percentage,
    cs.currency,
    cs.subdomain,
    cs.custom_domain,
    cs.enable_3d_effects,
    cs.enable_glassmorphism,
    cs.enable_particles,
    cs.depth_intensity
  FROM company_settings cs
  INNER JOIN tenants t ON cs.tenant_id = t.id
  WHERE cs.store_enabled = true
  AND t.is_active = true
  AND (tenant_slug IS NULL OR t.slug = tenant_slug)
$$;

-- 3. Create function for secure client access with tenant validation
CREATE OR REPLACE FUNCTION public.get_clients_secure()
RETURNS TABLE(
  id uuid,
  client_number text,
  name text,
  phone text,
  email text,
  address text,
  notes text,
  tenant_id uuid,
  created_at timestamptz,
  updated_at timestamptz
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
    c.tenant_id,
    c.created_at,
    c.updated_at
  FROM clients c
  WHERE 
    auth_is_system_manager() OR
    (auth.uid() IS NOT NULL AND auth_in_tenant(c.tenant_id))
  ORDER BY c.client_number
$$;

-- 4. Create function for store orders with proper access control
CREATE OR REPLACE FUNCTION public.get_store_orders_secure()
RETURNS TABLE(
  id uuid,
  order_number text,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  total_amount numeric,
  order_status text,
  payment_status text,
  payment_method text,
  shipping_status text,
  notes text,
  tenant_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.customer_email,
    o.customer_address,
    o.total_amount,
    o.order_status,
    o.payment_status,
    o.payment_method,
    o.shipping_status,
    o.notes,
    o.tenant_id,
    o.created_at,
    o.updated_at
  FROM store_orders o
  WHERE 
    auth_is_system_manager() OR
    (auth.uid() IS NOT NULL AND auth_in_tenant(o.tenant_id) AND auth_can_view_orders())
  ORDER BY o.created_at DESC
$$;

-- 5. Create views that use these functions (for compatibility)
CREATE OR REPLACE VIEW public.public_store_settings AS
SELECT * FROM get_public_store_settings(NULL);

CREATE OR REPLACE VIEW public.safe_app_users AS
SELECT * FROM get_safe_app_users();

-- Grant function execution
GRANT EXECUTE ON FUNCTION public.get_safe_app_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store_settings(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_clients_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_orders_secure() TO authenticated;

-- Grant view access
GRANT SELECT ON public.public_store_settings TO anon, authenticated;
GRANT SELECT ON public.safe_app_users TO authenticated;