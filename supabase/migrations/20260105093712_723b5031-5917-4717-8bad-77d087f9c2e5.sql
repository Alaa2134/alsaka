-- Drop the safe_company_settings view to avoid security definer issues
DROP VIEW IF EXISTS public.safe_company_settings;

-- Drop the public_store_settings SECURITY DEFINER view and recreate without it
DROP VIEW IF EXISTS public.public_store_settings;

CREATE VIEW public.public_store_settings 
WITH (security_invoker = true) AS
SELECT 
  tenant_id,
  subdomain,
  custom_domain,
  store_enabled,
  store_access_blocked,
  subscription_type,
  subscription_expires_at,
  CASE WHEN subscription_expires_at IS NULL OR subscription_expires_at > now() THEN true ELSE false END as subscription_active,
  accounting_enabled,
  inventory_enabled,
  payment_cod_enabled,
  payment_stripe_enabled,
  payment_bank_enabled,
  payment_vodafone_enabled,
  tax_percentage,
  currency,
  links_enabled,
  max_links_per_month,
  link_default_expiry_days,
  allowed_link_types,
  enable_3d_effects,
  enable_glassmorphism,
  enable_particles,
  animation_speed,
  depth_intensity,
  sound_alerts_enabled,
  created_at,
  updated_at
FROM company_settings
WHERE store_enabled = true;