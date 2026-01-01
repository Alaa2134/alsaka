
-- Create enum for link types
CREATE TYPE public.store_link_type AS ENUM ('product', 'cart', 'invoice', 'payment', 'offer');

-- Create store_links table
CREATE TABLE public.store_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_code TEXT NOT NULL UNIQUE,
  link_type store_link_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Link data (JSON for flexibility)
  link_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Discount/Offer settings
  discount_type TEXT, -- 'percentage' or 'fixed'
  discount_value NUMERIC DEFAULT 0,
  
  -- Tracking
  created_by UUID REFERENCES public.app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_store_links_tenant ON public.store_links(tenant_id);
CREATE INDEX idx_store_links_code ON public.store_links(link_code);
CREATE INDEX idx_store_links_type ON public.store_links(link_type);

-- Enable RLS
ALTER TABLE public.store_links ENABLE ROW LEVEL SECURITY;

-- Policy: Company admins/managers can manage their tenant's links
CREATE POLICY "Company users can manage their links"
ON public.store_links
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
    AND app_users.is_active = true
    AND (
      app_users.role = 'system_manager'
      OR (
        app_users.role IN ('admin', 'company_admin', 'manager')
        AND app_users.tenant_id = store_links.tenant_id
      )
    )
  )
);

-- Policy: Public can view active links (for customers opening links)
CREATE POLICY "Public can view active links by code"
ON public.store_links
FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (max_uses IS NULL OR current_uses < max_uses)
);

-- Add link settings to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS links_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allowed_link_types TEXT[] DEFAULT ARRAY['product', 'cart', 'invoice', 'payment', 'offer'],
ADD COLUMN IF NOT EXISTS max_links_per_month INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS link_default_expiry_days INTEGER DEFAULT 30;

-- Create link access logs for tracking
CREATE TABLE public.link_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.store_links(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  converted BOOLEAN DEFAULT false,
  order_id UUID REFERENCES public.store_orders(id)
);

-- Enable RLS on access logs
ALTER TABLE public.link_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Company users can view their link logs
CREATE POLICY "Company users can view their link logs"
ON public.link_access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
    AND app_users.is_active = true
    AND (
      app_users.role = 'system_manager'
      OR app_users.tenant_id = link_access_logs.tenant_id
    )
  )
);

-- Policy: System can insert access logs
CREATE POLICY "System can insert access logs"
ON public.link_access_logs
FOR INSERT
WITH CHECK (true);

-- Update trigger for store_links
CREATE TRIGGER update_store_links_updated_at
BEFORE UPDATE ON public.store_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
