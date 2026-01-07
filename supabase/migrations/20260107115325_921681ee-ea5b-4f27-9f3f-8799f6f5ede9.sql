-- Allow tenant admins to create their company_settings row if missing
DROP POLICY IF EXISTS "System managers can insert company settings" ON public.company_settings;

CREATE POLICY "Admins can insert company settings" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (
  auth_is_system_manager() OR 
  (auth_in_tenant(tenant_id) AND (auth_is_admin() OR auth_has_role('company_admin'::app_role)))
);
