-- UP MIGRATION
CREATE OR REPLACE FUNCTION public.get_constraint_def()
RETURNS TABLE (conname name, consrc text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class r ON c.conrelid = r.oid
    WHERE r.relname = 'support_tickets';
END;
$$;

-- DOWN MIGRATION
-- DROP FUNCTION IF EXISTS public.get_constraint_def();
