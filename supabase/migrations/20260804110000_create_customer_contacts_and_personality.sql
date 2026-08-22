-- Create customer_contacts table
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    company VARCHAR(255),
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    last_contact_at TIMESTAMPTZ,
    total_calls INTEGER DEFAULT 0,
    notes TEXT,
    import_source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Allow select for same organization"
    ON public.customer_contacts
    FOR SELECT
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Insert policy
CREATE POLICY "Allow insert for same organization"
    ON public.customer_contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Update policy
CREATE POLICY "Allow update for same organization"
    ON public.customer_contacts
    FOR UPDATE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Delete policy
CREATE POLICY "Allow delete for same organization"
    ON public.customer_contacts
    FOR DELETE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Add personality column to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS personality VARCHAR(50) DEFAULT 'friendly';
