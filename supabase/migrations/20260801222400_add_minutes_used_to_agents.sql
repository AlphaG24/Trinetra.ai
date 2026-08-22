-- Up migration: Add minutes_used column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;

-- Down migration: Remove minutes_used column from agents table
-- ALTER TABLE agents DROP COLUMN IF EXISTS minutes_used;
