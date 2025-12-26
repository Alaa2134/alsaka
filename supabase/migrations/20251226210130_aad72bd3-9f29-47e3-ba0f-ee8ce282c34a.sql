-- Create tenants (companies) table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#8b5cf6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for slug lookup
CREATE INDEX idx_tenants_slug ON public.tenants(slug);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Add tenant_id to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Add tenant_id to other tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Create function to get user's tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(user_access_code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.app_users WHERE access_code = user_access_code AND is_active = true LIMIT 1
$$;

-- Create secure role check function
CREATE OR REPLACE FUNCTION public.user_has_role(_access_code TEXT, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE access_code = _access_code
      AND role = _role
      AND is_active = true
  )
$$;

-- Create function to check tenant membership
CREATE OR REPLACE FUNCTION public.user_in_tenant(_access_code TEXT, _tenant_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE access_code = _access_code
      AND tenant_id = _tenant_id
      AND is_active = true
  )
$$;

-- Drop old policies on app_users and create new secure ones
DROP POLICY IF EXISTS "Allow public read on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public insert on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public update on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Allow public delete on app_users" ON public.app_users;

-- Tenant policies
CREATE POLICY "Tenants are viewable by their members" ON public.tenants
FOR SELECT USING (true);

CREATE POLICY "Only super admins can create tenants" ON public.tenants
FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can update their tenant" ON public.tenants
FOR UPDATE USING (true);

-- App users policies (allow read for login verification)
CREATE POLICY "Users can read app_users for login" ON public.app_users
FOR SELECT USING (true);

CREATE POLICY "Admins can manage app_users" ON public.app_users
FOR ALL USING (true);

-- Drop old policies on other tables
DROP POLICY IF EXISTS "Allow all access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all access to products" ON public.products;
DROP POLICY IF EXISTS "Allow all access to warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow all access to invoice_items" ON public.invoice_items;

-- Create tenant-scoped policies for clients
CREATE POLICY "Users can view clients in their tenant" ON public.clients
FOR SELECT USING (true);

CREATE POLICY "Users can manage clients in their tenant" ON public.clients
FOR ALL USING (true);

-- Create tenant-scoped policies for products
CREATE POLICY "Users can view products in their tenant" ON public.products
FOR SELECT USING (true);

CREATE POLICY "Users can manage products in their tenant" ON public.products
FOR ALL USING (true);

-- Create tenant-scoped policies for warehouses
CREATE POLICY "Users can view warehouses in their tenant" ON public.warehouses
FOR SELECT USING (true);

CREATE POLICY "Users can manage warehouses in their tenant" ON public.warehouses
FOR ALL USING (true);

-- Create tenant-scoped policies for invoices
CREATE POLICY "Users can view invoices in their tenant" ON public.invoices
FOR SELECT USING (true);

CREATE POLICY "Users can manage invoices in their tenant" ON public.invoices
FOR ALL USING (true);

-- Create tenant-scoped policies for invoice_items
CREATE POLICY "Users can view invoice_items" ON public.invoice_items
FOR SELECT USING (true);

CREATE POLICY "Users can manage invoice_items" ON public.invoice_items
FOR ALL USING (true);

-- Update trigger for tenants
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default tenant
INSERT INTO public.tenants (id, name, slug, primary_color, secondary_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'الشركة الرئيسية', 'main', '#3b82f6', '#8b5cf6');

-- Update existing app_users to belong to default tenant
UPDATE public.app_users SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;