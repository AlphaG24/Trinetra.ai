-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'running', 'paused', 'completed', 'cancelled')),
    contact_list_url TEXT,
    total_contacts INTEGER DEFAULT 0,
    contacts_called INTEGER DEFAULT 0,
    contacts_connected INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    calling_hours_start TIME DEFAULT '10:00',
    calling_hours_end TIME DEFAULT '18:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    scheduled_start TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create campaign_contacts table
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    notes TEXT,
    call_status VARCHAR(20) DEFAULT 'pending' CHECK (call_status IN ('pending', 'dialing', 'answered', 'no_answer', 'busy', 'failed', 'dnd')),
    call_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    call_id UUID REFERENCES public.voice_calls(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_agent_id ON public.campaigns(agent_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- Indexes for campaign_contacts
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_id ON public.campaign_contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_call_status ON public.campaign_contacts(call_status);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_phone ON public.campaign_contacts(phone);

-- Trigger for campaigns.updated_at
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION update_campaigns_updated_at();

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can view their organization's campaigns"
    ON public.campaigns FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their organization's campaigns"
    ON public.campaigns FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their organization's campaigns"
    ON public.campaigns FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their organization's campaigns"
    ON public.campaigns FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Service role bypass campaigns" 
    ON public.campaigns FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- RLS Policies for campaign_contacts
CREATE POLICY "Users can view campaign contacts in their organization"
    ON public.campaign_contacts FOR SELECT
    USING (campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert campaign contacts in their organization"
    ON public.campaign_contacts FOR INSERT
    WITH CHECK (campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update campaign contacts in their organization"
    ON public.campaign_contacts FOR UPDATE
    USING (campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())))
    WITH CHECK (campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete campaign contacts in their organization"
    ON public.campaign_contacts FOR DELETE
    USING (campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Service role bypass campaign_contacts" 
    ON public.campaign_contacts FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Setup Supabase Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-contacts', 'campaign-contacts', true)
ON CONFLICT (id) DO NOTHING;
