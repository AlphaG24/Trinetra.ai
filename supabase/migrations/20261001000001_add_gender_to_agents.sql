-- ============================================================================
-- TRINETRA AI: ADD GENDER TO AGENTS TABLE
-- Migration: 20261001000001_add_gender_to_agents.sql
-- Description: Adds optional explicit gender field to agents table for grammatical
--              inflection resolution in Indic languages (Hindi, Hinglish, Marathi).
-- ============================================================================

-- UP MIGRATION
ALTER TABLE public.agents 
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN public.agents.gender IS 'Explicit agent gender: male, female, or null (auto/neutral)';
