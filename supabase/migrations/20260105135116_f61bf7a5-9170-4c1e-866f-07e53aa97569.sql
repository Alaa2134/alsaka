-- Fix Security Definer View issues by using SECURITY INVOKER

-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_store_settings;
DROP VIEW IF EXISTS public.safe_app_users;

-- Recreate as SECURITY INVOKER views (use caller's permissions)
CREATE VIEW public.public_store_settings
WITH (security_invoker = true)
AS
SELECT * FROM get_public_store_settings(NULL);

CREATE VIEW public.safe_app_users
WITH (security_invoker = true)
AS
SELECT * FROM get_safe_app_users();

-- Grant access
GRANT SELECT ON public.public_store_settings TO anon, authenticated;
GRANT SELECT ON public.safe_app_users TO authenticated;