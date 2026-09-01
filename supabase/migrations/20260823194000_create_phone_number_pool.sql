-- Migration: 20260823194000_create_phone_number_pool.sql
-- Description: Create phone_number_pool table for admin pre-purchased numbers.

CREATE TABLE IF NOT EXISTS public.phone_number_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    country VARCHAR(10) DEFAULT 'IN',
    monthly_cost_paisa INTEGER DEFAULT 10000, -- ₹100 cost price
    retail_price_paisa INTEGER DEFAULT 29900, -- ₹299 markup price
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'assigned')),
    assigned_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phone_number_pool_status ON public.phone_number_pool(status);
CREATE INDEX IF NOT EXISTS idx_phone_number_pool_assigned_org ON public.phone_number_pool(assigned_organization_id);

-- Enable RLS
ALTER TABLE public.phone_number_pool ENABLE ROW LEVEL SECURITY;

-- 1. Anyone authenticated can read available numbers
DROP POLICY IF EXISTS "Users can view available or assigned numbers" ON public.phone_number_pool;
CREATE POLICY "Users can view available or assigned numbers" ON public.phone_number_pool
    FOR SELECT TO authenticated
    USING (status = 'available' OR assigned_organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- 2. Admins/Super Admins have full access
DROP POLICY IF EXISTS "Admins have full access to phone_number_pool" ON public.phone_number_pool;
CREATE POLICY "Admins have full access to phone_number_pool" ON public.phone_number_pool
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));
