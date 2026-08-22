-- Add paid minutes tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS paid_minutes_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_minutes_used INTEGER DEFAULT 0;
