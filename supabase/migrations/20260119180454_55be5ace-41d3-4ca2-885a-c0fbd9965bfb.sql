-- إسقاط الدالة القديمة وإعادة إنشائها
-- =====================================================

DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer, integer);

-- إعادة إنشاء الدالة
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15,
  p_block_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limit RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- البحث عن سجل rate limit
  SELECT * INTO v_rate_limit
  FROM rate_limits
  WHERE identifier = p_identifier AND action_type = p_action_type;
  
  -- إذا لم يوجد سجل، إنشاء واحد جديد
  IF NOT FOUND THEN
    INSERT INTO rate_limits (identifier, action_type, first_attempt_at, last_attempt_at, attempt_count)
    VALUES (p_identifier, p_action_type, v_now, v_now, 1);
    RETURN TRUE;
  END IF;
  
  -- التحقق من الحظر
  IF v_rate_limit.blocked_until IS NOT NULL AND v_rate_limit.blocked_until > v_now THEN
    RETURN FALSE;
  END IF;
  
  -- إعادة تعيين إذا انتهت النافذة الزمنية
  IF v_rate_limit.first_attempt_at + (p_window_minutes || ' minutes')::INTERVAL < v_now THEN
    UPDATE rate_limits
    SET first_attempt_at = v_now,
        last_attempt_at = v_now,
        attempt_count = 1,
        blocked_until = NULL
    WHERE identifier = p_identifier AND action_type = p_action_type;
    RETURN TRUE;
  END IF;
  
  -- زيادة عدد المحاولات
  IF v_rate_limit.attempt_count >= p_max_attempts THEN
    -- حظر المستخدم
    UPDATE rate_limits
    SET blocked_until = v_now + (p_block_minutes || ' minutes')::INTERVAL,
        last_attempt_at = v_now
    WHERE identifier = p_identifier AND action_type = p_action_type;
    RETURN FALSE;
  END IF;
  
  -- تحديث المحاولة
  UPDATE rate_limits
  SET attempt_count = attempt_count + 1,
      last_attempt_at = v_now
  WHERE identifier = p_identifier AND action_type = p_action_type;
  
  RETURN TRUE;
END;
$$;

-- 5. تنظيف rate limits القديمة
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE last_attempt_at < now() - INTERVAL '24 hours';
END;
$$;

-- 6. تشفير أكواد الوصول الاحتياطية (backup codes) بشكل أقوى
-- =====================================================
CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(
    digest(
      plain_code || 'backup_code_salt_v3_secure_' || EXTRACT(YEAR FROM now())::TEXT,
      'sha512'
    ),
    'hex'
  );
END;
$$;

-- 7. التحقق من كود احتياطي مع تعطيله بعد الاستخدام
-- =====================================================
CREATE OR REPLACE FUNCTION public.verify_and_consume_backup_code(
  user_id_param UUID,
  plain_code TEXT
)
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
  hashed_code := hash_backup_code(plain_code);
  
  SELECT backup_codes INTO stored_codes
  FROM app_users
  WHERE id = user_id_param;
  
  IF stored_codes IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- البحث عن الكود وإزالته
  FOREACH code IN ARRAY stored_codes
  LOOP
    IF code = hashed_code THEN
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
    
    -- تسجيل حدث أمني
    PERFORM log_security_event(
      'BACKUP_CODE_USED',
      'warning',
      jsonb_build_object('user_id', user_id_param)
    );
  END IF;
  
  RETURN found_match;
END;
$$;

-- 8. منع SQL Injection في البحث
-- =====================================================
CREATE OR REPLACE FUNCTION public.safe_search_products(
  p_tenant_id UUID,
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_safe_term TEXT;
BEGIN
  -- تنظيف مصطلح البحث من الأحرف الخطرة
  v_safe_term := regexp_replace(p_search_term, '[^a-zA-Z0-9\u0600-\u06FF\s]', '', 'g');
  v_safe_term := trim(v_safe_term);
  
  IF length(v_safe_term) < 2 THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT p.*
  FROM products p
  WHERE p.tenant_id = p_tenant_id
    AND (
      p.name ILIKE '%' || v_safe_term || '%'
      OR p.item_number ILIKE '%' || v_safe_term || '%'
      OR p.barcode ILIKE '%' || v_safe_term || '%'
    )
  ORDER BY p.name
  LIMIT LEAST(p_limit, 100)
  OFFSET p_offset;
END;
$$;

-- 9. تقوية RLS للجداول الحساسة
-- =====================================================

-- تحديث سياسات جدول المدفوعات
DROP POLICY IF EXISTS "Users can view payments in their tenant" ON public.payments;
DROP POLICY IF EXISTS "Users can manage payments in their tenant" ON public.payments;

CREATE POLICY "Authenticated users can view payments in their tenant" 
ON public.payments 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT au.tenant_id FROM app_users au 
    WHERE au.is_active = true
  )
);

CREATE POLICY "Authenticated users can manage payments in their tenant" 
ON public.payments 
FOR ALL 
USING (
  tenant_id IN (
    SELECT au.tenant_id FROM app_users au 
    WHERE au.is_active = true
  )
);

-- 10. حماية جدول أحداث الأمان من العبث
-- =====================================================
DROP POLICY IF EXISTS "security_events_insert_only" ON public.security_events;
CREATE POLICY "security_events_insert_only" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "security_events_select_admins" ON public.security_events;
CREATE POLICY "security_events_select_admins" 
ON public.security_events 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT au.tenant_id FROM app_users au 
    WHERE au.is_active = true
    AND au.role IN ('admin', 'company_admin', 'system_manager')
  )
);

-- 11. إخفاء البيانات الحساسة في السجلات
-- =====================================================
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := data;
  sensitive_keys TEXT[] := ARRAY[
    'password', 'access_code', 'secret', 'token', 
    'bank_account', 'credit_card', 'phone', 'email',
    'address', 'ip_address'
  ];
  key TEXT;
BEGIN
  FOREACH key IN ARRAY sensitive_keys
  LOOP
    IF result ? key THEN
      result := jsonb_set(result, ARRAY[key], '"****"'::jsonb);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- 12. trigger لإخفاء البيانات في audit_logs
-- =====================================================
CREATE OR REPLACE FUNCTION public.mask_audit_log_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.old_data IS NOT NULL THEN
    NEW.old_data := mask_sensitive_data(NEW.old_data);
  END IF;
  
  IF NEW.new_data IS NOT NULL THEN
    NEW.new_data := mask_sensitive_data(NEW.new_data);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mask_audit_logs ON public.audit_logs;
CREATE TRIGGER mask_audit_logs
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION mask_audit_log_data();

-- 13. منع تعديل أو حذف السجلات الأمنية
-- =====================================================
DROP POLICY IF EXISTS "security_events_no_update" ON public.security_events;
CREATE POLICY "security_events_no_update" 
ON public.security_events 
FOR UPDATE 
USING (false);

-- 14. إضافة فهارس لتحسين الأداء الأمني
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_created 
ON public.security_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity 
ON public.security_events(severity) WHERE severity IN ('warning', 'critical');

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked 
ON public.rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_active_tenant 
ON public.app_users(tenant_id, is_active) WHERE is_active = true;