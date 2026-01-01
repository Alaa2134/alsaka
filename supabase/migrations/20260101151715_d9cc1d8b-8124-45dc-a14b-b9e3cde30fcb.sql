-- First migration: Add new enum values (must be committed separately)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'system_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_admin';