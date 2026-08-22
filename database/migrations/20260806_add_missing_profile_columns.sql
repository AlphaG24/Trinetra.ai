-- Migration: Add missing columns to profiles table
-- Add columns: business_description (text) and two_factor_enabled (boolean)
-- which are queried by the /api/profiles route but were not present in the database.

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
