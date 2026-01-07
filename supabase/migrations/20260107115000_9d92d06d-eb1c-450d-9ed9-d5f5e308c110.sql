-- Drop existing policies and create better ones for company_settings
DROP POLICY IF EXISTS "Admins can manage company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Tenant admins view settings" ON public.company_settings;

-- Create policy for SELECT (all authenticated users in tenant can view)
CREATE POLICY "Users can view their tenant settings" 
ON public.company_settings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (auth_is_system_manager() OR auth_in_tenant(tenant_id))
);

-- Create policy for UPDATE (admins and company admins can update)
CREATE POLICY "Admins can update company settings" 
ON public.company_settings 
FOR UPDATE 
USING (
  auth_is_system_manager() OR 
  (auth_in_tenant(tenant_id) AND (auth_is_admin() OR auth_has_role('company_admin'::app_role)))
)
WITH CHECK (
  auth_is_system_manager() OR 
  (auth_in_tenant(tenant_id) AND (auth_is_admin() OR auth_has_role('company_admin'::app_role)))
);

-- Create policy for INSERT (system manager only)
CREATE POLICY "System managers can insert company settings" 
ON public.company_settings 
FOR INSERT 
WITH CHECK (auth_is_system_manager());

-- Create policy for DELETE (system manager only)
CREATE POLICY "System managers can delete company settings" 
ON public.company_settings 
FOR DELETE 
USING (auth_is_system_manager());