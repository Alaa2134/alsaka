
-- Fix the log_sensitive_access function to not use the old access_code column
CREATE OR REPLACE FUNCTION public.log_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_info RECORD;
  current_user_code text;
BEGIN
  -- Get the current user code from session
  current_user_code := current_setting('app.current_user_code', true);
  
  -- Get user info by verifying access code hash
  SELECT id, tenant_id INTO user_info 
  FROM app_users 
  WHERE verify_access_code(access_code_hash, current_user_code)
    AND is_active = true
  LIMIT 1;

  -- If no user found, try to get from other context or leave null
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
    COALESCE(user_info.tenant_id, NEW.tenant_id, OLD.tenant_id),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
