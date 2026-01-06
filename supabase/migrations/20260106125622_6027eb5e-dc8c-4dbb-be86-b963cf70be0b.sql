-- Ensure pgcrypto is available (required for digest/pgp functions)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Canonical hash for access codes (case-insensitive, trimmed)
CREATE OR REPLACE FUNCTION public.hash_access_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _code text;
BEGIN
  IF plain_code IS NULL OR btrim(plain_code) = '' THEN
    RETURN NULL;
  END IF;

  _code := upper(btrim(plain_code));
  RETURN encode(extensions.digest(_code || 'secure_salt_v1', 'sha256'), 'hex');
END;
$$;

-- Backward-compatible verifier (supports legacy unsalted hashes + prevents NULL errors)
DROP FUNCTION IF EXISTS public.verify_access_code(text, text);
CREATE FUNCTION public.verify_access_code(hashed_code text, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _code text;
  _salted text;
  _unsalted text;
BEGIN
  IF hashed_code IS NULL OR plain_code IS NULL OR btrim(plain_code) = '' THEN
    RETURN false;
  END IF;

  _code := upper(btrim(plain_code));
  _salted := encode(extensions.digest(_code || 'secure_salt_v1', 'sha256'), 'hex');
  _unsalted := encode(extensions.digest(_code, 'sha256'), 'hex');

  -- Accept both new and legacy formats
  RETURN hashed_code = _salted OR hashed_code = _unsalted;
END;
$$;

-- If older data accidentally stored the plain access code inside access_code_hash, convert it once
UPDATE public.app_users
SET access_code_hash = public.hash_access_code(access_code_hash)
WHERE access_code_hash IS NOT NULL
  AND access_code_hash !~ '^[0-9a-f]{64}$';

-- Fix legacy helper functions that still referenced the removed access_code column
CREATE OR REPLACE FUNCTION public.is_system_manager(_access_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE verify_access_code(access_code_hash, _access_code)
      AND role = 'system_manager'
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE verify_access_code(access_code_hash, current_setting('app.current_user_code', true))
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE verify_access_code(access_code_hash, current_setting('app.current_user_code', true))
      AND is_active = true
      AND role IN ('admin', 'company_admin', 'system_manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(user_access_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id
  FROM public.app_users
  WHERE verify_access_code(access_code_hash, user_access_code)
    AND is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_has_role(_access_code text, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE verify_access_code(access_code_hash, _access_code)
      AND role = _role
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.user_in_tenant(_access_code text, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE verify_access_code(access_code_hash, _access_code)
      AND tenant_id = _tenant_id
      AND is_active = true
  )
$$;

-- Fix failed-login recorder to locate users by access_code_hash
CREATE OR REPLACE FUNCTION public.record_failed_login(_access_code text, _ip_address text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _attempts INTEGER;
BEGIN
  -- Find user by verifying the provided access code
  SELECT id, failed_login_attempts INTO _user_id, _attempts
  FROM app_users
  WHERE verify_access_code(access_code_hash, _access_code)
  LIMIT 1;

  IF _user_id IS NULL THEN
    INSERT INTO security_events (event_type, severity, details)
    VALUES (
      'FAILED_LOGIN_UNKNOWN_USER',
      'warning',
      jsonb_build_object(
        'ip_address', _ip_address,
        'attempted_code', LEFT(COALESCE(_access_code,''), 3) || '***'
      )
    );

    RETURN jsonb_build_object('success', false, 'locked', false);
  END IF;

  _attempts := COALESCE(_attempts, 0) + 1;

  IF _attempts >= 5 THEN
    UPDATE app_users
    SET 
      failed_login_attempts = _attempts,
      locked_until = now() + INTERVAL '15 minutes'
    WHERE id = _user_id;

    INSERT INTO security_events (event_type, severity, user_id, tenant_id, details)
    SELECT 'ACCOUNT_LOCKED', 'critical', id, tenant_id, jsonb_build_object(
      'ip_address', _ip_address,
      'failed_attempts', _attempts,
      'locked_until', (now() + INTERVAL '15 minutes')::TEXT
    )
    FROM app_users WHERE id = _user_id;

    RETURN jsonb_build_object('success', false, 'locked', true, 'locked_until', now() + INTERVAL '15 minutes');
  END IF;

  UPDATE app_users
  SET failed_login_attempts = _attempts
  WHERE id = _user_id;

  INSERT INTO security_events (event_type, severity, user_id, tenant_id, details)
  SELECT 'FAILED_LOGIN', 'warning', id, tenant_id, jsonb_build_object(
    'ip_address', _ip_address,
    'failed_attempts', _attempts
  )
  FROM app_users WHERE id = _user_id;

  RETURN jsonb_build_object('success', false, 'locked', false, 'attempts', _attempts);
END;
$$;