-- Helper to query table columns and types
CREATE OR REPLACE FUNCTION public.get_table_columns()
RETURNS TABLE (col_name text, col_type text, is_null text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::text, c.data_type::text, c.is_nullable::text
    FROM information_schema.columns c
    WHERE c.table_name = 'support_tickets'
    ORDER BY c.ordinal_position;
END;
$$;
