-- Parameterized column schema query helper
CREATE OR REPLACE FUNCTION public.get_table_columns(t_name text)
RETURNS TABLE (col_name text, col_type text, is_null text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::text, c.data_type::text, c.is_nullable::text
    FROM information_schema.columns c
    WHERE c.table_name = t_name
    ORDER BY c.ordinal_position;
END;
$$;
