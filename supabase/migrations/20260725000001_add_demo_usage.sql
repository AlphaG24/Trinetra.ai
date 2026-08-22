-- Add demo_usage column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS demo_usage JSONB DEFAULT '{}'::jsonb;
