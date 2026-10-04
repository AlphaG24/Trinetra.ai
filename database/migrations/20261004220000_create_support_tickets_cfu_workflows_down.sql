-- Migration Down: 20261004220000_create_support_tickets_cfu_workflows_down.sql
-- Description: Rollback CFU columns, constraints, and indexes on support_tickets

DROP INDEX IF EXISTS public.idx_support_tickets_cfu_status;
DROP INDEX IF EXISTS public.idx_support_tickets_sla_due;
DROP INDEX IF EXISTS public.idx_support_tickets_triage_queue;

ALTER TABLE public.support_tickets
    DROP CONSTRAINT IF EXISTS support_tickets_cfu_verification_status_check,
    DROP CONSTRAINT IF EXISTS support_tickets_sla_status_check;

ALTER TABLE public.support_tickets
    DROP COLUMN IF EXISTS cfu_source_number,
    DROP COLUMN IF EXISTS cfu_carrier,
    DROP COLUMN IF EXISTS cfu_forward_to_number,
    DROP COLUMN IF EXISTS cfu_dial_code,
    DROP COLUMN IF EXISTS cfu_verification_status,
    DROP COLUMN IF EXISTS sla_due_at,
    DROP COLUMN IF EXISTS sla_status,
    DROP COLUMN IF EXISTS assigned_admin_id;
