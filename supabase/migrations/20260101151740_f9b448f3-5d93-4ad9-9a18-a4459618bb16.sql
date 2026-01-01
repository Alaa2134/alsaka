-- 1. Create audit_logs table for tracking all operations
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.app_users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs can only be viewed by system_manager and company admins
CREATE POLICY "System managers can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND role = 'system_manager'
      AND is_active = true
    )
  );

CREATE POLICY "Company admins can view their tenant audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND role IN ('admin', 'company_admin')
      AND tenant_id = audit_logs.tenant_id
      AND is_active = true
    )
  );

-- Audit logs can only be inserted (never updated or deleted)
CREATE POLICY "Anyone can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- 2. Create company_settings table for per-company configuration
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  subdomain TEXT UNIQUE,
  custom_domain TEXT,
  store_enabled BOOLEAN DEFAULT true,
  accounting_enabled BOOLEAN DEFAULT true,
  inventory_enabled BOOLEAN DEFAULT true,
  payment_cod_enabled BOOLEAN DEFAULT true,
  payment_stripe_enabled BOOLEAN DEFAULT false,
  payment_bank_enabled BOOLEAN DEFAULT false,
  payment_vodafone_enabled BOOLEAN DEFAULT false,
  stripe_account_id TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  vodafone_number TEXT,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System managers can manage all company settings"
  ON public.company_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND role = 'system_manager'
      AND is_active = true
    )
  );

CREATE POLICY "Company admins can view and update their settings"
  ON public.company_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND role IN ('admin', 'company_admin')
      AND tenant_id = company_settings.tenant_id
      AND is_active = true
    )
  );

-- 3. Create system_settings table for global settings
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System managers can manage system settings"
  ON public.system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND role = 'system_manager'
      AND is_active = true
    )
  );

CREATE POLICY "Everyone can read system settings"
  ON public.system_settings FOR SELECT
  USING (true);

-- 4. Function to check if user is system manager
CREATE OR REPLACE FUNCTION public.is_system_manager(_access_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE access_code = _access_code
      AND role = 'system_manager'
      AND is_active = true
  )
$$;

-- 5. Add indexes for audit logs
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);