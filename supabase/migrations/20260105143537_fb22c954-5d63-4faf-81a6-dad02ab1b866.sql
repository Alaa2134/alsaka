-- ============================================
-- إصلاح جميع مشاكل الأمان
-- ============================================

-- 1. تشفير البيانات الحساسة في app_users
ALTER TABLE public.app_users 
  DROP COLUMN IF EXISTS access_code CASCADE;

-- 2. إزالة الأعمدة غير المشفرة من company_settings
ALTER TABLE public.company_settings
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS vodafone_number,
  DROP COLUMN IF EXISTS bank_account_number;

-- 3. إضافة حقول الموقع الجغرافي لأحداث الأمان
ALTER TABLE public.security_events
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 4. إنشاء جدول لإعدادات إشعارات البريد
CREATE TABLE IF NOT EXISTS public.email_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
  notify_on_critical_events BOOLEAN DEFAULT true,
  notify_on_failed_logins BOOLEAN DEFAULT true,
  notify_on_account_lock BOOLEAN DEFAULT true,
  weekly_report_enabled BOOLEAN DEFAULT true,
  email_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- تفعيل RLS
ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;

-- سياسات email_notification_settings
CREATE POLICY "email_notification_settings_select_policy" 
ON public.email_notification_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = email_notification_settings.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'system_manager')
  )
);

CREATE POLICY "email_notification_settings_insert_policy" 
ON public.email_notification_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = email_notification_settings.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'system_manager')
  )
);

CREATE POLICY "email_notification_settings_update_policy" 
ON public.email_notification_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = email_notification_settings.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'system_manager')
  )
);

-- 5. جدول التقارير الأمنية الأسبوعية
CREATE TABLE IF NOT EXISTS public.security_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'weekly',
  report_data JSONB NOT NULL DEFAULT '{}',
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_reports_select_policy" 
ON public.security_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = security_reports.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'system_manager')
  )
);

-- 6. تحسين سياسات clients للحد من الوصول حسب الدور
DROP POLICY IF EXISTS "Users can view clients in their tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in their tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients in their tenant" ON public.clients;

CREATE POLICY "clients_select_by_role" 
ON public.clients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = clients.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'manager', 'cashier', 'system_manager')
  )
);

CREATE POLICY "clients_insert_by_role" 
ON public.clients 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = clients.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'manager', 'cashier', 'system_manager')
  )
);

CREATE POLICY "clients_update_by_role" 
ON public.clients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = clients.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'manager', 'system_manager')
  )
);

CREATE POLICY "clients_delete_by_role" 
ON public.clients 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = clients.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'system_manager')
  )
);

-- 7. تحسين سياسات store_orders
DROP POLICY IF EXISTS "Tenant users can view orders" ON public.store_orders;
DROP POLICY IF EXISTS "Tenant users can insert orders" ON public.store_orders;
DROP POLICY IF EXISTS "Tenant users can update orders" ON public.store_orders;

CREATE POLICY "store_orders_select_by_role" 
ON public.store_orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = store_orders.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'manager', 'cashier', 'system_manager')
  )
);

CREATE POLICY "store_orders_insert_public" 
ON public.store_orders 
FOR INSERT 
WITH CHECK (
  -- Allow public order creation
  true
);

CREATE POLICY "store_orders_update_by_role" 
ON public.store_orders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.auth_id = auth.uid()
    AND au.tenant_id = store_orders.tenant_id
    AND au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'manager', 'system_manager')
  )
);

-- 8. تحسين audit_logs لإخفاء البيانات الحساسة
CREATE OR REPLACE FUNCTION public.mask_sensitive_audit_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  masked_old JSONB;
  masked_new JSONB;
  sensitive_fields TEXT[] := ARRAY['access_code', 'access_code_hash', 'two_factor_secret', 'backup_codes', 'password', 'bank_account_number', 'stripe_account_id', 'vodafone_number'];
  field TEXT;
BEGIN
  masked_old := NEW.old_data;
  masked_new := NEW.new_data;
  
  FOREACH field IN ARRAY sensitive_fields LOOP
    IF masked_old ? field THEN
      masked_old := masked_old || jsonb_build_object(field, '***MASKED***');
    END IF;
    IF masked_new ? field THEN
      masked_new := masked_new || jsonb_build_object(field, '***MASKED***');
    END IF;
  END LOOP;
  
  NEW.old_data := masked_old;
  NEW.new_data := masked_new;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mask_audit_sensitive_data ON public.audit_logs;
CREATE TRIGGER mask_audit_sensitive_data
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.mask_sensitive_audit_data();

-- 9. دالة لتسجيل أحداث الأمان مع الموقع الجغرافي
CREATE OR REPLACE FUNCTION public.log_security_event_with_location(
  _event_type TEXT,
  _severity TEXT DEFAULT 'info',
  _details JSONB DEFAULT '{}',
  _ip_address TEXT DEFAULT NULL,
  _country TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL,
  _latitude DOUBLE PRECISION DEFAULT NULL,
  _longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _tenant_id UUID;
  _event_id UUID;
BEGIN
  -- Get current user info
  SELECT id, tenant_id INTO _user_id, _tenant_id
  FROM app_users
  WHERE auth_id = auth.uid()
  AND is_active = true
  LIMIT 1;

  INSERT INTO security_events (
    event_type, 
    severity, 
    user_id, 
    tenant_id, 
    ip_address, 
    details,
    country,
    city,
    latitude,
    longitude
  )
  VALUES (
    _event_type, 
    _severity, 
    _user_id, 
    _tenant_id, 
    _ip_address, 
    _details,
    _country,
    _city,
    _latitude,
    _longitude
  )
  RETURNING id INTO _event_id;

  RETURN _event_id;
END;
$$;

-- 10. دالة لإنشاء التقرير الأمني الأسبوعي
CREATE OR REPLACE FUNCTION public.generate_weekly_security_report(_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _report_id UUID;
  _period_start TIMESTAMP WITH TIME ZONE;
  _period_end TIMESTAMP WITH TIME ZONE;
  _report_data JSONB;
BEGIN
  _period_end := now();
  _period_start := _period_end - INTERVAL '7 days';
  
  SELECT jsonb_build_object(
    'total_events', (SELECT COUNT(*) FROM security_events WHERE tenant_id = _tenant_id AND created_at BETWEEN _period_start AND _period_end),
    'critical_events', (SELECT COUNT(*) FROM security_events WHERE tenant_id = _tenant_id AND severity = 'critical' AND created_at BETWEEN _period_start AND _period_end),
    'warning_events', (SELECT COUNT(*) FROM security_events WHERE tenant_id = _tenant_id AND severity = 'warning' AND created_at BETWEEN _period_start AND _period_end),
    'failed_logins', (SELECT COUNT(*) FROM security_events WHERE tenant_id = _tenant_id AND event_type LIKE '%FAILED%' AND created_at BETWEEN _period_start AND _period_end),
    'successful_logins', (SELECT COUNT(*) FROM security_events WHERE tenant_id = _tenant_id AND event_type = 'LOGIN_SUCCESS' AND created_at BETWEEN _period_start AND _period_end),
    'account_locks', (SELECT COUNT(*) FROM security_events WHERE tenant_id = _tenant_id AND event_type = 'ACCOUNT_LOCKED' AND created_at BETWEEN _period_start AND _period_end),
    'unique_ips', (SELECT COUNT(DISTINCT ip_address) FROM security_events WHERE tenant_id = _tenant_id AND created_at BETWEEN _period_start AND _period_end),
    'unique_countries', (SELECT array_agg(DISTINCT country) FROM security_events WHERE tenant_id = _tenant_id AND country IS NOT NULL AND created_at BETWEEN _period_start AND _period_end),
    'top_events', (
      SELECT jsonb_agg(jsonb_build_object('type', event_type, 'count', cnt))
      FROM (
        SELECT event_type, COUNT(*) as cnt
        FROM security_events
        WHERE tenant_id = _tenant_id AND created_at BETWEEN _period_start AND _period_end
        GROUP BY event_type
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    )
  ) INTO _report_data;
  
  INSERT INTO security_reports (tenant_id, report_type, report_data, period_start, period_end)
  VALUES (_tenant_id, 'weekly', _report_data, _period_start, _period_end)
  RETURNING id INTO _report_id;
  
  RETURN _report_id;
END;
$$;

-- 11. إصلاح view public_store_settings
DROP VIEW IF EXISTS public.public_store_settings;

CREATE VIEW public.public_store_settings
WITH (security_invoker = true)
AS
SELECT 
  cs.tenant_id,
  cs.subdomain,
  cs.custom_domain,
  cs.store_enabled,
  cs.store_access_blocked,
  cs.currency,
  cs.tax_percentage,
  cs.payment_cod_enabled,
  cs.payment_bank_enabled,
  cs.payment_stripe_enabled,
  cs.payment_vodafone_enabled,
  cs.enable_3d_effects,
  cs.enable_glassmorphism,
  cs.enable_particles,
  cs.depth_intensity,
  CASE 
    WHEN cs.subscription_expires_at IS NULL THEN true
    WHEN cs.subscription_expires_at > now() THEN true
    ELSE false
  END as subscription_active
FROM company_settings cs
JOIN tenants t ON t.id = cs.tenant_id
WHERE t.is_active = true;