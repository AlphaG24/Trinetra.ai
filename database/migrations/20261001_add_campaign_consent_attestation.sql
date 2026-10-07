-- ============================================================================
-- TRINETRA AI: CAMPAIGN CONSENT ATTESTATION SCHEMA (PHASE 3 / ITEM 3)
-- Migration: 20261001_add_campaign_consent_attestation.sql
-- Description: Adds consent_attestation column to public.campaigns table to store
--              cryptographic SHA-256 hash of contact list, affirmative attestation
--              statement, user details, and timestamp.
--
-- LEGAL NOTICE:
-- [CONFIRM WITH A LAWYER] Prior express written / affirmative consent attestation
-- and audit trail per TRAI TCCCPR 2018 Regulation 12 and FCC TCPA (47 U.S.C. § 227).
-- ============================================================================

ALTER TABLE public.campaigns
    ADD COLUMN IF NOT EXISTS consent_attestation JSONB DEFAULT NULL;

COMMENT ON COLUMN public.campaigns.consent_attestation IS 
    'Stores affirmative consent attestation audit metadata: file SHA-256 hash, attestation statement, user ID/email, and UTC timestamp. [CONFIRM WITH A LAWYER]';
