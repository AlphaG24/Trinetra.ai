-- Enable Row Level Security on the new tables
ALTER TABLE platform_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_service_quotas ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- platform_services RLS Policies
-- =========================================================================

-- 1. Allow authenticated users to read platform services
CREATE POLICY "Allow authenticated users to read platform services"
ON platform_services
FOR SELECT
TO authenticated
USING (true);

-- Note: No INSERT, UPDATE, or DELETE policies are created for standard users.
-- Only Super Admins / Service Roles (bypass RLS) can manage platform services.


-- =========================================================================
-- user_service_quotas RLS Policies
-- =========================================================================

-- 1. Allow authenticated users to select only their own quotas
CREATE POLICY "Allow users to select their own quotas"
ON user_service_quotas
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Allow authenticated users to insert their own quotas (sandbox deployment)
CREATE POLICY "Allow users to insert their own quotas"
ON user_service_quotas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Allow authenticated users to update their own quotas (quota consumption)
CREATE POLICY "Allow users to update their own quotas"
ON user_service_quotas
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
