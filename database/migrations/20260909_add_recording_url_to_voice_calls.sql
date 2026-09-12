-- ============================================================================
-- TRINETRA AI: ADD RECORDING_URL TO VOICE_CALLS
-- Migration: 20260909_add_recording_url_to_voice_calls.sql
-- Description: Ensures recording_url column and performance index exist
--              on voice_calls for call recording compliance & quality monitoring.
-- ============================================================================

-- UP MIGRATION
ALTER TABLE public.voice_calls 
    ADD COLUMN IF NOT EXISTS recording_url TEXT;

CREATE INDEX IF NOT EXISTS idx_voice_calls_recording_url 
    ON public.voice_calls(recording_url) 
    WHERE recording_url IS NOT NULL;

-- DOWN MIGRATION (for rollback)
-- DROP INDEX IF EXISTS idx_voice_calls_recording_url;
-- ALTER TABLE public.voice_calls DROP COLUMN IF EXISTS recording_url;
