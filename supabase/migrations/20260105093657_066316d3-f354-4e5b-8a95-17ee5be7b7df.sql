-- Fix company_settings to only allow admins to view payment fields  
DROP POLICY IF EXISTS "Authenticated users view own tenant settings" ON public.company_settings;
CREATE POLICY "Tenant admins view settings"
ON public.company_settings FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (auth_is_system_manager() OR (auth_is_admin() AND auth_in_tenant(tenant_id)))
);

-- Fix store_orders to role-based access
DROP POLICY IF EXISTS "Authenticated tenant users view orders" ON public.store_orders;
CREATE POLICY "Staff can view tenant orders"
ON public.store_orders FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (
    auth_is_system_manager() OR 
    (auth_in_tenant(tenant_id) AND EXISTS (
      SELECT 1 FROM app_users 
      WHERE auth_id = auth.uid() 
      AND role IN ('admin', 'company_admin', 'manager', 'system_manager')
    ))
  )
);

-- Strengthen whatsapp_settings to admin only
DROP POLICY IF EXISTS "Authenticated tenant admins view whatsapp" ON public.whatsapp_settings;
CREATE POLICY "Only admins view whatsapp settings"
ON public.whatsapp_settings FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  (auth_is_system_manager() OR (auth_is_admin() AND auth_in_tenant(tenant_id)))
);

-- Create a view without sensitive data for general users
CREATE OR REPLACE VIEW public.safe_company_settings AS
SELECT 
  id,
  tenant_id,
  subdomain,
  custom_domain,
  store_enabled,
  store_access_blocked,
  subscription_type,
  subscription_expires_at,
  accounting_enabled,
  inventory_enabled,
  payment_cod_enabled,
  payment_stripe_enabled,
  payment_bank_enabled,
  payment_vodafone_enabled,
  tax_percentage,
  currency,
  enable_3d_effects,
  enable_glassmorphism,
  enable_particles,
  animation_speed,
  depth_intensity,
  sound_alerts_enabled,
  created_at,
  updated_at
FROM company_settings;