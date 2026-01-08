
-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view categories of their tenant"
ON public.categories FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.app_users 
    WHERE verify_access_code(access_code_hash, current_setting('app.current_user_code', true))
    AND is_active = true
  )
);

CREATE POLICY "Managers can manage categories"
ON public.categories FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.app_users 
    WHERE verify_access_code(access_code_hash, current_setting('app.current_user_code', true))
    AND is_active = true
    AND role IN ('admin', 'company_admin', 'system_manager', 'manager')
  )
);

-- Public can view active categories (for store)
CREATE POLICY "Public can view active categories"
ON public.categories FOR SELECT
USING (is_active = true);

-- Add updated_at trigger
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add category_id to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
