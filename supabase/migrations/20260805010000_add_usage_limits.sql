-- Migration: Add limits config and agent minutes tracking

-- Ensure minutes_limit and minutes_used exist on agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS minutes_limit INTEGER DEFAULT 100;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_status_check;
ALTER TABLE agents ADD CONSTRAINT agents_status_check CHECK (status IN ('online', 'offline', 'error', 'paused', 'deleted', 'active', 'training', 'configuring'));

-- Add config defaults
INSERT INTO system_config (config_key, config_value, description) VALUES
('max_agents_free', '1', 'Max agents allowed on free plan'),
('max_agents_trial', '3', 'Max agents allowed on trial plan'),
('max_agents_starter', '5', 'Max agents allowed on starter plan'),
('max_agents_professional', '20', 'Max agents allowed on professional plan'),
('free_demo_minutes', '10', 'Monthly minutes limit for free demo accounts'),
('trial_minutes', '100', 'Monthly minutes limit for trial accounts'),
('starter_minutes', '500', 'Monthly minutes limit for starter accounts'),
('professional_minutes', '2000', 'Monthly minutes limit for professional accounts')
ON CONFLICT (config_key) DO NOTHING;
