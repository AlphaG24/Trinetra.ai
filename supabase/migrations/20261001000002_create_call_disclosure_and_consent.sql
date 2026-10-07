-- ============================================================================
-- TRINETRA AI: CALL DISCLOSURE AND CONSENT ENGINE SCHEMA
-- Migration: 20261001000002_create_call_disclosure_and_consent.sql
-- Description: Adds call disclosure logging, consent mode tracking, A/B variant
--              attribution, and logged owner exemption records.
--
-- LEGAL COMPLIANCE NOTE:
-- [CONFIRM WITH A LAWYER] Passive notice vs. affirmative consent requirements
-- vary by jurisdiction (e.g. India DPDP Act 2023 Sec 6, California Penal Code § 632,
-- GDPR Art. 6/7). Primary sources:
-- - India DPDP Act 2023: https://www.meity.gov.in/content/digital-personal-data-protection-act-2023
-- - California Penal Code § 632: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=632.&lawCode=PEN
-- - EU GDPR Article 7: https://eur-lex.europa.eu/eli/reg/2016/679/oj
-- ============================================================================

-- 1. Extend voice_calls with disclosure and consent tracking columns
ALTER TABLE public.voice_calls 
    ADD COLUMN IF NOT EXISTS disclosure_played BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS disclosure_text TEXT,
    ADD COLUMN IF NOT EXISTS disclosure_variant VARCHAR(50) DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS disclosure_language VARCHAR(20) DEFAULT 'hinglish',
    ADD COLUMN IF NOT EXISTS disclosure_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consent_mode VARCHAR(50) DEFAULT 'notice_only',
    ADD COLUMN IF NOT EXISTS consent_outcome VARCHAR(50) DEFAULT 'consented',
    ADD COLUMN IF NOT EXISTS recording_stopped_at TIMESTAMPTZ;

-- 2. Extend agents table with disclosure_config JSONB
ALTER TABLE public.agents 
    ADD COLUMN IF NOT EXISTS disclosure_config JSONB DEFAULT '{
        "enabled": true,
        "consent_mode": "notice_only",
        "ab_testing_enabled": true,
        "preferred_variant": "standard",
        "custom_wording": null,
        "recording_notice_exempt": false
    }'::jsonb;

-- 3. Create table for logged owner exemptions (e.g. 1-party consent jurisdictions)
CREATE TABLE IF NOT EXISTS public.call_disclosure_opt_out_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    jurisdiction VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    legal_confirmation_checked BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS on call_disclosure_opt_out_acknowledgments (SEC-004)
ALTER TABLE public.call_disclosure_opt_out_acknowledgments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can insert their own disclosure opt-out acknowledgments" ON public.call_disclosure_opt_out_acknowledgments;
CREATE POLICY "Users can insert their own disclosure opt-out acknowledgments" 
ON public.call_disclosure_opt_out_acknowledgments
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own disclosure opt-out acknowledgments" ON public.call_disclosure_opt_out_acknowledgments;
CREATE POLICY "Users can view their own disclosure opt-out acknowledgments" 
ON public.call_disclosure_opt_out_acknowledgments
FOR SELECT 
USING (auth.uid() = user_id);

-- 6. Performance indexes for A/B testing analytics and compliance audits
CREATE INDEX IF NOT EXISTS idx_voice_calls_disclosure_variant 
    ON public.voice_calls(disclosure_variant) 
    WHERE disclosure_variant IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_calls_consent_mode_outcome 
    ON public.voice_calls(consent_mode, consent_outcome);

CREATE INDEX IF NOT EXISTS idx_disclosure_opt_out_user 
    ON public.call_disclosure_opt_out_acknowledgments(user_id, agent_id);
