-- UP MIGRATION
-- Add country column to profiles table for regional localization
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'IN';

-- DOWN MIGRATION
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS country;
