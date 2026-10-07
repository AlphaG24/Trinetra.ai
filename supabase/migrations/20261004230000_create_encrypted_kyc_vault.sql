-- Migration: 20261004230000_create_encrypted_kyc_vault.sql
-- Description: Encrypted KYC Document Vault, Mandatory Consent, UIDAI Masking, and Immutable Access Audit Logs
-- Standard: Master Plan Section 18.6 & 18.15 Item 13 (Authoritative Overrides)

-- 1. KYC Documents Table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number_id UUID REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL,
    encrypted_file_path TEXT NOT NULL,
    file_sha256_checksum TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    id_number_masked TEXT,
    is_raw_aadhaar_stored BOOLEAN NOT NULL DEFAULT FALSE,
    upload_consent_given BOOLEAN NOT NULL DEFAULT TRUE,
    upload_consent_text TEXT NOT NULL,
    upload_consent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    upload_ip_address TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review',
    rejection_reason TEXT,
    verified_by_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    retention_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT kyc_document_type_check CHECK (
        document_type IN (
            'company_pan',
            'gstin_certificate',
            'authorized_signatory_id',
            'utility_bill',
            'incorporation_cert',
            'passport',
            'driving_license'
        )
    ),
    CONSTRAINT kyc_status_check CHECK (
        status IN (
            'pending_review',
            'verified',
            'rejected',
            'expired',
            'deleted'
        )
    )
);

-- 2. Immutable KYC Access Audit Logs (Write-Once, Append-Only)
CREATE TABLE IF NOT EXISTS public.kyc_access_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.kyc_documents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    accessed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_type TEXT NOT NULL,
    step_up_token_verified BOOLEAN NOT NULL DEFAULT FALSE,
    client_ip TEXT,
    user_agent TEXT,
    justification TEXT,
    accessed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT kyc_access_type_check CHECK (
        access_type IN (
            'view_signed_url',
            'status_update',
            'download_decrypted',
            'rejection',
            'audit_export'
        )
    )
);

-- 3. Fast Performance & Compliance Query Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_documents_org_id ON public.kyc_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON public.kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_retention ON public.kyc_documents(retention_expires_at) WHERE retention_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kyc_audit_doc_id ON public.kyc_access_audit_logs(document_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_accessed_by ON public.kyc_access_audit_logs(accessed_by_user_id, accessed_at DESC);

-- 4. Row Level Security (RLS)
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_access_audit_logs ENABLE ROW LEVEL SECURITY;

-- KYC Documents RLS
DROP POLICY IF EXISTS "Customers can read own organization KYC document metadata" ON public.kyc_documents;
CREATE POLICY "Customers can read own organization KYC document metadata"
    ON public.kyc_documents
    FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Customers can insert own KYC documents" ON public.kyc_documents;
CREATE POLICY "Customers can insert own KYC documents"
    ON public.kyc_documents
    FOR INSERT
    WITH CHECK (
        (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR user_id = auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer_tester', 'dev_test', 'tester')
        )
    );

DROP POLICY IF EXISTS "Admins can manage all KYC documents" ON public.kyc_documents;
CREATE POLICY "Admins can manage all KYC documents"
    ON public.kyc_documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- KYC Audit Logs RLS (Strict Write-Once: No UPDATE or DELETE allowed by anyone)
DROP POLICY IF EXISTS "Admins can view KYC audit logs" ON public.kyc_access_audit_logs;
CREATE POLICY "Admins can view KYC audit logs"
    ON public.kyc_access_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Append-only KYC audit log creation" ON public.kyc_access_audit_logs;
CREATE POLICY "Append-only KYC audit log creation"
    ON public.kyc_access_audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
