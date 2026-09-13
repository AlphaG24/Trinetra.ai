-- Migration: 20260908000001_add_exotel_provider_support.sql
-- Description: Allow 'exotel' provider in phone_numbers and phone_number_pool tables

-- 1. Drop existing constraints and re-create with 'exotel' included
ALTER TABLE IF EXISTS public.phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_provider_check;
ALTER TABLE IF EXISTS public.phone_numbers ADD CONSTRAINT phone_numbers_provider_check CHECK (provider IN ('sarvam', 'twilio', 'simulated', 'exotel'));

ALTER TABLE IF EXISTS public.phone_number_pool DROP CONSTRAINT IF EXISTS phone_number_pool_provider_check;
ALTER TABLE IF EXISTS public.phone_number_pool ADD CONSTRAINT phone_number_pool_provider_check CHECK (provider IN ('sarvam', 'twilio', 'simulated', 'exotel'));
