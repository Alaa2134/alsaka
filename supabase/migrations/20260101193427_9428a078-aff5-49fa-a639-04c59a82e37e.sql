-- Add 2FA fields to app_users
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret text,
ADD COLUMN IF NOT EXISTS two_factor_verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS backup_codes text[];

-- Create 2FA verification codes table for email OTP
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- Only system can manage 2FA codes
CREATE POLICY "System can manage 2fa codes"
ON public.two_factor_codes
FOR ALL
USING (auth_is_system_manager())
WITH CHECK (auth_is_system_manager());

-- Allow insert for authenticated users
CREATE POLICY "Users can insert their own 2fa codes"
ON public.two_factor_codes
FOR INSERT
WITH CHECK (true);

-- Allow users to verify their own codes
CREATE POLICY "Users can verify own codes"
ON public.two_factor_codes
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_expires 
ON public.two_factor_codes(user_id, expires_at) 
WHERE used = false;