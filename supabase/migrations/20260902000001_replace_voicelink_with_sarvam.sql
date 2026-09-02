-- Migration: 20260902000001_replace_voicelink_with_sarvam.sql
-- Description: Update check constraints and default values on phone_numbers and phone_number_pool tables to replace 'voicelink' with 'sarvam'.

-- 1. Update phone_numbers table
ALTER TABLE IF EXISTS public.phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_provider_check;
ALTER TABLE IF EXISTS public.phone_numbers ADD CONSTRAINT phone_numbers_provider_check CHECK (provider IN ('sarvam', 'twilio', 'simulated'));

ALTER TABLE IF EXISTS public.phone_numbers ALTER COLUMN provider SET DEFAULT 'sarvam';

UPDATE public.phone_numbers SET provider = 'sarvam' WHERE provider = 'voicelink';

-- 2. Update phone_number_pool table
ALTER TABLE IF EXISTS public.phone_number_pool DROP CONSTRAINT IF EXISTS phone_number_pool_provider_check;
ALTER TABLE IF EXISTS public.phone_number_pool ADD CONSTRAINT phone_number_pool_provider_check CHECK (provider IN ('sarvam', 'twilio', 'simulated'));

ALTER TABLE IF EXISTS public.phone_number_pool ALTER COLUMN provider SET DEFAULT 'sarvam';

UPDATE public.phone_number_pool SET provider = 'sarvam' WHERE provider = 'voicelink';
