-- Migration to add extracted_data JSONB column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}'::jsonb;
