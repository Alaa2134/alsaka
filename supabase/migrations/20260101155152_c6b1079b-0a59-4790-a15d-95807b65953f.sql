-- Add 3D settings columns to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS enable_3d_effects BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS animation_speed TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS enable_particles BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_glassmorphism BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS depth_intensity INTEGER DEFAULT 15;