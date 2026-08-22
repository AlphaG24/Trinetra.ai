-- Migration: support ticket lifecycle columns
-- UP
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- DOWN
-- ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS archived;
-- ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS archived_at;
-- ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS resolved_at;
