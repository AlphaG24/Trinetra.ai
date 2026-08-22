-- UP MIGRATION
-- Add theme preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'dark';

-- DOWN MIGRATION
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS theme;
