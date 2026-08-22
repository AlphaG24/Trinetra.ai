-- UP MIGRATION
-- Create consent_records table to store user consent under DPDP Act 2023
CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(255) NOT NULL,
    consent_version VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own consent records" 
ON public.consent_records
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own consent records" 
ON public.consent_records
FOR SELECT 
USING (auth.uid() = user_id);

-- DOWN MIGRATION
-- DROP TABLE IF EXISTS public.consent_records;
