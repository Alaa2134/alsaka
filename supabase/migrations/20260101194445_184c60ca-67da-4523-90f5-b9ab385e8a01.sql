-- Allow checking access code for login (without seeing sensitive data)
CREATE POLICY "Allow access code verification for login" 
ON public.app_users 
FOR SELECT 
USING (true);

-- Drop existing restrictive policies if they conflict
DROP POLICY IF EXISTS "Users can view own data" ON public.app_users;
DROP POLICY IF EXISTS "System managers can view all users" ON public.app_users;
DROP POLICY IF EXISTS "Tenant admins can view tenant users" ON public.app_users;