-- Migration: 001_consolidate_agents.sql
-- Description: Consolidate user_agents into single agents table

-- STEP 0: Create agent_status ENUM safely if it does not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
        CREATE TYPE agent_status AS ENUM ('draft', 'in_development', 'beta', 'live', 'paused');
    END IF;
END $$;

-- STEP 1: Drop old check constraint on agents.status if it exists to allow new status values
DO $$
BEGIN
    ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_status_check;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- STEP 2: Add missing columns to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS vapi_agent_id TEXT,
ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'voice',
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'elevenlabs',
ADD COLUMN IF NOT EXISTS voice_id TEXT,
ADD COLUMN IF NOT EXISTS cloned_voice_id TEXT,
ADD COLUMN IF NOT EXISTS voice_speed FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS voice_pitch FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'hinglish',
ADD COLUMN IF NOT EXISTS supported_languages TEXT[] DEFAULT ARRAY['hinglish', 'english'],
ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'gemini-2.0-flash',
ADD COLUMN IF NOT EXISTS temperature FLOAT DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 1024,
ADD COLUMN IF NOT EXISTS greeting_message TEXT,
ADD COLUMN IF NOT EXISTS fallback_message TEXT DEFAULT 'Mujhe yeh samajh nahi aaya, kripya dubara bataiye.',
ADD COLUMN IF NOT EXISTS max_call_duration_seconds INTEGER DEFAULT 600,
ADD COLUMN IF NOT EXISTS interruption_sensitivity FLOAT DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS telephony_provider TEXT DEFAULT 'vapi',
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS enable_lead_extraction BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_telegram_alerts BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_call_recording BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_transcription BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS post_call_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS crm_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS crm_provider TEXT,
ADD COLUMN IF NOT EXISTS escalation_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS embed_code TEXT,
ADD COLUMN IF NOT EXISTS deployed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- STEP 3: Migrate data from user_agents to agents if user_agents table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_agents') THEN

        -- First, fix existing agents with NULL organization_id
        -- Assign them to a default org or the user's org
        UPDATE agents
        SET organization_id = (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = agents.user_id 
            LIMIT 1
        )
        WHERE organization_id IS NULL;

        -- If still NULL, assign to the first available organization or skip
        -- For any remaining NULL, we'll use a fallback
        INSERT INTO agents (
            user_id, name, agent_type, status, vapi_agent_id,
            organization_id, created_at, updated_at
        )
        SELECT 
            ua.user_id,
            ua.agent_name,
            ua.agent_type,
            CASE 
                WHEN ua.status = 'live' THEN 'live'::agent_status
                WHEN ua.status = 'beta' THEN 'beta'::agent_status
                WHEN ua.status = 'in_development' THEN 'in_development'::agent_status
                ELSE 'draft'::agent_status
            END,
            ua.vapi_agent_id,
            COALESCE(p.organization_id, (SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1)),
            ua.created_at,
            ua.created_at
        FROM user_agents ua
        LEFT JOIN profiles p ON ua.user_id = p.id
        WHERE NOT EXISTS (
            SELECT 1 FROM agents a
            WHERE a.vapi_agent_id = ua.vapi_agent_id
        );

    END IF;
END $$;