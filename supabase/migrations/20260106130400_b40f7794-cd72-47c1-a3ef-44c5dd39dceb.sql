-- Ensure pgcrypto is installed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Robust hashing helpers (avoid digest(text, unknown) by casting + converting to bytea)
CREATE OR REPLACE FUNCTION public.hash_access_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _bytes bytea;
BEGIN
  IF plain_code IS NULL OR btrim(plain_code) = '' THEN
    RETURN NULL;
  END IF;

  _code := upper(btrim(plain_code));
  _bytes := convert_to(_code || 'secure_salt_v1', 'UTF8');
  RETURN encode(digest(_bytes, 'sha256'::text), 'hex');
END;
$$;

DROP FUNCTION IF EXISTS public.verify_access_code(text, text);
CREATE FUNCTION public.verify_access_code(hashed_code text, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _salted bytea;
  _unsalted bytea;
  _salted_hex text;
  _unsalted_hex text;
BEGIN
  IF hashed_code IS NULL OR plain_code IS NULL OR btrim(plain_code) = '' THEN
    RETURN false;
  END IF;

  _code := upper(btrim(plain_code));

  _salted := convert_to(_code || 'secure_salt_v1', 'UTF8');
  _unsalted := convert_to(_code, 'UTF8');

  _salted_hex := encode(digest(_salted, 'sha256'::text), 'hex');
  _unsalted_hex := encode(digest(_unsalted, 'sha256'::text), 'hex');

  RETURN hashed_code = _salted_hex OR hashed_code = _unsalted_hex;
END;
$$;

-- Backup codes hashing (same robustness)
CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _bytes bytea;
BEGIN
  IF plain_code IS NULL OR btrim(plain_code) = '' THEN
    RETURN NULL;
  END IF;

  _code := btrim(plain_code);
  _bytes := convert_to(_code || 'backup_salt_v2', 'UTF8');
  RETURN encode(digest(_bytes, 'sha256'::text), 'hex');
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_backup_code(user_id_param uuid, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed_code text;
  stored_codes text[];
BEGIN
  hashed_code := hash_backup_code(plain_code);

  SELECT backup_codes INTO stored_codes
  FROM app_users
  WHERE id = user_id_param;

  RETURN (
    stored_codes IS NOT NULL AND 
    (plain_code = ANY(stored_codes) OR hashed_code = ANY(stored_codes))
  );
END;
$$;