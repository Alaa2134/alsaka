-- Update legacy users: set access_code_hash based on their name
-- This migrates old users to the new secure system
UPDATE app_users 
SET access_code_hash = encode(
  extensions.digest(
    convert_to(upper(btrim(name)) || 'secure_salt_v1', 'UTF8'), 
    'sha256'
  ), 
  'hex'
)
WHERE access_code_hash IS NULL;