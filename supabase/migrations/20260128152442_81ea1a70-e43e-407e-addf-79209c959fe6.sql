-- إصلاح دالة hash_backup_code لاستخدام extensions.digest
CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(
    extensions.digest(
      plain_code || 'backup_code_salt_v3_secure_' || EXTRACT(YEAR FROM now())::TEXT,
      'sha512'
    ),
    'hex'
  );
END;
$$;

-- إصلاح دالة verify_backup_code للتحقق من الأكواد العادية والمشفرة
CREATE OR REPLACE FUNCTION public.verify_backup_code(user_id_param UUID, plain_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed_code TEXT;
  stored_codes TEXT[];
  code TEXT;
BEGIN
  -- الحصول على الأكواد المخزنة
  SELECT backup_codes INTO stored_codes
  FROM app_users
  WHERE id = user_id_param;

  IF stored_codes IS NULL THEN
    RETURN FALSE;
  END IF;

  -- التحقق من الكود العادي (غير مشفر) أولاً
  IF plain_code = ANY(stored_codes) THEN
    RETURN TRUE;
  END IF;

  -- التحقق من الكود المشفر
  hashed_code := hash_backup_code(plain_code);
  IF hashed_code = ANY(stored_codes) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- إصلاح دالة verify_and_consume_backup_code
CREATE OR REPLACE FUNCTION public.verify_and_consume_backup_code(user_id_param UUID, plain_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed_code TEXT;
  stored_codes TEXT[];
  new_codes TEXT[];
  code TEXT;
  found_match BOOLEAN := FALSE;
BEGIN
  -- الحصول على الأكواد المخزنة
  SELECT backup_codes INTO stored_codes
  FROM app_users
  WHERE id = user_id_param;
  
  IF stored_codes IS NULL THEN
    RETURN FALSE;
  END IF;
  
  hashed_code := hash_backup_code(plain_code);
  
  -- البحث عن الكود وإزالته
  FOREACH code IN ARRAY stored_codes
  LOOP
    IF code = plain_code OR code = hashed_code THEN
      found_match := TRUE;
    ELSE
      new_codes := array_append(new_codes, code);
    END IF;
  END LOOP;
  
  -- تحديث الأكواد المتبقية
  IF found_match THEN
    UPDATE app_users
    SET backup_codes = new_codes
    WHERE id = user_id_param;
  END IF;
  
  RETURN found_match;
END;
$$;