-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Fix verify_access_code to use the same salt as hash_access_code
CREATE OR REPLACE FUNCTION public.verify_access_code(hashed_code text, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN hashed_code = encode(extensions.digest(plain_code || 'secure_salt_v1', 'sha256'), 'hex');
END;
$$;

-- Fix hash_access_code to use extensions schema
CREATE OR REPLACE FUNCTION public.hash_access_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN encode(extensions.digest(plain_code || 'secure_salt_v1', 'sha256'), 'hex');
END;
$$;