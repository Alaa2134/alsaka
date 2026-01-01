-- Add sound alerts setting to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS sound_alerts_enabled boolean DEFAULT true;

-- Add Pro subscription fields to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS subscription_type text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS store_access_blocked boolean DEFAULT false;

-- Add system-level subscription pricing to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'subscription_pricing',
  '{"pro_price": 100, "currency": "EGP", "billing_period": "monthly"}'::jsonb,
  'Pro subscription pricing configuration'
)
ON CONFLICT (key) DO NOTHING;