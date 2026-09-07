-- ============================================================================
-- TRINETRA AI: DATABASE CLEANUP & LIFECYCLE VALIDITY SYSTEM
-- Migration: 20260908000000_db_cleanup_and_validity_lifecycle.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: DROP DEAD / UNRELATED LEGACY SCHEME TABLES
-- (Legacy remnants from old MSME/scheme matching template, not part of Trinetra AI)
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS msme_app_config CASCADE;
DROP TABLE IF EXISTS scheme_change_log CASCADE;
DROP TABLE IF EXISTS scheme_eligibility_rules CASCADE;
DROP TABLE IF EXISTS scheme_form_mappings CASCADE;
DROP TABLE IF EXISTS scheme_monitors CASCADE;
DROP TABLE IF EXISTS schemes CASCADE;
DROP TABLE IF EXISTS user_matches CASCADE;
DROP TABLE IF EXISTS user_extended_profiles CASCADE;
DROP TABLE IF EXISTS user_saved_profiles CASCADE;
DROP TABLE IF EXISTS processing_activities CASCADE;
DROP TABLE IF EXISTS community_messages CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS deletion_requests CASCADE;

-- ----------------------------------------------------------------------------
-- PART 2: TIMELINE / VALIDITY COLUMNS FOR PHONE NUMBERS & AGENTS
-- ----------------------------------------------------------------------------

-- Phone numbers: configurable validity duration and alert tracking
ALTER TABLE phone_numbers 
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS expiry_alerts_sent JSONB DEFAULT '[]'::jsonb;

-- Product bundles / packs: configurable validity duration
ALTER TABLE product_bundles 
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 30;

-- Agents: subscription expiration timestamp and alert tracking
ALTER TABLE agents 
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS expiry_alerts_sent JSONB DEFAULT '[]'::jsonb;

-- Profiles: overall account subscription expiration
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- PART 3: INDEXES FOR FAST LIFECYCLE QUERIES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_phone_numbers_renewal_date ON phone_numbers(renewal_date) WHERE is_assigned = true;
CREATE INDEX IF NOT EXISTS idx_agents_subscription_expires ON agents(subscription_expires_at) WHERE status = 'active';
