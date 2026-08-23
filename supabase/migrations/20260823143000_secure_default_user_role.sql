-- Migration: 20260823143000_secure_default_user_role.sql
-- Description: Enforce secure default role 'client' for all new signups, secure the handle_new_user trigger, and demote testing/nexus accounts back to client.

-- 1. Ensure the default value of the role column in profiles is 'client'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'client';

-- 2. Explicitly update the trigger function handle_new_user to insert 'client' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'client'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Revoke admin/super_admin privileges from any testing nexus email addresses
UPDATE public.profiles 
SET role = 'client' 
WHERE email ILIKE '%nexus%';
