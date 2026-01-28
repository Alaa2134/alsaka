-- Add logo print settings to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS print_logo_width integer DEFAULT 120,
ADD COLUMN IF NOT EXISTS print_logo_height integer DEFAULT 80,
ADD COLUMN IF NOT EXISTS print_logo_position text DEFAULT 'center';

COMMENT ON COLUMN public.tenants.print_logo_width IS 'Logo width in pixels for invoice printing';
COMMENT ON COLUMN public.tenants.print_logo_height IS 'Logo height in pixels for invoice printing';
COMMENT ON COLUMN public.tenants.print_logo_position IS 'Logo position: left, center, right';