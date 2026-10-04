-- ==============================================================================
-- Trinetra AI Migration: 20261004200000_create_number_lifecycle_and_missed_calls.sql (UP)
-- Task 12: Virtual Number Lifecycle (Grace, Hold & Missed Digests)
-- Authoritative Source: docs/MASTER_PLAN.md (v1.2, Section 18.7 Overrides)
--
-- Rules:
-- 1. No 90-day cooling: Callers hear neutral 'currently unavailable' message immediately.
-- 2. 15-day Grace Period: Customer retains ownership; alternate-day reminders sent.
-- 3. Configurable Hold Period: 14 days default administrative hold before permanent pool release.
-- 4. Missed Call Tracking: Inbound calls logged and summarized with reactivation link.
-- 5. Third-party carrier quarantine rules: UNVERIFIED, check provider terms.
-- ==============================================================================

-- 1. Update status constraint and add lifecycle tracking columns on `phone_numbers`
DO $$
BEGIN
    -- Update status check constraint if table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'phone_numbers') THEN
        ALTER TABLE public.phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_status_check;
        ALTER TABLE public.phone_numbers ADD CONSTRAINT phone_numbers_status_check
            CHECK (status IN ('provisioning', 'active', 'grace_period', 'hold_period', 'released', 'suspended', 'quarantined', 'failed'));

        -- Add lifecycle columns
        ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ;
        ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;
        ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS hold_period_ends_at TIMESTAMPTZ;
        ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS missed_calls_count INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ;
        ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS reactivation_token VARCHAR(64);
        ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Create `number_lifecycle_missed_calls` table
CREATE TABLE IF NOT EXISTS public.number_lifecycle_missed_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id UUID NOT NULL REFERENCES public.phone_numbers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    caller_number VARCHAR(50) NOT NULL,
    caller_number_masked VARCHAR(50) NOT NULL,
    called_number VARCHAR(50) NOT NULL,
    lifecycle_stage VARCHAR(30) NOT NULL CHECK (lifecycle_stage IN ('grace_period', 'hold_period')),
    neutral_message_played TEXT NOT NULL DEFAULT 'The number you have dialed is currently unavailable. Please try again later.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nl_missed_phone_id ON public.number_lifecycle_missed_calls(phone_number_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nl_missed_org_id ON public.number_lifecycle_missed_calls(organization_id, created_at DESC);

-- 3. Create `number_lifecycle_digests` table
CREATE TABLE IF NOT EXISTS public.number_lifecycle_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id UUID NOT NULL REFERENCES public.phone_numbers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    digest_date DATE NOT NULL,
    missed_calls_count INTEGER NOT NULL DEFAULT 0,
    unique_callers_count INTEGER NOT NULL DEFAULT 0,
    reactivation_url TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'opened')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nl_digests_phone_id ON public.number_lifecycle_digests(phone_number_id, digest_date DESC);
CREATE INDEX IF NOT EXISTS idx_nl_digests_org_id ON public.number_lifecycle_digests(organization_id, digest_date DESC);

-- ==============================================================================
-- 4. Enable Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE public.number_lifecycle_missed_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.number_lifecycle_digests ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members view their missed calls
DROP POLICY IF EXISTS "Users view own missed calls" ON public.number_lifecycle_missed_calls;
CREATE POLICY "Users view own missed calls" ON public.number_lifecycle_missed_calls
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policy: Admins manage all missed calls
DROP POLICY IF EXISTS "Admins manage missed calls" ON public.number_lifecycle_missed_calls;
CREATE POLICY "Admins manage missed calls" ON public.number_lifecycle_missed_calls
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Policy: Organization members view their digests
DROP POLICY IF EXISTS "Users view own number digests" ON public.number_lifecycle_digests;
CREATE POLICY "Users view own number digests" ON public.number_lifecycle_digests
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policy: Admins manage all digests
DROP POLICY IF EXISTS "Admins manage number digests" ON public.number_lifecycle_digests;
CREATE POLICY "Admins manage number digests" ON public.number_lifecycle_digests
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
