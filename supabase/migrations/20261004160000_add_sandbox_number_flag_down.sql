-- Migration: 20261004160000_add_sandbox_number_flag_down.sql
-- Description: Reversible rollback script for sandbox number columns

DROP INDEX IF EXISTS public.idx_phone_numbers_is_sandbox;

ALTER TABLE public.phone_numbers 
    DROP COLUMN IF EXISTS sandbox_label,
    DROP COLUMN IF EXISTS is_sandbox;
