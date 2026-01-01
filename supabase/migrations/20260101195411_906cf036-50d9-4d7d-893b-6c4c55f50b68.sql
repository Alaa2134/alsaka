-- Create custom roles table
CREATE TABLE public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6b7280',
  icon TEXT NOT NULL DEFAULT 'users',
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role permissions table
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  role_name TEXT, -- for system roles like 'system_manager', 'admin', etc.
  permission_id TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id),
  UNIQUE(role_name, permission_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_roles
CREATE POLICY "System managers can manage all roles"
ON public.custom_roles
FOR ALL
USING (auth_is_system_manager());

CREATE POLICY "Admins can manage tenant roles"
ON public.custom_roles
FOR ALL
USING (auth_is_admin() AND (tenant_id IS NULL OR auth_in_tenant(tenant_id)));

CREATE POLICY "Users can view roles"
ON public.custom_roles
FOR SELECT
USING (is_system_role = true OR tenant_id IS NULL OR auth_in_tenant(tenant_id));

-- RLS policies for role_permissions
CREATE POLICY "System managers can manage all permissions"
ON public.role_permissions
FOR ALL
USING (auth_is_system_manager());

CREATE POLICY "Admins can manage tenant permissions"
ON public.role_permissions
FOR ALL
USING (auth_is_admin() AND (tenant_id IS NULL OR auth_in_tenant(tenant_id)));

CREATE POLICY "Users can view permissions"
ON public.role_permissions
FOR SELECT
USING (tenant_id IS NULL OR auth_in_tenant(tenant_id));

-- Insert default system roles
INSERT INTO public.custom_roles (name, description, color, icon, is_system_role) VALUES
('system_manager', 'مدير النظام - صلاحيات كاملة', '#ef4444', 'shield-alert', true),
('company_admin', 'مدير الشركة - إدارة شركة واحدة', '#a855f7', 'shield-check', true),
('admin', 'مشرف - صلاحيات إدارية محدودة', '#3b82f6', 'shield', true),
('manager', 'مدير - إدارة العمليات اليومية', '#22c55e', 'user-cog', true),
('cashier', 'كاشير - عمليات البيع فقط', '#6b7280', 'users', true);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();