-- Enforce RLS on all tables in public schema

DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND rowsecurity = false
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        RAISE NOTICE 'Enabled RLS on: %', tbl.tablename;
    END LOOP;
END $$;

-- Verify policy status: This should return 0 rows for tables requiring policies
SELECT tablename, rowsecurity, 
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (rowsecurity = false OR 
       (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) = 0)
ORDER BY tablename;
