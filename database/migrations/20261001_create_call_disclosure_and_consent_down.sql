-- ============================================================================
-- TRINETRA AI: CALL DISCLOSURE AND CONSENT ENGINE ROLLBACK (DOWN MIGRATION)
-- Migration: 20261001_create_call_disclosure_and_consent_down.sql
-- Description: Reversibly rolls back the call disclosure and consent schema
--              introduced in 20261001_create_call_disclosure_and_consent.sql.
-- ============================================================================

-- 1. Drop audit indexes
DROP INDEX IF EXISTS public.idx_disclosure_opt_out_user;
DROP INDEX IF EXISTS public.idx_voice_calls_consent_mode_outcome;
DROP INDEX IF EXISTS public.idx_voice_calls_disclosure_variant;

-- 2. Drop owner exemption table
DROP TABLE IF EXISTS public.call_disclosure_opt_out_acknowledgments CASCADE;

-- 3. Remove disclosure_config from agents table
ALTER TABLE public.agents 
    DROP COLUMN IF EXISTS disclosure_config;

-- 4. Remove tracking columns from voice_calls table
ALTER TABLE public.voice_calls 
    DROP COLUMN IF EXISTS recording_stopped_at,
    DROP COLUMN IF EXISTS consent_outcome,
    DROP COLUMN IF EXISTS consent_mode,
    DROP COLUMN IF EXISTS disclosure_timestamp,
    DROP COLUMN IF EXISTS disclosure_language,
    DROP COLUMN IF EXISTS disclosure_variant,
    DROP COLUMN IF EXISTS disclosure_text,
    DROP COLUMN IF EXISTS disclosure_played;
