-- Add plan_tier, trial timeline, and paid minutes columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paid_minutes_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_minutes_used INTEGER DEFAULT 0;
