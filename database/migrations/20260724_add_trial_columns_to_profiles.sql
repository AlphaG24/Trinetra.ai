-- UP MIGRATION
-- Add plan_tier and trial timeline columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL;

-- DOWN MIGRATION
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan_tier;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_started_at;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_ends_at;
