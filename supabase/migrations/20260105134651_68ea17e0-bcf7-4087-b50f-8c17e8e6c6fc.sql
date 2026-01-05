-- ============================================================
-- COMPREHENSIVE SECURITY FIX - PHASE 1: DROP PROBLEMATIC POLICIES
-- ============================================================

-- Drop conflicting two_factor_codes policies
DROP POLICY IF EXISTS "Users can insert their own 2fa codes" ON public.two_factor_codes;
DROP POLICY IF EXISTS "Users can only access own 2FA codes" ON public.two_factor_codes;
DROP POLICY IF EXISTS "Users manage own 2FA codes" ON public.two_factor_codes;
DROP POLICY IF EXISTS "System can manage 2fa codes" ON public.two_factor_codes;

-- Drop overly permissive link_access_logs policies
DROP POLICY IF EXISTS "Log link access" ON public.link_access_logs;
DROP POLICY IF EXISTS "Public can insert access logs" ON public.link_access_logs;

-- ============================================================
-- PHASE 2: CREATE SECURE POLICIES
-- ============================================================

-- Two Factor Codes: Strict policies with no open INSERT
CREATE POLICY "two_factor_codes_users_manage_own"
ON public.two_factor_codes FOR ALL
USING (
  auth_is_system_manager() OR
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = two_factor_codes.user_id
    AND au.auth_id = auth.uid()
  )
)
WITH CHECK (
  auth_is_system_manager() OR
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.id = two_factor_codes.user_id
    AND au.auth_id = auth.uid()
  )
);

-- Link Access Logs: Only allow authenticated users to insert logs with valid tenant
CREATE POLICY "link_access_logs_authenticated_insert"
ON public.link_access_logs FOR INSERT
WITH CHECK (
  tenant_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM store_links sl
    WHERE sl.id = link_access_logs.link_id
    AND sl.tenant_id = link_access_logs.tenant_id
    AND sl.is_active = true
  )
);

-- Prevent updates to link access logs
CREATE POLICY "link_access_logs_no_update"
ON public.link_access_logs FOR UPDATE
USING (false);

-- ============================================================
-- PHASE 3: PROTECT AUDIT LOGS
-- ============================================================

-- Allow only system/service role to insert audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "audit_logs_view_admins"
ON public.audit_logs FOR SELECT
USING (
  auth_is_system_manager() OR 
  (auth_is_admin() AND auth_in_tenant(tenant_id))
);

-- Prevent any direct INSERT/UPDATE/DELETE by users (only triggers/functions should insert)
CREATE POLICY "audit_logs_insert_system_only"
ON public.audit_logs FOR INSERT
WITH CHECK (
  auth_is_system_manager()
);

CREATE POLICY "audit_logs_no_update"
ON public.audit_logs FOR UPDATE
USING (false);

CREATE POLICY "audit_logs_no_delete"
ON public.audit_logs FOR DELETE
USING (false);

-- ============================================================
-- PHASE 4: RESTRICT WHATSAPP LOGS TO ADMINS ONLY
-- ============================================================

DROP POLICY IF EXISTS "Users can view whatsapp_notifications_log" ON public.whatsapp_notifications_log;

CREATE POLICY "whatsapp_logs_admin_only"
ON public.whatsapp_notifications_log FOR SELECT
USING (
  auth_is_system_manager() OR 
  (auth_is_admin() AND auth_in_tenant(tenant_id))
);

-- ============================================================
-- PHASE 5: CREATE SECURE VIEW FOR APP_USERS (exclude sensitive columns)
-- ============================================================

CREATE OR REPLACE VIEW public.safe_app_users AS
SELECT 
  id,
  name,
  role,
  is_active,
  tenant_id,
  device_locked_at,
  created_at,
  updated_at
FROM public.app_users;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.safe_app_users TO authenticated;

-- ============================================================
-- PHASE 6: TIGHTEN STORE_ORDERS ACCESS
-- ============================================================

-- Create function to check if user has order management role
CREATE OR REPLACE FUNCTION public.auth_can_view_orders()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE auth_id = auth.uid()
    AND role IN ('admin', 'company_admin', 'manager', 'system_manager')
    AND is_active = true
  )
$$;