-- 1. Create phone_numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL DEFAULT 'voicelink' CHECK (provider IN ('voicelink', 'twilio', 'simulated')),
    provider_number_id VARCHAR(100),
    phone_number VARCHAR(20) NOT NULL,
    area_code VARCHAR(10),
    city VARCHAR(50),
    did_type VARCHAR(20) NOT NULL CHECK (did_type IN ('mobile', 'landline', 'tollfree', '92series', 'local')),
    status VARCHAR(20) NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'active', 'released', 'suspended', 'failed')),
    monthly_cost_paisa INTEGER,
    retail_price_paisa INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    provisioned_at TIMESTAMPTZ DEFAULT now(),
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create agent_phone_numbers table
CREATE TABLE IF NOT EXISTS agent_phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    phone_number_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (agent_id, phone_number_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_phone_numbers_organization_id ON phone_numbers(organization_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_provider ON phone_numbers(provider);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_city ON phone_numbers(city);

CREATE INDEX IF NOT EXISTS idx_agent_phone_numbers_agent_id ON agent_phone_numbers(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_phone_numbers_phone_number_id ON agent_phone_numbers(phone_number_id);

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phone_numbers_updated_at ON phone_numbers;
CREATE TRIGGER trg_phone_numbers_updated_at
BEFORE UPDATE ON phone_numbers
FOR EACH ROW
EXECUTE FUNCTION update_phone_numbers_updated_at();

-- 5. Row Level Security
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_phone_numbers ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for phone_numbers
-- Organization isolation
CREATE POLICY "Users can view their organization's phone numbers"
    ON phone_numbers FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their organization's phone numbers"
    ON phone_numbers FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their organization's phone numbers"
    ON phone_numbers FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their organization's phone numbers"
    ON phone_numbers FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Admin full access
CREATE POLICY "Super admins have full access to phone_numbers"
    ON phone_numbers FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin'));

-- 7. RLS Policies for agent_phone_numbers
-- Organization isolation via join
CREATE POLICY "Users can view their organization's agent phone numbers"
    ON agent_phone_numbers FOR SELECT
    USING (phone_number_id IN (
        SELECT id FROM phone_numbers 
        WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    ));

CREATE POLICY "Users can insert their organization's agent phone numbers"
    ON agent_phone_numbers FOR INSERT
    WITH CHECK (phone_number_id IN (
        SELECT id FROM phone_numbers 
        WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    ));

CREATE POLICY "Users can update their organization's agent phone numbers"
    ON agent_phone_numbers FOR UPDATE
    USING (phone_number_id IN (
        SELECT id FROM phone_numbers 
        WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    ))
    WITH CHECK (phone_number_id IN (
        SELECT id FROM phone_numbers 
        WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    ));

CREATE POLICY "Users can delete their organization's agent phone numbers"
    ON agent_phone_numbers FOR DELETE
    USING (phone_number_id IN (
        SELECT id FROM phone_numbers 
        WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    ));

-- Admin full access
CREATE POLICY "Super admins have full access to agent_phone_numbers"
    ON agent_phone_numbers FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin'));
