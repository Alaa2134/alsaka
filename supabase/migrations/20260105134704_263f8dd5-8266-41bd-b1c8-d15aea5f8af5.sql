-- Fix the SECURITY DEFINER view issue by using SECURITY INVOKER instead

-- Drop the existing view
DROP VIEW IF EXISTS public.safe_app_users;

-- Recreate as SECURITY INVOKER view (safer - uses caller's permissions)
CREATE OR REPLACE VIEW public.safe_app_users
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  role,
  is_active,
  tenant_id,
  device_locked_at,
  created_at,
  updated_at
FROM public.app_users;

-- Grant appropriate permissions
GRANT SELECT ON public.safe_app_users TO authenticated;