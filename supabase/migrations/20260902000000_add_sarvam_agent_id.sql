-- Migration: Add sarvam_agent_id to agents table for Sarvam Voice Agents mapping
ALTER TABLE agents ADD COLUMN IF NOT EXISTS sarvam_agent_id VARCHAR(100);

-- Index foreign mapping for fast lookup
CREATE INDEX IF NOT EXISTS idx_agents_sarvam_agent_id ON agents(sarvam_agent_id);
