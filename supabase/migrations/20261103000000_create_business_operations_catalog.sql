-- ============================================================================
-- MIGRATION: 20261103000000_create_business_operations_catalog.sql
-- PURPOSE: Dynamic real-time business operations catalog for in-call agent queries
--          (routes, truck loads, container availability, booking slots, price limits)
-- ============================================================================

-- UP MIGRATION
CREATE TABLE IF NOT EXISTS public.business_operations_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'general', -- 'logistics', 'containers', 'appointment_slots', 'inventory', 'pricing'
    title TEXT NOT NULL,
    identifier_code TEXT,
    route_origin TEXT,
    route_destination TEXT,
    available_units NUMERIC DEFAULT 1,
    base_price_inr NUMERIC,
    minimum_price_inr NUMERIC,
    booking_slot_start TIMESTAMPTZ,
    booking_slot_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'available', -- 'available', 'reserved', 'booked', 'in_transit'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for ultra-fast in-call latency lookup (<5ms)
CREATE INDEX IF NOT EXISTS idx_biz_ops_user_id ON public.business_operations_catalog(user_id);
CREATE INDEX IF NOT EXISTS idx_biz_ops_org_id ON public.business_operations_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_biz_ops_category_status ON public.business_operations_catalog(category, status);
CREATE INDEX IF NOT EXISTS idx_biz_ops_routes ON public.business_operations_catalog(route_origin, route_destination);

-- Enable Row Level Security (RLS)
ALTER TABLE public.business_operations_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies (SEC-004 compliant)
DROP POLICY IF EXISTS "Users can view their own business operations catalog" ON public.business_operations_catalog;
CREATE POLICY "Users can view their own business operations catalog"
    ON public.business_operations_catalog
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own business operations catalog items" ON public.business_operations_catalog;
CREATE POLICY "Users can insert their own business operations catalog items"
    ON public.business_operations_catalog
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own business operations catalog items" ON public.business_operations_catalog;
CREATE POLICY "Users can update their own business operations catalog items"
    ON public.business_operations_catalog
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own business operations catalog items" ON public.business_operations_catalog;
CREATE POLICY "Users can delete their own business operations catalog items"
    ON public.business_operations_catalog
    FOR DELETE
    USING (auth.uid() = user_id);

-- DOWN MIGRATION (ROLLBACK):
-- DROP POLICY IF EXISTS "Users can delete their own business operations catalog items" ON public.business_operations_catalog;
-- DROP POLICY IF EXISTS "Users can update their own business operations catalog items" ON public.business_operations_catalog;
-- DROP POLICY IF EXISTS "Users can insert their own business operations catalog items" ON public.business_operations_catalog;
-- DROP POLICY IF EXISTS "Users can view their own business operations catalog" ON public.business_operations_catalog;
-- DROP TABLE IF EXISTS public.business_operations_catalog CASCADE;
