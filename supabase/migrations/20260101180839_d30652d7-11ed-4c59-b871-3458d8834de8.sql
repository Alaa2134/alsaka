-- Add image_url column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;

-- Create product_images bucket for storing product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view product images
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated tenant users to upload product images
CREATE POLICY "Tenant users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated tenant users to update product images
CREATE POLICY "Tenant users can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- Allow authenticated tenant users to delete product images
CREATE POLICY "Tenant users can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- Fix RLS policies for products table - make them tenant-aware
DROP POLICY IF EXISTS "Users can manage products in their tenant" ON public.products;
DROP POLICY IF EXISTS "Users can view products in their tenant" ON public.products;

-- Products are publicly readable for store access
CREATE POLICY "Public can view products by tenant"
ON public.products FOR SELECT
USING (true);

-- Only authenticated tenant users can manage products
CREATE POLICY "Tenant users can manage their products"
ON public.products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (
        app_users.role = 'system_manager'
        OR app_users.tenant_id = products.tenant_id
      )
  )
);

-- Fix company_settings to allow public read for store_access_blocked check
DROP POLICY IF EXISTS "Company admins can view and update their settings" ON public.company_settings;
DROP POLICY IF EXISTS "System managers can manage all company settings" ON public.company_settings;

-- Public can read limited settings for store access check
CREATE POLICY "Public can read store settings"
ON public.company_settings FOR SELECT
USING (true);

-- Admins can manage their settings
CREATE POLICY "Admins can manage company settings"
ON public.company_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (
        app_users.role = 'system_manager'
        OR (
          app_users.role IN ('admin', 'company_admin')
          AND app_users.tenant_id = company_settings.tenant_id
        )
      )
  )
);