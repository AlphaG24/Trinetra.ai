-- Migration: 20260901000000_number_pool.sql
-- Description: Update phone_number_pool and phone_numbers tables for shared number pool management, purchases, agent assignment, and renewals.

-- 1. Enhance phone_number_pool table
ALTER TABLE IF EXISTS public.phone_number_pool
ADD COLUMN IF NOT EXISTS city VARCHAR(50) DEFAULT 'India',
ADD COLUMN IF NOT EXISTS did_type VARCHAR(20) DEFAULT 'mobile',
ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'voicelink',
ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS renewal_date TIMESTAMPTZ;

-- 2. Modify phone_numbers table to allow unassigned pool numbers & store pool assignment fields
ALTER TABLE IF EXISTS public.phone_numbers ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.phone_numbers
ADD COLUMN IF NOT EXISTS is_assigned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS retail_price_paisa INTEGER DEFAULT 29900,
ADD COLUMN IF NOT EXISTS renewal_date TIMESTAMPTZ;

-- 3. Indexes for phone_number_pool and phone_numbers
CREATE INDEX IF NOT EXISTS idx_phone_number_pool_city ON public.phone_number_pool(city);
CREATE INDEX IF NOT EXISTS idx_phone_number_pool_did_type ON public.phone_number_pool(did_type);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_is_assigned ON public.phone_numbers(is_assigned);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_org_id ON public.phone_numbers(assigned_org_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_agent_id ON public.phone_numbers(assigned_agent_id);

-- 4. Enable RLS and establish policies
ALTER TABLE public.phone_number_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view available pool numbers or numbers assigned to their organization
DROP POLICY IF EXISTS "Users can view available or assigned pool numbers" ON public.phone_number_pool;
CREATE POLICY "Users can view available or assigned pool numbers" ON public.phone_number_pool
    FOR SELECT TO authenticated
    USING (
        status = 'available' 
        OR assigned_organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins have full access to phone_number_pool" ON public.phone_number_pool;
CREATE POLICY "Admins have full access to phone_number_pool" ON public.phone_number_pool
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Allow authenticated users to view phone_numbers assigned to their organization or available
DROP POLICY IF EXISTS "Users can view organization or pool phone numbers" ON public.phone_numbers;
CREATE POLICY "Users can view organization or pool phone numbers" ON public.phone_numbers
    FOR SELECT TO authenticated
    USING (
        is_assigned = false 
        OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR assigned_org_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
