-- Add maintenance_mode to system_config
INSERT INTO system_config (config_key, config_value, description)
VALUES ('maintenance_mode', 'false', 'When true, non-admin users see a maintenance screen instead of the dashboard')
ON CONFLICT (config_key) DO NOTHING;

-- Add updated_by and updated_at columns if they don't exist
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable realtime for system_config so maintenance mode toggle instantly pushes to clients
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
