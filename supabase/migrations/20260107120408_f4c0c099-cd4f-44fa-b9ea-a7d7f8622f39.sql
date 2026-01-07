-- Allow company_admin users to update their tenant record from Company Settings
-- Update existing policy to include company_admin role

ALTER POLICY "Admins can update tenant"
ON public.tenants
USING (
  auth_is_system_manager()
  OR (
    auth_in_tenant(id)
    AND (auth_is_admin() OR auth_has_role('company_admin'::app_role))
  )
)
WITH CHECK (
  auth_is_system_manager()
  OR (
    auth_in_tenant(id)
    AND (auth_is_admin() OR auth_has_role('company_admin'::app_role))
  )
);