-- Add device_id column to app_users for device locking
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT NULL;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS device_locked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Users can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-logos');

CREATE POLICY "Users can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-logos');