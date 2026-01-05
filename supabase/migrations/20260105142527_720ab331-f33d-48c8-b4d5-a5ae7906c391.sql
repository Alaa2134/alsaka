-- 1. إنشاء جدول security_events للأحداث الأمنية
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  user_id UUID REFERENCES public.app_users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إضافة RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- منع الحذف أو التعديل
CREATE POLICY "security_events_no_delete" ON public.security_events
  FOR DELETE USING (false);

CREATE POLICY "security_events_no_update" ON public.security_events
  FOR UPDATE USING (false);

-- السماح بالإدراج للنظام
CREATE POLICY "security_events_insert" ON public.security_events
  FOR INSERT WITH CHECK (true);

-- عرض للمدراء فقط
CREATE POLICY "security_events_view_admins" ON public.security_events
  FOR SELECT USING (
    auth_is_system_manager() OR 
    (auth_is_admin() AND auth_in_tenant(tenant_id))
  );

-- 2. إنشاء دالة لتسجيل الأحداث الأمنية
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type TEXT,
  _severity TEXT DEFAULT 'info',
  _details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _tenant_id UUID;
  _event_id UUID;
BEGIN
  -- Get current user info
  SELECT au.id, au.tenant_id INTO _user_id, _tenant_id
  FROM app_users au
  WHERE au.auth_id = auth.uid();

  INSERT INTO security_events (
    event_type,
    severity,
    user_id,
    tenant_id,
    details
  ) VALUES (
    _event_type,
    _severity,
    _user_id,
    _tenant_id,
    _details
  )
  RETURNING id INTO _event_id;

  RETURN _event_id;
END;
$$;

-- 3. إضافة حقول للجلسات في app_users
ALTER TABLE public.app_users 
  ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- 4. دالة لتحديث نشاط الجلسة
CREATE OR REPLACE FUNCTION public.update_session_activity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE app_users
  SET 
    last_activity_at = now(),
    session_expires_at = now() + INTERVAL '8 hours'
  WHERE auth_id = auth.uid();
END;
$$;

-- 5. دالة للتحقق من صلاحية الجلسة
CREATE OR REPLACE FUNCTION public.check_session_valid()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expires_at TIMESTAMP WITH TIME ZONE;
  _locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT session_expires_at, locked_until INTO _expires_at, _locked_until
  FROM app_users
  WHERE auth_id = auth.uid();

  -- Check if account is locked
  IF _locked_until IS NOT NULL AND _locked_until > now() THEN
    RETURN false;
  END IF;

  -- Check if session expired
  IF _expires_at IS NOT NULL AND _expires_at < now() THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 6. دالة لتسجيل محاولات الدخول الفاشلة
CREATE OR REPLACE FUNCTION public.record_failed_login(
  _access_code TEXT,
  _ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _attempts INTEGER;
  _result JSONB;
BEGIN
  -- Find user by access code
  SELECT id, failed_login_attempts INTO _user_id, _attempts
  FROM app_users
  WHERE access_code = _access_code;

  IF _user_id IS NULL THEN
    -- Log failed attempt for unknown user
    INSERT INTO security_events (event_type, severity, details)
    VALUES ('FAILED_LOGIN_UNKNOWN_USER', 'warning', jsonb_build_object(
      'ip_address', _ip_address,
      'attempted_code', LEFT(_access_code, 3) || '***'
    ));
    
    RETURN jsonb_build_object('success', false, 'locked', false);
  END IF;

  -- Increment failed attempts
  _attempts := COALESCE(_attempts, 0) + 1;
  
  -- Lock account after 5 failed attempts
  IF _attempts >= 5 THEN
    UPDATE app_users
    SET 
      failed_login_attempts = _attempts,
      locked_until = now() + INTERVAL '15 minutes'
    WHERE id = _user_id;

    -- Log account lock
    INSERT INTO security_events (event_type, severity, user_id, tenant_id, details)
    SELECT 'ACCOUNT_LOCKED', 'critical', id, tenant_id, jsonb_build_object(
      'ip_address', _ip_address,
      'failed_attempts', _attempts,
      'locked_until', (now() + INTERVAL '15 minutes')::TEXT
    )
    FROM app_users WHERE id = _user_id;

    RETURN jsonb_build_object('success', false, 'locked', true, 'locked_until', now() + INTERVAL '15 minutes');
  ELSE
    UPDATE app_users
    SET failed_login_attempts = _attempts
    WHERE id = _user_id;

    -- Log failed attempt
    INSERT INTO security_events (event_type, severity, user_id, tenant_id, details)
    SELECT 'FAILED_LOGIN', 'warning', id, tenant_id, jsonb_build_object(
      'ip_address', _ip_address,
      'failed_attempts', _attempts
    )
    FROM app_users WHERE id = _user_id;

    RETURN jsonb_build_object('success', false, 'locked', false, 'attempts', _attempts);
  END IF;
END;
$$;

-- 7. دالة لتسجيل الدخول الناجح
CREATE OR REPLACE FUNCTION public.record_successful_login(
  _user_id UUID,
  _ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset failed attempts and set session
  UPDATE app_users
  SET 
    failed_login_attempts = 0,
    locked_until = NULL,
    last_activity_at = now(),
    session_expires_at = now() + INTERVAL '8 hours'
  WHERE id = _user_id;

  -- Log successful login
  INSERT INTO security_events (event_type, severity, user_id, tenant_id, details)
  SELECT 'LOGIN_SUCCESS', 'info', id, tenant_id, jsonb_build_object(
    'ip_address', _ip_address
  )
  FROM app_users WHERE id = _user_id;
END;
$$;

-- 8. دالة لتسجيل الخروج
CREATE OR REPLACE FUNCTION public.record_logout()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear session
  UPDATE app_users
  SET 
    session_expires_at = NULL,
    last_activity_at = NULL
  WHERE auth_id = auth.uid();

  -- Log logout
  INSERT INTO security_events (event_type, severity, user_id, tenant_id, details)
  SELECT 'LOGOUT', 'info', id, tenant_id, '{}'::jsonb
  FROM app_users WHERE auth_id = auth.uid();
END;
$$;

-- 9. تمكين Realtime للتنبيهات
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events;

-- 10. إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON public.security_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_users_session ON public.app_users(session_expires_at) WHERE session_expires_at IS NOT NULL;