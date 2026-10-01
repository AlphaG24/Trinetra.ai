-- ============================================================================
-- TRINETRA AI: OUTBOUND SAFETY GUARDRAILS ROLLBACK (DOWN MIGRATION)
-- Migration: 20261001_create_outbound_safety_guardrails_down.sql
-- Description: Reversibly rolls back the schema changes introduced in
--              20261001_create_outbound_safety_guardrails.sql.
-- ============================================================================

-- 1. Drop safety indexes
DROP INDEX IF EXISTS public.idx_campaigns_purpose;
DROP INDEX IF EXISTS public.idx_campaign_contacts_dnd;
DROP INDEX IF EXISTS public.idx_campaign_contacts_consent;

-- 2. Drop whatsapp_approved_templates table
DROP TABLE IF EXISTS public.whatsapp_approved_templates CASCADE;

-- 3. Remove columns from campaign_contacts
ALTER TABLE public.campaign_contacts
    DROP COLUMN IF EXISTS dnd_checked_at,
    DROP COLUMN IF EXISTS dnd_status,
    DROP COLUMN IF EXISTS whatsapp_opt_in_source,
    DROP COLUMN IF EXISTS whatsapp_opt_in,
    DROP COLUMN IF EXISTS requested_callback_time,
    DROP COLUMN IF EXISTS is_requested_callback,
    DROP COLUMN IF EXISTS consent_timestamp,
    DROP COLUMN IF EXISTS consent_source,
    DROP COLUMN IF EXISTS consent_flag;

-- 4. Remove purpose column from campaigns
ALTER TABLE public.campaigns
    DROP COLUMN IF EXISTS purpose;
