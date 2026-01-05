-- Strengthen app_users policy to require explicit auth
DROP POLICY IF EXISTS "Admins can manage users" ON public.app_users;
DROP POLICY IF EXISTS "Users can read own data" ON public.app_users;

CREATE POLICY "Authenticated admins manage users"
ON public.app_users FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    auth_is_system_manager() OR 
    (auth_is_admin() AND auth_in_tenant(tenant_id))
  )
);

CREATE POLICY "Authenticated users read own profile"
ON public.app_users FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  auth_id = auth.uid()
);

-- Strengthen clients policy
DROP POLICY IF EXISTS "Tenant users can view clients" ON public.clients;
CREATE POLICY "Authenticated tenant users view clients"
ON public.clients FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  (auth_is_system_manager() OR auth_in_tenant(tenant_id))
);

-- Fix company_settings to hide sensitive data for public
DROP POLICY IF EXISTS "Secure company settings read" ON public.company_settings;
DROP POLICY IF EXISTS "View settings for store or tenant" ON public.company_settings;
CREATE POLICY "Authenticated users view own tenant settings"
ON public.company_settings FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (auth_is_system_manager() OR auth_in_tenant(tenant_id))
);

-- Strengthen store_orders SELECT
DROP POLICY IF EXISTS "Secure order access" ON public.store_orders;
CREATE POLICY "Authenticated tenant users view orders"
ON public.store_orders FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (auth_is_system_manager() OR auth_in_tenant(tenant_id))
);

-- Strengthen whatsapp_settings
DROP POLICY IF EXISTS "Tenant users can view whatsapp settings" ON public.whatsapp_settings;
CREATE POLICY "Authenticated tenant admins view whatsapp"
ON public.whatsapp_settings FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (auth_is_system_manager() OR (auth_is_admin() AND auth_in_tenant(tenant_id)))
);

-- Strengthen invoices policy
DROP POLICY IF EXISTS "Tenant users can view invoices" ON public.invoices;
CREATE POLICY "Authenticated tenant users view invoices"
ON public.invoices FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (auth_is_system_manager() OR auth_in_tenant(tenant_id))
);

-- Strengthen products policy
DROP POLICY IF EXISTS "Authenticated tenant users can view products" ON public.products;
CREATE POLICY "Secure products access"
ON public.products FOR SELECT
USING (
  auth_is_system_manager() OR 
  (auth.uid() IS NOT NULL AND auth_in_tenant(tenant_id)) OR
  EXISTS (
    SELECT 1 FROM company_settings cs 
    WHERE cs.tenant_id = products.tenant_id 
    AND cs.store_enabled = true
  )
);