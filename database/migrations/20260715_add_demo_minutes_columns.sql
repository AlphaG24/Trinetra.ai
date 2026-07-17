-- Add demo tracking columns to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS demo_minutes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS demo_minutes_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS total_minutes_limit INTEGER DEFAULT 100;
