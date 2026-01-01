-- Drop and recreate the view with correct column order
DROP VIEW IF EXISTS public.public_store_settings;

CREATE VIEW public.public_store_settings AS
SELECT 
  tenant_id,
  store_enabled,
  store_access_blocked,
  subscription_type,
  subscription_expires_at,
  CASE WHEN subscription_expires_at IS NULL OR subscription_expires_at > now() THEN true ELSE false END as subscription_active,
  tax_percentage,
  payment_cod_enabled,
  payment_stripe_enabled,
  payment_bank_enabled,
  payment_vodafone_enabled,
  enable_3d_effects,
  enable_glassmorphism,
  enable_particles,
  depth_intensity,
  links_enabled,
  max_links_per_month,
  link_default_expiry_days,
  sound_alerts_enabled,
  inventory_enabled,
  accounting_enabled,
  created_at,
  updated_at,
  currency,
  animation_speed,
  allowed_link_types,
  subdomain,
  custom_domain
FROM company_settings;

-- Add inactivity_timeout_minutes to system_settings
INSERT INTO system_settings (key, value, description)
VALUES ('inactivity_timeout_minutes', '15', 'مدة الخمول قبل قفل الجلسة (بالدقائق)')
ON CONFLICT (key) DO NOTHING;