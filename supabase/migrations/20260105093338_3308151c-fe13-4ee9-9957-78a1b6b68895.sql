-- Drop overly permissive public policies
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;
DROP POLICY IF EXISTS "Public can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Users can view roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Users can view permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Customers can view own orders" ON public.store_orders;

-- Products: Only authenticated users in tenant OR public store view
CREATE POLICY "Authenticated tenant users can view products"
ON public.products FOR SELECT
USING (
  auth_is_system_manager() OR 
  auth_in_tenant(tenant_id) OR
  (SELECT store_enabled FROM company_settings WHERE tenant_id = products.tenant_id LIMIT 1) = true
);

-- Tenants: Only system managers or users within tenant
CREATE POLICY "Restricted tenant access"
ON public.tenants FOR SELECT
USING (auth_is_system_manager() OR auth_in_tenant(id));

-- System settings: Only system managers
CREATE POLICY "System managers can read settings"
ON public.system_settings FOR SELECT
USING (auth_is_system_manager());

-- Custom roles: Only authenticated users in same tenant
CREATE POLICY "Authenticated users can view roles"
ON public.custom_roles FOR SELECT
USING (auth_is_system_manager() OR auth_in_tenant(tenant_id));

-- Role permissions: Only authenticated users in same tenant
CREATE POLICY "Authenticated users can view permissions"
ON public.role_permissions FOR SELECT
USING (auth_is_system_manager() OR auth_in_tenant(tenant_id));

-- Store orders: Fix weak phone-based access
DROP POLICY IF EXISTS "Public can view orders by number" ON public.store_orders;
CREATE POLICY "Secure order access"
ON public.store_orders FOR SELECT
USING (
  auth_is_system_manager() OR 
  auth_in_tenant(tenant_id)
);