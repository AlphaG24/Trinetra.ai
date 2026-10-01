-- ============================================================================
-- TRINETRA AI: ROLLBACK CAMPAIGN CONSENT ATTESTATION SCHEMA (PHASE 3 / ITEM 3)
-- Migration: 20261001_add_campaign_consent_attestation_down.sql
-- Description: Drops consent_attestation column from public.campaigns table.
-- ============================================================================

ALTER TABLE public.campaigns
    DROP COLUMN IF EXISTS consent_attestation;
