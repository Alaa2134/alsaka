-- ============================================================
-- ADD ENCRYPTION FOR SENSITIVE COMPANY SETTINGS DATA
-- ============================================================

-- Create a secure encryption key storage (using Supabase vault pattern)
-- The key will be derived from tenant_id + a secret salt

-- 1. Create function to encrypt sensitive data with tenant-specific key
CREATE OR REPLACE FUNCTION public.encrypt_company_data(
  plain_text text,
  tenant_uuid uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Create a tenant-specific encryption key
  encryption_key := encode(digest(tenant_uuid::text || 'company_secret_salt_v2', 'sha256'), 'hex');
  
  -- Encrypt the data
  RETURN encode(pgp_sym_encrypt(plain_text, encryption_key), 'base64');
END;
$$;

-- 2. Create function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_company_data(
  encrypted_text text,
  tenant_uuid uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Create a tenant-specific encryption key (same as encrypt)
  encryption_key := encode(digest(tenant_uuid::text || 'company_secret_salt_v2', 'sha256'), 'hex');
  
  -- Decrypt the data
  RETURN pgp_sym_decrypt(decode(encrypted_text, 'base64'), encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (wrong key or corrupted data)
    RETURN NULL;
END;
$$;

-- 3. Create a trigger to automatically encrypt sensitive fields on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_company_settings_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt bank account number if provided and not already encrypted
  IF NEW.bank_account_number IS NOT NULL AND NEW.bank_account_number != '' THEN
    -- Check if it's already encrypted (base64 pattern)
    IF NEW.bank_account_number !~ '^[A-Za-z0-9+/=]+$' OR length(NEW.bank_account_number) < 50 THEN
      NEW.bank_account_number_encrypted := encrypt_company_data(NEW.bank_account_number, NEW.tenant_id);
      NEW.bank_account_number := '****' || RIGHT(NEW.bank_account_number, 4);
    END IF;
  END IF;
  
  -- Encrypt Stripe account ID if provided
  IF NEW.stripe_account_id IS NOT NULL AND NEW.stripe_account_id != '' THEN
    IF NEW.stripe_account_id !~ '^[A-Za-z0-9+/=]+$' OR length(NEW.stripe_account_id) < 50 THEN
      NEW.stripe_account_id_encrypted := encrypt_company_data(NEW.stripe_account_id, NEW.tenant_id);
      NEW.stripe_account_id := '****' || RIGHT(NEW.stripe_account_id, 4);
    END IF;
  END IF;
  
  -- Encrypt Vodafone number if provided
  IF NEW.vodafone_number IS NOT NULL AND NEW.vodafone_number != '' THEN
    IF NEW.vodafone_number !~ '^[A-Za-z0-9+/=]+$' OR length(NEW.vodafone_number) < 50 THEN
      NEW.vodafone_number_encrypted := encrypt_company_data(NEW.vodafone_number, NEW.tenant_id);
      NEW.vodafone_number := '****' || RIGHT(NEW.vodafone_number, 4);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create the trigger on company_settings
DROP TRIGGER IF EXISTS encrypt_company_settings ON public.company_settings;

CREATE TRIGGER encrypt_company_settings
BEFORE INSERT OR UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_company_settings_trigger();

-- 5. Create function to get decrypted company settings (admin only)
CREATE OR REPLACE FUNCTION public.get_decrypted_company_settings(tenant_uuid uuid)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  subdomain text,
  custom_domain text,
  store_enabled boolean,
  store_access_blocked boolean,
  subscription_type text,
  subscription_expires_at timestamptz,
  bank_account_number text,
  bank_account_name text,
  bank_name text,
  stripe_account_id text,
  vodafone_number text,
  payment_cod_enabled boolean,
  payment_bank_enabled boolean,
  payment_stripe_enabled boolean,
  payment_vodafone_enabled boolean,
  tax_percentage numeric,
  currency text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.id,
    cs.tenant_id,
    cs.subdomain,
    cs.custom_domain,
    cs.store_enabled,
    cs.store_access_blocked,
    cs.subscription_type,
    cs.subscription_expires_at,
    COALESCE(
      decrypt_company_data(cs.bank_account_number_encrypted, cs.tenant_id),
      cs.bank_account_number
    ) as bank_account_number,
    cs.bank_account_name,
    cs.bank_name,
    COALESCE(
      decrypt_company_data(cs.stripe_account_id_encrypted, cs.tenant_id),
      cs.stripe_account_id
    ) as stripe_account_id,
    COALESCE(
      decrypt_company_data(cs.vodafone_number_encrypted, cs.tenant_id),
      cs.vodafone_number
    ) as vodafone_number,
    cs.payment_cod_enabled,
    cs.payment_bank_enabled,
    cs.payment_stripe_enabled,
    cs.payment_vodafone_enabled,
    cs.tax_percentage,
    cs.currency
  FROM company_settings cs
  WHERE cs.tenant_id = tenant_uuid
  AND (
    auth_is_system_manager() OR
    (auth_is_admin() AND auth_in_tenant(tenant_uuid))
  )
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_decrypted_company_settings(uuid) TO authenticated;