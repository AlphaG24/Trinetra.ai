-- ==============================================================================
-- Trinetra AI Migration: 20261004210000_create_byon_credential_vault_down.sql (DOWN)
-- Task 13: Revert Bring-Your-Own Numbers (BYON - Twilio & Exotel)
-- ==============================================================================

-- Drop Policies
DROP POLICY IF EXISTS "Admins manage all byon phone numbers" ON public.byon_phone_numbers;
DROP POLICY IF EXISTS "Users manage own byon phone numbers" ON public.byon_phone_numbers;
DROP POLICY IF EXISTS "Admins manage all carrier credentials" ON public.byon_carrier_credentials;
DROP POLICY IF EXISTS "Users manage own carrier credentials" ON public.byon_carrier_credentials;

-- Drop Tables
DROP TABLE IF EXISTS public.byon_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.byon_carrier_credentials CASCADE;
