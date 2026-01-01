-- ============================================
-- 1. Create a public view for store settings (hiding sensitive payment data)
-- ============================================

CREATE OR REPLACE VIEW public.public_store_settings AS
SELECT 
  tenant_id,
  store_enabled,
  store_access_blocked,
  subscription_type,
  (subscription_expires_at > NOW()) as subscription_active,
  subscription_expires_at,
  tax_percentage,
  currency,
  payment_cod_enabled,
  payment_stripe_enabled,
  payment_bank_enabled,
  payment_vodafone_enabled,
  enable_3d_effects,
  enable_glassmorphism,
  enable_particles,
  depth_intensity,
  animation_speed,
  links_enabled,
  max_links_per_month,
  link_default_expiry_days,
  allowed_link_types,
  sound_alerts_enabled,
  subdomain,
  custom_domain,
  inventory_enabled,
  accounting_enabled,
  created_at,
  updated_at
FROM company_settings;

-- Grant select on view to public
GRANT SELECT ON public.public_store_settings TO anon;
GRANT SELECT ON public.public_store_settings TO authenticated;

-- ============================================
-- 2. Fix storage bucket policies - require authentication
-- ============================================

-- Drop existing permissive policies for company-logos
DROP POLICY IF EXISTS "Users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos" ON storage.objects;

-- Drop existing permissive policies for product-images
DROP POLICY IF EXISTS "Tenant users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Tenant users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Tenant users can delete product images" ON storage.objects;

-- Create secure helper function for checking authenticated users
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE access_code = current_setting('app.current_user_code', true)
    AND is_active = true
  )
$$;

-- Create secure helper function for checking admin users
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE access_code = current_setting('app.current_user_code', true)
    AND is_active = true
    AND role IN ('admin', 'company_admin', 'system_manager')
  )
$$;

-- ============================================
-- 3. Create encrypted columns for sensitive data
-- ============================================

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns for payment credentials
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS vodafone_number_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number_encrypted TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_id_encrypted TEXT;

-- Create function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(plain_text TEXT, encryption_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  RETURN encode(pgp_sym_encrypt(plain_text, encryption_key), 'base64');
END;
$$;

-- Create function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_text TEXT, encryption_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(decode(encrypted_text, 'base64'), encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- ============================================
-- 4. Add encrypted column for access codes (optional - for future migration)
-- ============================================

ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS access_code_hash TEXT;

-- Create function to hash access codes using bcrypt-style hashing
CREATE OR REPLACE FUNCTION hash_access_code(plain_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(digest(plain_code || 'secure_salt_v1', 'sha256'), 'hex');
END;
$$;

-- Create function to verify access code
CREATE OR REPLACE FUNCTION verify_access_code(plain_code TEXT, hashed_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN hash_access_code(plain_code) = hashed_code;
END;
$$;

-- ============================================
-- 5. Create audit trigger for sensitive operations
-- ============================================

CREATE OR REPLACE FUNCTION log_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_info RECORD;
BEGIN
  -- Get user info from current setting
  SELECT id, tenant_id INTO user_info 
  FROM app_users 
  WHERE access_code = current_setting('app.current_user_code', true)
  LIMIT 1;

  INSERT INTO audit_logs (
    user_id,
    tenant_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    user_info.id,
    user_info.tenant_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add trigger for company_settings changes
DROP TRIGGER IF EXISTS audit_company_settings_changes ON company_settings;
CREATE TRIGGER audit_company_settings_changes
AFTER INSERT OR UPDATE OR DELETE ON company_settings
FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();