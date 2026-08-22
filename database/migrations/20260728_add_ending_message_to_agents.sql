-- Add ending_message column if it doesn't exist
ALTER TABLE agents ADD COLUMN IF NOT EXISTS ending_message TEXT;
