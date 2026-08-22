-- Migration: 20260814150000_add_missing_profile_columns.sql
-- Description: Add missing profile columns to fix PGRST204 errors in schema cache

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "in_app": true}'::jsonb;
