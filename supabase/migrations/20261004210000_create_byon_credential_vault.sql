-- ==============================================================================
-- Trinetra AI Migration: 20261004210000_create_byon_credential_vault.sql (UP)
-- Task 13: Bring-Your-Own Numbers (BYON - Twilio & Exotel)
-- Authoritative Source: docs/MASTER_PLAN.md (v1.2, Section 18.8 Overrides)
--
-- Rules:
-- 1. Encrypted Credential Vault: AES-256 encryption at rest for carrier credentials.
-- 2. Secret Hygiene: Plaintext credentials never logged or sent to frontend bundles.
-- 3. Webhook Synchronization: Real-time and periodic sync with carrier endpoints.
-- 4. Agent Assignment: Synced BYON numbers assignable to active organization agents.
-- 5. Revocation Handling: Graceful degradation upon credential expiry or revocation.
-- 6. Cross-Tenant Isolation: Multi-tenant RLS isolation on credentials and numbers.
-- 7. DLT Exemption: Indian DLT compliance stays on customer's own carrier account;
--    no KYC collected by Trinetra on the BYON pathway.
-- ==============================================================================

-- 1. Create `byon_carrier_credentials` table
CREATE TABLE IF NOT EXISTS public.byon_carrier_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    carrier VARCHAR(20) NOT NULL CHECK (carrier IN ('twilio', 'exotel')),
    account_sid VARCHAR(255) NOT NULL,
    api_key_or_sid VARCHAR(255),                      -- Optional revocable subaccount or API key SID
    encrypted_auth_token TEXT NOT NULL,               -- AES-256-GCM encrypted base64 payload
    key_fingerprint VARCHAR(64) NOT NULL,             -- SHA-256 hash for rotation tracking
    webhook_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'revoked', 'expired', 'error')),
    last_error TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, carrier, account_sid)
);

CREATE INDEX IF NOT EXISTS idx_byon_cred_org_id ON public.byon_carrier_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_byon_cred_carrier ON public.byon_carrier_credentials(carrier, status);

-- 2. Create `byon_phone_numbers` table
CREATE TABLE IF NOT EXISTS public.byon_phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES public.byon_carrier_credentials(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    phone_number VARCHAR(30) NOT NULL,
    carrier VARCHAR(20) NOT NULL CHECK (carrier IN ('twilio', 'exotel')),
    carrier_sid VARCHAR(255),
    friendly_name VARCHAR(150),
    assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    dlt_entity_id VARCHAR(100),                       -- DLT Principal Entity ID (India Exotel)
    dlt_template_id VARCHAR(100),                     -- DLT Template ID
    capabilities JSONB NOT NULL DEFAULT '{"voice": true, "sms": true}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'unassigned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_byon_num_org_id ON public.byon_phone_numbers(organization_id);
CREATE INDEX IF NOT EXISTS idx_byon_num_phone ON public.byon_phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_byon_num_agent ON public.byon_phone_numbers(assigned_agent_id);

-- ==============================================================================
-- 3. Enable Row Level Security (RLS) & Define Tenant Isolation Policies
-- ==============================================================================

ALTER TABLE public.byon_carrier_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.byon_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members manage their own carrier credentials
DROP POLICY IF EXISTS "Users manage own carrier credentials" ON public.byon_carrier_credentials;
CREATE POLICY "Users manage own carrier credentials" ON public.byon_carrier_credentials
    FOR ALL TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policy: Admins manage all carrier credentials
DROP POLICY IF EXISTS "Admins manage all carrier credentials" ON public.byon_carrier_credentials;
CREATE POLICY "Admins manage all carrier credentials" ON public.byon_carrier_credentials
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Policy: Organization members manage their own BYON phone numbers
DROP POLICY IF EXISTS "Users manage own byon phone numbers" ON public.byon_phone_numbers;
CREATE POLICY "Users manage own byon phone numbers" ON public.byon_phone_numbers
    FOR ALL TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policy: Admins manage all BYON phone numbers
DROP POLICY IF EXISTS "Admins manage all byon phone numbers" ON public.byon_phone_numbers;
CREATE POLICY "Admins manage all byon phone numbers" ON public.byon_phone_numbers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
