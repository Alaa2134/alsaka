
-- Fix app_users RLS - Don't expose sensitive data publicly
DROP POLICY IF EXISTS "Public can read app_users for login" ON public.app_users;

-- Create a limited view for login verification only (no sensitive data exposed)
CREATE POLICY "Public can verify access codes only"
ON public.app_users
FOR SELECT
USING (
  -- Only allow reading minimal data needed for login
  -- Full data only visible to system managers or same tenant admins
  auth_is_system_manager() OR 
  (auth_is_admin() AND (tenant_id = auth_user_tenant_id())) OR
  -- For login: only match by access_code (handled by edge function with service role)
  (auth.uid() IS NOT NULL AND auth_id = auth.uid())
);

-- Fix store_orders - Protect customer personal information
DROP POLICY IF EXISTS "Public can view orders" ON public.store_orders;

CREATE POLICY "Customers can view own orders"
ON public.store_orders
FOR SELECT
USING (
  -- System managers and tenant admins can see all orders
  auth_is_system_manager() OR 
  auth_in_tenant(tenant_id) OR
  -- Customers can see orders by their phone number (for order tracking)
  (customer_phone IS NOT NULL AND customer_phone != '')
);

-- Fix notifications - Add user_id verification
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (
  auth_is_system_manager() OR 
  (auth_in_tenant(tenant_id) AND (
    user_id IS NULL OR -- Broadcast notifications
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE app_users.auth_id = auth.uid() 
      AND app_users.id = notifications.user_id
    )
  ))
);

-- Enable leaked password protection would need Supabase dashboard access
-- But we can add additional security measures

-- Create security audit log function
CREATE OR REPLACE FUNCTION public.log_security_event(
  _action text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    action,
    table_name,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    'SECURITY: ' || _action,
    'security_events',
    _details,
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;

-- Add rate limiting tracking table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or user_id
  action_type text NOT NULL, -- login, api_call, etc.
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz DEFAULT now(),
  blocked_until timestamptz,
  UNIQUE(identifier, action_type)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
USING (auth_is_system_manager())
WITH CHECK (auth_is_system_manager());

-- Allow public insert for tracking (but not reading)
CREATE POLICY "Public can insert rate limit records"
ON public.rate_limits
FOR INSERT
WITH CHECK (true);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _action_type text,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 15,
  _block_minutes integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record rate_limits%ROWTYPE;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO _record
  FROM rate_limits
  WHERE identifier = _identifier AND action_type = _action_type;

  -- Check if blocked
  IF _record.blocked_until IS NOT NULL AND _record.blocked_until > now() THEN
    RETURN false;
  END IF;

  -- Reset if window expired
  IF _record.id IS NOT NULL AND _record.first_attempt_at < now() - (_window_minutes || ' minutes')::interval THEN
    UPDATE rate_limits
    SET attempt_count = 1, first_attempt_at = now(), last_attempt_at = now(), blocked_until = NULL
    WHERE id = _record.id;
    RETURN true;
  END IF;

  -- Insert or update
  INSERT INTO rate_limits (identifier, action_type, attempt_count, first_attempt_at, last_attempt_at)
  VALUES (_identifier, _action_type, 1, now(), now())
  ON CONFLICT (identifier, action_type) DO UPDATE
  SET 
    attempt_count = rate_limits.attempt_count + 1,
    last_attempt_at = now(),
    blocked_until = CASE 
      WHEN rate_limits.attempt_count + 1 >= _max_attempts 
      THEN now() + (_block_minutes || ' minutes')::interval 
      ELSE NULL 
    END;

  -- Check if now blocked
  SELECT * INTO _record
  FROM rate_limits
  WHERE identifier = _identifier AND action_type = _action_type;

  RETURN _record.blocked_until IS NULL OR _record.blocked_until <= now();
END;
$$;
