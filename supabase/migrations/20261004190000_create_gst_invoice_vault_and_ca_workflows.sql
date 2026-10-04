-- ==============================================================================
-- Trinetra AI Migration: 20261004190000_create_gst_invoice_vault_and_ca_workflows.sql (UP)
-- Task 11: GST Invoicing Vault & CA-Reviewed Workflows
-- Authoritative Source: docs/MASTER_PLAN.md (v1.2, Sections 18.10, 18.11, & B6)
-- Governing Standards:
--   - CGST Act 2017 Sections 31, 36 (Statutory 8-year record retention: CONFIRM WITH CA)
--   - SAC 998311 for IT & Cloud Software Services (18% GST standard)
--   - Intra-state (9% CGST + 9% SGST) vs Inter-state (18% IGST)
--
-- Purely ADDITIVE migration:
-- 1. Creates/Updates `invoices` table with full GST tax breakdown, SHA-256 integrity hash.
-- 2. Creates `invoice_line_items` table with SAC codes and itemized taxes.
-- 3. Creates `invoice_ca_reviews` audit trail table for CA sign-offs.
-- 4. Enables Row Level Security (RLS) on all tables with tenant isolation policies.
-- ==============================================================================

-- 1. Ensure `invoices` table exists with base structure
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Additive columns for GST Invoicing Vault (Task 11)
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS fiscal_year VARCHAR(20) DEFAULT '2026-2027',
    ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS payment_reference_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'wallet_topup',
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT 'Vaakriti Technologies Private Limited',
    ADD COLUMN IF NOT EXISTS supplier_gstin VARCHAR(15) DEFAULT '07AAAAA0000A1Z5',
    ADD COLUMN IF NOT EXISTS supplier_state TEXT DEFAULT 'Delhi',
    ADD COLUMN IF NOT EXISTS supplier_state_code VARCHAR(5) DEFAULT '07',
    ADD COLUMN IF NOT EXISTS supplier_address JSONB DEFAULT '{"street": "Vaakriti Tower, Tech Park", "city": "New Delhi", "state": "Delhi", "pincode": "110001", "country": "IN"}'::jsonb,
    ADD COLUMN IF NOT EXISTS customer_legal_name TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(15),
    ADD COLUMN IF NOT EXISTS customer_state TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS customer_state_code VARCHAR(5) DEFAULT '',
    ADD COLUMN IF NOT EXISTS customer_billing_address JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS place_of_supply TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_reverse_charge BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS subtotal_paisa BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_rate_pct NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS cgst_amount_paisa BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_rate_pct NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS sgst_amount_paisa BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_rate_pct NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS igst_amount_paisa BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tax_paisa BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS grand_total_paisa BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ca_review_status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
    ADD COLUMN IF NOT EXISTS integrity_hash VARCHAR(64) DEFAULT '';

-- 3. Constraints for transaction_type and ca_review_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_transaction_type_check'
    ) THEN
        ALTER TABLE public.invoices
            ADD CONSTRAINT invoices_transaction_type_check
            CHECK (transaction_type IN ('wallet_topup', 'subscription', 'usage_overage', 'manual_credit'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_ca_review_status_check'
    ) THEN
        ALTER TABLE public.invoices
            ADD CONSTRAINT invoices_ca_review_status_check
            CHECK (ca_review_status IN ('pending', 'approved', 'flagged', 'waived'));
    END IF;
END $$;

-- Indexes for rapid lookup and tenant isolation
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(organization_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_ca_status ON public.invoices(ca_review_status, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_ref ON public.invoices(payment_reference_id);

-- 4. Create `invoice_line_items` table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    hsn_sac_code VARCHAR(20) NOT NULL DEFAULT '998311', -- SAC for IT & Software Cloud Services
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price_paisa BIGINT NOT NULL,
    taxable_amount_paisa BIGINT NOT NULL,
    cgst_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    cgst_amount_paisa BIGINT NOT NULL DEFAULT 0,
    sgst_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    sgst_amount_paisa BIGINT NOT NULL DEFAULT 0,
    igst_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    igst_amount_paisa BIGINT NOT NULL DEFAULT 0,
    total_amount_paisa BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_inv_id ON public.invoice_line_items(invoice_id);

-- 5. Create `invoice_ca_reviews` audit trail table
CREATE TABLE IF NOT EXISTS public.invoice_ca_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ca_membership_no VARCHAR(50) NOT NULL,
    ca_name VARCHAR(150) NOT NULL,
    action VARCHAR(50) NOT NULL
        CHECK (action IN ('approved', 'flagged', 'waived', 'amended')),
    notes TEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,                   -- SHA-256 audit sign-off hash
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_reviews_inv_id ON public.invoice_ca_reviews(invoice_id, created_at DESC);

-- ==============================================================================
-- 6. Enable Row Level Security (RLS) & Define Tenant Isolation Policies
-- ==============================================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_ca_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members view only their own invoices
DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;
CREATE POLICY "Users view own invoices" ON public.invoices
    FOR SELECT TO authenticated
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Policy: Admins have full access to invoices
DROP POLICY IF EXISTS "Admins manage invoices" ON public.invoices;
CREATE POLICY "Admins manage invoices" ON public.invoices
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Policy: Organization members view only line items of their own invoices
DROP POLICY IF EXISTS "Users view own invoice line items" ON public.invoice_line_items;
CREATE POLICY "Users view own invoice line items" ON public.invoice_line_items
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.invoices inv
        WHERE inv.id = invoice_line_items.invoice_id
          AND inv.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    ));

-- Policy: Admins manage invoice line items
DROP POLICY IF EXISTS "Admins manage invoice line items" ON public.invoice_line_items;
CREATE POLICY "Admins manage invoice line items" ON public.invoice_line_items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Policy: Admins and CA auditors view CA reviews
DROP POLICY IF EXISTS "Admins view invoice ca reviews" ON public.invoice_ca_reviews;
CREATE POLICY "Admins view invoice ca reviews" ON public.invoice_ca_reviews
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Policy: Admins and CA auditors insert CA review audit trails (append-only)
DROP POLICY IF EXISTS "Admins insert invoice ca reviews" ON public.invoice_ca_reviews;
CREATE POLICY "Admins insert invoice ca reviews" ON public.invoice_ca_reviews
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
