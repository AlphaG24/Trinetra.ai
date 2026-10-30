-- Migration: 20261030160000_create_tenant_payout_credentials.sql
-- Description: Non-Custodial Tenant Payout & Settlement Credentials Vault (UPI VPA, Payment Link, Static QR, Bank Details)
-- Compliance: RBI PA-PG Directions 2020/2021 (Non-Custodial Direct Settlement) & Rule SEC-004 (Strict RLS)

CREATE TABLE IF NOT EXISTS public.tenant_payout_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    upi_id TEXT,
    payment_link_url TEXT,
    qr_code_url TEXT,
    bank_name TEXT,
    account_number_masked TEXT,
    account_number_encrypted TEXT,
    ifsc_code TEXT,
    beneficiary_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    consent_attested BOOLEAN NOT NULL DEFAULT FALSE,
    attested_at TIMESTAMPTZ,
    attestation_statement TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT uq_tenant_payout_org UNIQUE (organization_id)
);

-- Index foreign keys for query performance (Rule DB-003)
CREATE INDEX IF NOT EXISTS idx_tenant_payout_org ON public.tenant_payout_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payout_user ON public.tenant_payout_credentials(user_id);

-- Enforce Row Level Security (Rule SEC-004)
ALTER TABLE public.tenant_payout_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own org payout credentials"
    ON public.tenant_payout_credentials
    FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users insert own org payout credentials"
    ON public.tenant_payout_credentials
    FOR INSERT
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users update own org payout credentials"
    ON public.tenant_payout_credentials
    FOR UPDATE
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );
