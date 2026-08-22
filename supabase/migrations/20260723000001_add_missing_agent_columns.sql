-- Migration: 20260723000001_add_missing_agent_columns.sql
-- Description: Add missing voice configuration, language, and behavior columns to agents table

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS vapi_agent_id TEXT,
ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'elevenlabs',
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
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS enable_lead_extraction BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_telegram_alerts BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_call_recording BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_transcription BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS post_call_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS crm_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS crm_provider TEXT;
