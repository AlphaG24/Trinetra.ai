-- Migration: 20260823184000_add_developer_tester_role.sql
-- Description: Drop the old profiles_role_check and recreate it including 'developer_tester'.

-- 1. Drop existing constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add updated constraint allowing super_admin, admin, client, and developer_tester roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'client', 'developer_tester'));

-- 3. Document the change via comment
COMMENT ON COLUMN public.profiles.role IS 'The access control role: super_admin, admin, client, developer_tester';
