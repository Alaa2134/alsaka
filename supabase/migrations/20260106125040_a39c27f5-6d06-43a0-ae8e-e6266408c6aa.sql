-- Enable pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop and recreate verify_access_code function
DROP FUNCTION IF EXISTS public.verify_access_code(text, text);

CREATE FUNCTION public.verify_access_code(hashed_code text, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN hashed_code = encode(digest(plain_code, 'sha256'), 'hex');
END;
$$;