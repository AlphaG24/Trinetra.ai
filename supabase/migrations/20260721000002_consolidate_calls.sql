-- Migration: 002_consolidate_calls.sql
-- Description: Consolidate calls, demo_calls, and agent_call_logs into voice_calls table

-- STEP 0: Create call_status ENUM safely if it does not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
        CREATE TYPE call_status AS ENUM ('initiated', 'ringing', 'in_progress', 'completed', 'failed', 'voicemail', 'no_answer');
    END IF;
END $$;

-- STEP 1: Add missing columns to voice_calls
ALTER TABLE voice_calls
ADD COLUMN IF NOT EXISTS provider_call_id TEXT,
ADD COLUMN IF NOT EXISTS vapi_agent_id TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS share_token TEXT,
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stereo_recording_url TEXT,
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT,
ADD COLUMN IF NOT EXISTS outcome TEXT,
ADD COLUMN IF NOT EXISTS call_summary TEXT,
ADD COLUMN IF NOT EXISTS language_detected TEXT DEFAULT 'english',
ADD COLUMN IF NOT EXISTS is_lead BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lead_id UUID,
ADD COLUMN IF NOT EXISTS appointment_id UUID,
ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_cost_paise INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_test_call BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- STEP 2: Migrate from calls table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calls') THEN
        INSERT INTO voice_calls (
            user_id, organization_id, agent_id, provider_call_id,
            duration_seconds, transcript_text, sentiment, status,
            caller_phone, created_at
        )
        SELECT 
            c.user_id, p.organization_id, 
            (SELECT id FROM agents WHERE vapi_agent_id = c.agent_id LIMIT 1),
            c.session_id, c.duration_seconds, c.transcript::text, c.sentiment,
            CASE
                WHEN c.status = 'completed' THEN 'completed'
                WHEN c.status = 'failed' THEN 'failed'
                ELSE 'initiated'
            END,
            c.caller_phone, c.created_at
        FROM calls c
        LEFT JOIN profiles p ON c.user_id = p.id
        WHERE NOT EXISTS (
            SELECT 1 FROM voice_calls vc WHERE vc.session_id = c.session_id
        );
    END IF;
END $$;

-- STEP 3: Migrate from demo_calls table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'demo_calls') THEN
        INSERT INTO voice_calls (
            user_id, organization_id, agent_id, duration_seconds,
            transcript_text, status, call_type, share_token, share_expires_at,
            is_test_call, created_at
        )
        SELECT 
            dc.user_id, p.organization_id, dc.agent_id,
            dc.duration_seconds, dc.transcript, 
            CASE 
                WHEN dc.status = 'completed' THEN 'completed'
                ELSE 'initiated'
            END,
            'web_demo', dc.share_token, dc.share_expires_at,
            true, dc.created_at
        FROM demo_calls dc
        LEFT JOIN profiles p ON dc.user_id = p.id
        WHERE NOT EXISTS (
            SELECT 1 FROM voice_calls vc 
            WHERE vc.user_id = dc.user_id AND vc.created_at = dc.created_at
        );
    END IF;
END $$;

-- STEP 4: Migrate from agent_call_logs table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_call_logs') THEN
        INSERT INTO voice_calls (
            user_id, organization_id, agent_id, provider_call_id,
            duration_seconds, transcript_text, sentiment, status,
            created_at
        )
        SELECT 
            acl.user_id, p.organization_id,
            (SELECT id FROM agents WHERE vapi_agent_id = acl.vapi_agent_id LIMIT 1),
            acl.provider_call_id, acl.duration_seconds, acl.transcript,
            acl.sentiment, 'completed', acl.created_at
        FROM agent_call_logs acl
        LEFT JOIN profiles p ON acl.user_id = p.id
        WHERE NOT EXISTS (
            SELECT 1 FROM voice_calls vc WHERE vc.provider_call_id = acl.provider_call_id
        );
    END IF;
END $$;
