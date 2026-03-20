-- Fix missing column deployment_type in enterprise_leads
ALTER TABLE public.enterprise_leads 
ADD COLUMN IF NOT EXISTS deployment_type text;

-- Reload schema cache to ensure PostgREST sees the new column
NOTIFY pgrst, 'reload schema';
