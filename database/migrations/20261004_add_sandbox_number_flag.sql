-- Migration: 20261004_add_sandbox_number_flag.sql
-- Description: Additive migration adding is_sandbox and sandbox_label to phone_numbers
-- Compliance: Master Plan Section 18.3 (Authoritative Overrides)

ALTER TABLE public.phone_numbers 
    ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS sandbox_label VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN public.phone_numbers.is_sandbox IS 'When true, indicates an admin test number labeled TEST, unusable in customer flows';
COMMENT ON COLUMN public.phone_numbers.sandbox_label IS 'Label for sandbox numbers, e.g. TEST';

CREATE INDEX IF NOT EXISTS idx_phone_numbers_is_sandbox ON public.phone_numbers(is_sandbox);
