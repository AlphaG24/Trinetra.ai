-- Migration: 20261004220000_create_support_tickets_cfu_workflows.sql
-- Description: Additive schema enhancements for Support Tickets System & CFU (Call Forwarding Unconditional) Workflows
-- Standard: Master Plan Section 18.15 Item 12

-- 1. Ensure support_tickets table exists with full base structure if fresh
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open',
    messages JSONB DEFAULT '[]'::jsonb,
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Additive columns for Call Forwarding Unconditional (CFU) and SLA Tracking
ALTER TABLE public.support_tickets
    ADD COLUMN IF NOT EXISTS cfu_source_number TEXT,
    ADD COLUMN IF NOT EXISTS cfu_carrier TEXT,
    ADD COLUMN IF NOT EXISTS cfu_forward_to_number TEXT,
    ADD COLUMN IF NOT EXISTS cfu_dial_code TEXT,
    ADD COLUMN IF NOT EXISTS cfu_verification_status TEXT DEFAULT 'pending_setup',
    ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'within_sla',
    ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Constraints for CFU and SLA
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_cfu_verification_status_check'
    ) THEN
        ALTER TABLE public.support_tickets
            ADD CONSTRAINT support_tickets_cfu_verification_status_check
            CHECK (cfu_verification_status IN ('pending_setup', 'dial_code_shared', 'test_call_pending', 'verified', 'failed'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_sla_status_check'
    ) THEN
        ALTER TABLE public.support_tickets
            ADD CONSTRAINT support_tickets_sla_status_check
            CHECK (sla_status IN ('within_sla', 'breached', 'escalated'));
    END IF;
END $$;

-- 4. Fast Query Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_cfu_status 
    ON public.support_tickets(cfu_verification_status) 
    WHERE category = 'cfu_forwarding';

CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_due 
    ON public.support_tickets(sla_due_at) 
    WHERE status NOT IN ('resolved', 'closed');

CREATE INDEX IF NOT EXISTS idx_support_tickets_triage_queue 
    ON public.support_tickets(status, priority, created_at);

-- 5. Row-Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own organization support tickets" ON public.support_tickets;
CREATE POLICY "Users can read own organization support tickets"
    ON public.support_tickets
    FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR submitted_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can insert own organization support tickets" ON public.support_tickets;
CREATE POLICY "Users can insert own organization support tickets"
    ON public.support_tickets
    FOR INSERT
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR submitted_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update own organization support tickets" ON public.support_tickets;
CREATE POLICY "Users can update own organization support tickets"
    ON public.support_tickets
    FOR UPDATE
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR submitted_by = auth.uid()
    );

DROP POLICY IF EXISTS "Admins manage all support tickets" ON public.support_tickets;
CREATE POLICY "Admins manage all support tickets"
    ON public.support_tickets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );
