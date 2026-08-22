-- Add consented boolean column to profiles with default false
-- Backfill existing users who have a consent_records row to consented = true
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consented BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: mark all users who already have a consent_records row as consented
UPDATE public.profiles p
SET consented = TRUE
WHERE EXISTS (
  SELECT 1 FROM public.consent_records cr
  WHERE cr.user_id = p.id
);
