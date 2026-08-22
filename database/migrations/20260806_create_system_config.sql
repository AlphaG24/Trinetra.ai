-- Migration: Create system_config table with proper RLS
-- This table stores platform-wide settings managed by super admins.

CREATE TABLE IF NOT EXISTS public.system_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value text NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow super_admins to read ALL config rows
CREATE POLICY "Super admins can read system_config"
  ON public.system_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Allow super_admins to insert/update/delete config rows
CREATE POLICY "Super admins can write system_config"
  ON public.system_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Allow ALL authenticated users to read the maintenance_mode key only
CREATE POLICY "Authenticated users can read maintenance_mode"
  ON public.system_config FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND config_key = 'maintenance_mode'
  );

-- Insert default values if not present
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('maintenance_mode', 'false', 'When true, non-admin users see a maintenance screen'),
  ('free_demo_minutes', '10', 'Minutes per free demo agent'),
  ('trial_days', '7', 'Trial period duration in days'),
  ('trial_minutes', '100', 'Voice minutes included in trial'),
  ('max_agents_free', '1', 'Max agents for free/demo users'),
  ('max_agents_starter', '3', 'Max agents for starter plan'),
  ('max_agents_professional', '10', 'Max agents for professional plan')
ON CONFLICT (config_key) DO NOTHING;
