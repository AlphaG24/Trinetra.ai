-- Fix missing column in enterprise_leads
ALTER TABLE public.enterprise_leads 
ADD COLUMN IF NOT EXISTS infrastructure_needs text;

-- Reload schema cache to ensure PostgREST sees the new column
NOTIFY pgrst, 'reload schema';
