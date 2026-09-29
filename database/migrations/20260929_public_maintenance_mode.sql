-- Migration: Allow public (anon & authenticated) to read maintenance_mode config
-- This allows any new or unauthenticated visitor to detect maintenance mode in real time.

DROP POLICY IF EXISTS "Authenticated users can read maintenance_mode" ON public.system_config;
DROP POLICY IF EXISTS "Public can read maintenance_mode" ON public.system_config;

CREATE POLICY "Public can read maintenance_mode"
  ON public.system_config FOR SELECT
  TO anon, authenticated
  USING (config_key = 'maintenance_mode');

-- Ensure realtime publication includes system_config for instant client updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'system_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
  END IF;
END $$;
