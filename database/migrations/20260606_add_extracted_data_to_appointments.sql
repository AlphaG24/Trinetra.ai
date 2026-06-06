-- Migration to add extracted_data JSONB column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}'::jsonb;
