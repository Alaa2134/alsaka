-- ============================================================
-- FIX REMAINING SECURITY ISSUES
-- ============================================================

-- 1. Enable RLS on safe_app_users view (it's a view, so we need different approach)
-- Drop and recreate with RLS-compatible approach
DROP VIEW IF EXISTS public.safe_app_users;

-- Recreate with proper security context
CREATE VIEW public.safe_app_users
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  role,
  is_active,
  tenant_id,
  device_locked_at,
  created_at,
  updated_at
FROM public.app_users
WHERE 
  -- System managers see all
  auth_is_system_manager() OR
  -- Users in same tenant
  auth_in_tenant(tenant_id) OR
  -- User's own record
  auth_id = auth.uid();

-- Grant SELECT to authenticated users only
REVOKE ALL ON public.safe_app_users FROM public;
REVOKE ALL ON public.safe_app_users FROM anon;
GRANT SELECT ON public.safe_app_users TO authenticated;

-- 2. Fix public_store_settings - make it properly restricted
DROP VIEW IF EXISTS public.public_store_settings;

CREATE VIEW public.public_store_settings
WITH (security_invoker = true)
AS
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
AND t.is_active = true;

-- Allow public read for store settings (needed for storefront)
GRANT SELECT ON public.public_store_settings TO anon;
GRANT SELECT ON public.public_store_settings TO authenticated;

-- 3. Strengthen clients table RLS
DROP POLICY IF EXISTS "Authenticated tenant users view clients" ON public.clients;
DROP POLICY IF EXISTS "Tenant users can manage clients" ON public.clients;

-- Strict tenant isolation for clients
CREATE POLICY "clients_strict_tenant_isolation_select"
ON public.clients FOR SELECT
USING (
  auth_is_system_manager() OR 
  (auth.uid() IS NOT NULL AND auth_in_tenant(tenant_id))
);

CREATE POLICY "clients_strict_tenant_isolation_insert"
ON public.clients FOR INSERT
WITH CHECK (
  auth_is_system_manager() OR 
  (auth.uid() IS NOT NULL AND tenant_id = auth_user_tenant_id())
);

CREATE POLICY "clients_strict_tenant_isolation_update"
ON public.clients FOR UPDATE
USING (
  auth_is_system_manager() OR 
  (auth.uid() IS NOT NULL AND auth_in_tenant(tenant_id))
)
WITH CHECK (
  auth_is_system_manager() OR 
  (auth.uid() IS NOT NULL AND tenant_id = auth_user_tenant_id())
);

CREATE POLICY "clients_strict_tenant_isolation_delete"
ON public.clients FOR DELETE
USING (
  auth_is_system_manager() OR 
  (auth_is_admin() AND auth_in_tenant(tenant_id))
);

-- 4. Strengthen store_orders RLS  
DROP POLICY IF EXISTS "Staff can view tenant orders" ON public.store_orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.store_orders;
DROP POLICY IF EXISTS "Store orders insert with validation" ON public.store_orders;

-- Strict policies for store_orders
CREATE POLICY "store_orders_tenant_view"
ON public.store_orders FOR SELECT
USING (
  auth_is_system_manager() OR
  (auth.uid() IS NOT NULL AND auth_in_tenant(tenant_id) AND auth_can_view_orders())
);

CREATE POLICY "store_orders_public_insert"
ON public.store_orders FOR INSERT
WITH CHECK (
  tenant_id IS NOT NULL AND
  customer_name IS NOT NULL AND
  customer_phone IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM company_settings cs
    WHERE cs.tenant_id = store_orders.tenant_id
    AND cs.store_enabled = true
    AND cs.store_access_blocked = false
  )
);

CREATE POLICY "store_orders_admin_update"
ON public.store_orders FOR UPDATE
USING (
  auth_is_system_manager() OR
  (auth_is_admin() AND auth_in_tenant(tenant_id))
);

-- 5. Restrict app_users access to 2FA secrets - only own record
DROP POLICY IF EXISTS "Admins can manage app_users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can update users" ON public.app_users;
DROP POLICY IF EXISTS "Authenticated admins manage users" ON public.app_users;
DROP POLICY IF EXISTS "Authenticated users read own profile" ON public.app_users;
DROP POLICY IF EXISTS "Users view own data or admins view tenant" ON public.app_users;

-- Stricter app_users policies
CREATE POLICY "app_users_own_profile_view"
ON public.app_users FOR SELECT
USING (
  auth_is_system_manager() OR
  (auth.uid() IS NOT NULL AND auth_id = auth.uid()) OR
  (auth_is_admin() AND auth_in_tenant(tenant_id))
);

CREATE POLICY "app_users_admin_manage"
ON public.app_users FOR ALL
USING (
  auth_is_system_manager() OR
  (auth_is_admin() AND auth_in_tenant(tenant_id))
)
WITH CHECK (
  auth_is_system_manager() OR
  (auth_is_admin() AND (tenant_id IS NULL OR tenant_id = auth_user_tenant_id()))
);

CREATE POLICY "app_users_update_own"
ON public.app_users FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND auth_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND auth_id = auth.uid()
);