-- Ensure extensions schema and pgcrypto are installed there (so we can schema-qualify digest)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate hashing functions to explicitly use extensions.digest
CREATE OR REPLACE FUNCTION public.hash_access_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  RETURN encode(extensions.digest(_bytes, 'sha256'::text), 'hex');
END;
$$;

DROP FUNCTION IF EXISTS public.verify_access_code(text, text);
CREATE FUNCTION public.verify_access_code(hashed_code text, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  _salted_hex := encode(extensions.digest(_salted, 'sha256'::text), 'hex');
  _unsalted_hex := encode(extensions.digest(_unsalted, 'sha256'::text), 'hex');

  RETURN hashed_code = _salted_hex OR hashed_code = _unsalted_hex;
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  RETURN encode(extensions.digest(_bytes, 'sha256'::text), 'hex');
END;
$$;