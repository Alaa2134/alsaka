-- Fix app_users public read vulnerability
DROP POLICY IF EXISTS "Public can verify access codes only" ON public.app_users;

-- Fix two_factor_codes vulnerability
DROP POLICY IF EXISTS "Users can verify own codes" ON public.two_factor_codes;
DROP POLICY IF EXISTS "Secure 2FA code management" ON public.two_factor_codes;
CREATE POLICY "Users can only access own 2FA codes"
ON public.two_factor_codes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE app_users.id = two_factor_codes.user_id 
    AND app_users.auth_id = auth.uid()
  )
);

-- Fix customer_wishlist spam vulnerability
DROP POLICY IF EXISTS "Public can insert wishlist" ON public.customer_wishlist;
DROP POLICY IF EXISTS "Secure wishlist management" ON public.customer_wishlist;
CREATE POLICY "Authenticated users manage wishlists"
ON public.customer_wishlist FOR ALL
USING (auth_is_system_manager() OR auth_in_tenant(tenant_id));

-- Fix audit_logs INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert own audit logs" ON public.audit_logs;

-- Fix store_orders INSERT policy
DROP POLICY IF EXISTS "Public can create orders" ON public.store_orders;
CREATE POLICY "Store orders insert with validation"
ON public.store_orders FOR INSERT
WITH CHECK (
  tenant_id IS NOT NULL AND
  customer_name IS NOT NULL AND
  customer_phone IS NOT NULL
);

-- Tighten company_settings access
DROP POLICY IF EXISTS "Authenticated users can read company settings" ON public.company_settings;
CREATE POLICY "Secure company settings read"
ON public.company_settings FOR SELECT
USING (
  auth_is_system_manager() OR 
  auth_in_tenant(tenant_id) OR
  (store_enabled = true AND auth.uid() IS NULL)
);