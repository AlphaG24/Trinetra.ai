-- ==============================================================================
-- Trinetra AI Migration: 20261004200000_create_number_lifecycle_and_missed_calls_down.sql (DOWN)
-- Task 12: Revert Virtual Number Lifecycle
-- ==============================================================================

-- Drop Policies
DROP POLICY IF EXISTS "Admins manage number digests" ON public.number_lifecycle_digests;
DROP POLICY IF EXISTS "Users view own number digests" ON public.number_lifecycle_digests;
DROP POLICY IF EXISTS "Admins manage missed calls" ON public.number_lifecycle_missed_calls;
DROP POLICY IF EXISTS "Users view own missed calls" ON public.number_lifecycle_missed_calls;

-- Drop Tables
DROP TABLE IF EXISTS public.number_lifecycle_digests CASCADE;
DROP TABLE IF EXISTS public.number_lifecycle_missed_calls CASCADE;

-- Revert columns and check constraint on `phone_numbers`
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'phone_numbers') THEN
        ALTER TABLE public.phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_status_check;
        ALTER TABLE public.phone_numbers ADD CONSTRAINT phone_numbers_status_check
            CHECK (status IN ('provisioning', 'active', 'released', 'suspended', 'failed'));

        ALTER TABLE public.phone_numbers DROP COLUMN IF EXISTS last_reminder_sent_at;
        ALTER TABLE public.phone_numbers DROP COLUMN IF EXISTS reactivation_token;
        ALTER TABLE public.phone_numbers DROP COLUMN IF EXISTS reactivated_at;
        ALTER TABLE public.phone_numbers DROP COLUMN IF EXISTS missed_calls_count;
        ALTER TABLE public.phone_numbers DROP COLUMN IF EXISTS hold_period_ends_at;
        ALTER TABLE public.phone_numbers DROP COLUMN IF EXISTS grace_period_ends_at;
        ALTER TABLE public.phone_numbers DROP COLUMN IF EXISTS expired_at;
    END IF;
END $$;
