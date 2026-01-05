-- ========================================
-- إصلاح شامل لمشاكل الأمان - الجزء الثاني
-- ========================================

-- حذف السياسات الموجودة أولاً

-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- store_order_items
DROP POLICY IF EXISTS "Order items viewable by staff" ON public.store_order_items;
DROP POLICY IF EXISTS "Order items insertable with valid order" ON public.store_order_items;
DROP POLICY IF EXISTS "Public can view order items" ON public.store_order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.store_order_items;

-- customer_wishlist
DROP POLICY IF EXISTS "Wishlist managed by tenant staff" ON public.customer_wishlist;
DROP POLICY IF EXISTS "Public can view wishlist" ON public.customer_wishlist;
DROP POLICY IF EXISTS "Public can add to wishlist" ON public.customer_wishlist;
DROP POLICY IF EXISTS "Public can delete wishlist" ON public.customer_wishlist;
DROP POLICY IF EXISTS "Authenticated users can manage wishlist" ON public.customer_wishlist;

-- notifications
DROP POLICY IF EXISTS "Staff can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;

-- rate_limits
DROP POLICY IF EXISTS "Only backend can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Public can insert rate limit records" ON public.rate_limits;
DROP POLICY IF EXISTS "System managers can manage rate limits" ON public.rate_limits;

-- two_factor_codes
DROP POLICY IF EXISTS "Users manage own 2FA codes" ON public.two_factor_codes;
DROP POLICY IF EXISTS "Users can manage their 2FA codes" ON public.two_factor_codes;
DROP POLICY IF EXISTS "Authenticated users can manage 2FA" ON public.two_factor_codes;

-- order_status_history
DROP POLICY IF EXISTS "Staff can view and manage order history" ON public.order_status_history;
DROP POLICY IF EXISTS "Public can view order history" ON public.order_status_history;
DROP POLICY IF EXISTS "Staff can view order history" ON public.order_status_history;
DROP POLICY IF EXISTS "Admins can insert order history" ON public.order_status_history;

-- company_settings
DROP POLICY IF EXISTS "View settings for store or tenant" ON public.company_settings;
DROP POLICY IF EXISTS "Public can view store settings" ON public.company_settings;
DROP POLICY IF EXISTS "Tenant users can view settings" ON public.company_settings;

-- app_users
DROP POLICY IF EXISTS "Users view own data or admins view tenant" ON public.app_users;
DROP POLICY IF EXISTS "Admins can update users" ON public.app_users;
DROP POLICY IF EXISTS "Users can view own data" ON public.app_users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.app_users;

-- link_access_logs
DROP POLICY IF EXISTS "Log link access" ON public.link_access_logs;
DROP POLICY IF EXISTS "Staff view access logs" ON public.link_access_logs;
DROP POLICY IF EXISTS "No deletion of access logs" ON public.link_access_logs;
DROP POLICY IF EXISTS "Staff can view access logs" ON public.link_access_logs;
DROP POLICY IF EXISTS "Anyone can log access" ON public.link_access_logs;

-- ========================================
-- إنشاء السياسات الجديدة الآمنة
-- ========================================

-- store_order_items
CREATE POLICY "Order items viewable by staff"
ON public.store_order_items FOR SELECT
USING (
  auth_is_system_manager()
  OR EXISTS (
    SELECT 1 FROM store_orders so 
    WHERE so.id = order_id 
    AND auth_in_tenant(so.tenant_id)
  )
);

CREATE POLICY "Order items insertable with valid order"
ON public.store_order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM store_orders so 
    WHERE so.id = order_id
  )
);

-- customer_wishlist
CREATE POLICY "Wishlist managed by tenant staff"
ON public.customer_wishlist FOR ALL
USING (auth_is_system_manager() OR auth_in_tenant(tenant_id))
WITH CHECK (auth_is_system_manager() OR auth_in_tenant(tenant_id));

-- notifications
CREATE POLICY "Staff can manage notifications"
ON public.notifications FOR ALL
USING (auth_is_system_manager() OR auth_in_tenant(tenant_id))
WITH CHECK (auth_is_system_manager() OR auth_in_tenant(tenant_id));

-- audit_logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (auth_is_system_manager() OR (auth_is_admin() AND auth_in_tenant(tenant_id)));

-- rate_limits
CREATE POLICY "Only backend can manage rate limits"
ON public.rate_limits FOR ALL
USING (auth_is_system_manager())
WITH CHECK (auth_is_system_manager());

-- two_factor_codes
CREATE POLICY "Users manage own 2FA codes"
ON public.two_factor_codes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.id = user_id 
    AND au.auth_id = auth.uid()
  )
  OR auth_is_system_manager()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.id = user_id 
    AND au.auth_id = auth.uid()
  )
  OR auth_is_system_manager()
);

-- order_status_history
CREATE POLICY "Staff can view and manage order history"
ON public.order_status_history FOR ALL
USING (
  auth_is_system_manager()
  OR EXISTS (
    SELECT 1 FROM store_orders so 
    WHERE so.id = order_id 
    AND auth_in_tenant(so.tenant_id)
  )
)
WITH CHECK (
  auth_is_system_manager()
  OR EXISTS (
    SELECT 1 FROM store_orders so 
    WHERE so.id = order_id 
    AND auth_in_tenant(so.tenant_id)
  )
);

-- company_settings
CREATE POLICY "View settings for store or tenant"
ON public.company_settings FOR SELECT
USING (
  auth_is_system_manager()
  OR auth_in_tenant(tenant_id)
  OR (store_enabled = true AND store_access_blocked = false)
);

-- app_users
CREATE POLICY "Users view own data or admins view tenant"
ON public.app_users FOR SELECT
USING (
  auth.uid() = auth_id
  OR auth_is_system_manager()
  OR (auth_is_admin() AND auth_in_tenant(tenant_id))
);

CREATE POLICY "Admins can update users"
ON public.app_users FOR UPDATE
USING (
  auth.uid() = auth_id
  OR auth_is_system_manager()
  OR (auth_is_admin() AND auth_in_tenant(tenant_id))
);

-- link_access_logs
CREATE POLICY "Log link access"
ON public.link_access_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff view access logs"
ON public.link_access_logs FOR SELECT
USING (auth_is_system_manager() OR auth_in_tenant(tenant_id));

CREATE POLICY "No deletion of access logs"
ON public.link_access_logs FOR DELETE
USING (false);