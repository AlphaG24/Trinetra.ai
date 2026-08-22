-- Create callbacks table
CREATE TABLE IF NOT EXISTS public.callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    original_call_id UUID REFERENCES public.voice_calls(id) ON DELETE SET NULL,
    prospect_name VARCHAR(255),
    prospect_phone VARCHAR(20) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    notes TEXT,
    max_attempts INTEGER DEFAULT 3,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_callbacks_organization_id ON public.callbacks(organization_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_agent_id ON public.callbacks(agent_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_status ON public.callbacks(status);
CREATE INDEX IF NOT EXISTS idx_callbacks_scheduled_at ON public.callbacks(scheduled_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_callbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_callbacks_updated_at ON public.callbacks;
CREATE TRIGGER trg_callbacks_updated_at
BEFORE UPDATE ON public.callbacks
FOR EACH ROW
EXECUTE FUNCTION update_callbacks_updated_at();

-- Enable Row Level Security
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's callbacks"
    ON public.callbacks FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their organization's callbacks"
    ON public.callbacks FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their organization's callbacks"
    ON public.callbacks FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their organization's callbacks"
    ON public.callbacks FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Service role bypass policy for admin key inserts/updates
CREATE POLICY "Service role bypass" 
    ON public.callbacks FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);
