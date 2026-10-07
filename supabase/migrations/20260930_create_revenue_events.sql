-- ============================================================================
-- Migration: 20260930_create_revenue_events.sql
-- Description: Revenue from Trinetra tracking model, revenue audit logs,
--              attribution windows, RLS security policies, and retention compliance.
-- ============================================================================

-- 1. REVENUE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.revenue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID,
    call_id UUID,
    business_id UUID NOT NULL,
    quoted_amount NUMERIC(12, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    deal_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (deal_status IN ('open', 'won', 'lost')),
    won_amount NUMERIC(12, 2),
    price_type VARCHAR(20) CHECK (price_type IN ('one_time', 'monthly', 'range')),
    amount_min NUMERIC(12, 2),
    amount_max NUMERIC(12, 2),
    service TEXT,
    confidence NUMERIC(3, 2),
    confirmed_by VARCHAR(20) CHECK (confirmed_by IN ('owner', 'payment', 'system')),
    confirmed_at TIMESTAMPTZ,
    source VARCHAR(30) NOT NULL DEFAULT 'inbound' CHECK (source IN ('inbound', 'campaign', 'callback', 'reactivation', 'referral')),
    attribution_window_end TIMESTAMPTZ,
    extracted_quote_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. REVENUE AUDIT LOGS (APPEND-ONLY FOR COMPLIANCE & SECURITY)
CREATE TABLE IF NOT EXISTS public.revenue_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revenue_event_id UUID REFERENCES public.revenue_events(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    previous_won_amount NUMERIC(12, 2),
    new_won_amount NUMERIC(12, 2),
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. INDEXES FOR HIGH-PERFORMANCE TENANT QUERIES
CREATE INDEX IF NOT EXISTS idx_revenue_events_business_deal_status 
    ON public.revenue_events(business_id, deal_status);

CREATE INDEX IF NOT EXISTS idx_revenue_events_business_created_at 
    ON public.revenue_events(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_events_lead_id 
    ON public.revenue_events(lead_id) 
    WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_events_call_id 
    ON public.revenue_events(call_id) 
    WHERE call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_events_attribution 
    ON public.revenue_events(business_id, attribution_window_end);

CREATE INDEX IF NOT EXISTS idx_revenue_audit_business 
    ON public.revenue_audit_logs(business_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_audit_event_id 
    ON public.revenue_audit_logs(revenue_event_id);

-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for revenue_events (Scoped to business_id matching auth.uid() or organization)
DROP POLICY IF EXISTS "Business owners can view their own revenue events" ON public.revenue_events;
CREATE POLICY "Business owners can view their own revenue events"
    ON public.revenue_events
    FOR SELECT
    TO authenticated
    USING (
        business_id = auth.uid()
        OR business_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Business owners can insert their own revenue events" ON public.revenue_events;
CREATE POLICY "Business owners can insert their own revenue events"
    ON public.revenue_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        business_id = auth.uid()
        OR business_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Business owners can update their own revenue events" ON public.revenue_events;
CREATE POLICY "Business owners can update their own revenue events"
    ON public.revenue_events
    FOR UPDATE
    TO authenticated
    USING (
        business_id = auth.uid()
        OR business_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
        )
    )
    WITH CHECK (
        business_id = auth.uid()
        OR business_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
        )
    );

-- Audit log policies (Append-only: SELECT and INSERT only)
DROP POLICY IF EXISTS "Business owners can view their own audit logs" ON public.revenue_audit_logs;
CREATE POLICY "Business owners can view their own audit logs"
    ON public.revenue_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        business_id = auth.uid()
        OR business_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.revenue_audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.revenue_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        business_id = auth.uid()
        OR business_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
        )
    );

-- 5. SYSTEM CONFIG FEATURE FLAG
CREATE TABLE IF NOT EXISTS public.system_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key text NOT NULL UNIQUE,
    config_value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.system_config (config_key, config_value, description)
VALUES ('revenue_model_enabled', 'true', 'When true, enables the Revenue from Trinetra extraction, tracking, and dashboard model')
ON CONFLICT (config_key) DO NOTHING;

-- 6. DATA RETENTION UPDATE (PRIVACY COMPLIANCE)
-- Update cleanup_retention_data to strip personal identifiers from revenue records when raw call data expires
CREATE OR REPLACE FUNCTION public.cleanup_retention_data()
RETURNS void AS $$
BEGIN
    -- 1. Anonymize metadata in revenue_events for calls older than 180 days
    -- Preserves quoted_amount, won_amount, deal_status, service, source, and timestamps
    UPDATE public.revenue_events
    SET metadata = jsonb_build_object('anonymized', true, 'retained_at', NOW()),
        extracted_quote_text = '[Redacted under data retention policy]'
    WHERE created_at < NOW() - INTERVAL '180 days'
      AND (metadata->>'anonymized') IS NULL;

    -- 2. Deletion of old voice call logs after 180 days (or 30 days based on plan)
    DELETE FROM public.agent_call_logs
    WHERE created_at < NOW() - INTERVAL '180 days';

    -- 3. Deletion of inactive accounts > 12 months with warning
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'inactivity_warning_sent_at'
    ) THEN
        DELETE FROM auth.users
        WHERE last_sign_in_at < NOW() - INTERVAL '12 months'
          AND id IN (
              SELECT id FROM public.profiles 
              WHERE inactivity_warning_sent_at IS NOT NULL 
                AND inactivity_warning_sent_at < NOW() - INTERVAL '30 days'
          );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
