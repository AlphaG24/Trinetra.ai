-- ============================================================
-- Multi-Personality Agent Support
-- Migration: 20260809_multi_personality.sql
-- Run in Supabase SQL Editor (Studio) or via migration tool
-- ============================================================

-- 1. Add personalities JSONB column to agents table (nullable, won't break existing rows)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS personalities JSONB DEFAULT '{"sales": true, "support": false, "appointment": false, "lead_qualifier": false}';

-- 2. Add current_intent column for analytics/tracking (nullable, informational only)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS current_intent VARCHAR(50);

-- 3. Create prompt_templates table for admin-managed prompts
CREATE TABLE IF NOT EXISTS prompt_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personality_type VARCHAR(50) UNIQUE NOT NULL,
  system_prompt  TEXT NOT NULL,
  description    TEXT,
  is_active      BOOLEAN DEFAULT true,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row-Level Security
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- 4a. Authenticated users can read active prompts (needed by backend service role, and for admin UI)
DROP POLICY IF EXISTS "authenticated_read_prompt_templates" ON prompt_templates;
CREATE POLICY "authenticated_read_prompt_templates"
  ON prompt_templates FOR SELECT
  TO authenticated
  USING (true);

-- 4b. Only service_role (admin backend) can write
-- Admins use the service role key for writes — no additional policy needed for anon
-- (service_role bypasses RLS)

-- 5. Seed default prompt templates (short descriptions; full prompts loaded from files by backend)
-- These are placeholder stubs — the admin can overwrite them from the UI,
-- and the backend PromptService falls back to .txt files if DB is empty or a row is missing.
INSERT INTO prompt_templates (personality_type, description, system_prompt, is_active)
VALUES
  (
    'sales',
    'Focused on product introductions, pricing, objection handling, and closing sales.',
    'You are a senior sales professional. Your job is to introduce products or services, understand the prospect''s needs, handle every objection confidently, and close the conversation with a concrete next step. Be warm, confident, and persuasive without being pushy. Use natural Hinglish (Hindi-English mix). Keep responses to 2 sentences maximum.',
    true
  ),
  (
    'support',
    'Focused on resolving customer complaints, troubleshooting issues, and escalation.',
    'You are a senior customer support specialist. Your job is to listen carefully, understand the customer''s problem, troubleshoot step by step, and either resolve the issue or escalate appropriately. Be empathetic, patient, and solution-focused. Speak Hinglish naturally. Keep responses concise.',
    true
  ),
  (
    'appointment',
    'Focused on booking, rescheduling, or cancelling appointments and meetings.',
    'You are an appointment booking specialist. Your job is to help customers schedule, reschedule, or cancel appointments. Confirm all details clearly: date, time, location/mode, and purpose. Always read back the confirmed slot. Speak Hinglish naturally and be efficient. Keep responses to 2 sentences.',
    true
  ),
  (
    'lead_qualifier',
    'Focused on qualifying new inbound leads with BANT-style questions.',
    'You are a lead qualification specialist. Your job is to quickly and naturally qualify inbound inquiries using BANT: Budget, Authority, Need, Timeline. Ask one question at a time. Do not pitch — just listen, qualify, and hand off. Speak Hinglish naturally. Keep responses to 2 sentences.',
    true
  ),
  (
    'general',
    'General conversational fallback for greetings and unclear intent.',
    'You are a helpful AI assistant. For casual greetings or unclear inquiries, respond warmly and ask how you can help. Speak Hinglish naturally. Keep responses brief and conversational.',
    true
  )
ON CONFLICT (personality_type) DO NOTHING;

-- 6. Create index on personality_type for fast lookup
CREATE INDEX IF NOT EXISTS idx_prompt_templates_personality_type ON prompt_templates (personality_type);

-- 7. Update trigger to auto-refresh updated_at on prompt_templates edits
CREATE OR REPLACE FUNCTION update_prompt_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prompt_templates_updated_at ON prompt_templates;
CREATE TRIGGER trg_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_prompt_templates_updated_at();
