-- Add per-tenant WhatsApp API credentials (encrypted)
ALTER TABLE public.whatsapp_settings 
ADD COLUMN IF NOT EXISTS whatsapp_access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.whatsapp_settings.whatsapp_access_token_encrypted IS 'Encrypted WhatsApp Business API access token per tenant';
COMMENT ON COLUMN public.whatsapp_settings.whatsapp_phone_id IS 'WhatsApp Business Phone Number ID per tenant';