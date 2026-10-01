-- ============================================================================
-- TRINETRA AI: ROLLBACK GENDER FROM AGENTS TABLE
-- Migration: 20261001_add_gender_to_agents_down.sql
-- Description: Rollback of 20261001_add_gender_to_agents.sql
-- ============================================================================

-- DOWN MIGRATION
ALTER TABLE public.agents 
    DROP COLUMN IF EXISTS gender;
