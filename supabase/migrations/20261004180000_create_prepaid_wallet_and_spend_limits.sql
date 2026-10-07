-- ==============================================================================
-- Trinetra AI Migration: 20261004180000_create_prepaid_wallet_and_spend_limits.sql (UP)
-- Task 10: Prepaid Wallet, Razorpay Idempotency & Spend Limits
-- Authoritative Source: docs/MASTER_PLAN.md (v1.2, Section 18.9 & 18.10 Overrides)
--
-- Purely ADDITIVE migration:
-- 1. Creates `wallets` table with ₹2,500 default spend limit and Reliability Score.
-- 2. Creates `wallet_transactions` immutable double-entry ledger table.
-- 3. Creates `processed_webhook_events` table for idempotent deduplication.
-- 4. Enables Row Level Security (RLS) on all tables with tenant isolation policies.
-- ==============================================================================

-- 1. Create `wallets` table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    balance_paisa BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    spend_limit_paisa BIGINT NOT NULL DEFAULT 250000, -- ₹2,500 default (Master Plan P8 & 18.9)
    current_spend_paisa BIGINT NOT NULL DEFAULT 0,
    reliability_score INT NOT NULL DEFAULT 85,       -- Replaces 'credit score' (0-100 scale)
    emergency_minutes_available INT NOT NULL DEFAULT 0, -- Up to 50 min for score > 80
    emergency_minutes_claimed_at TIMESTAMPTZ,
    last_topup_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on organization_id for lightning-fast wallet balance lookup
CREATE INDEX IF NOT EXISTS idx_wallets_org_id ON public.wallets(organization_id);

-- 2. Create `wallet_transactions` ledger table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    amount_paisa BIGINT NOT NULL,                    -- Positive = credit, Negative = debit
    type VARCHAR(50) NOT NULL,                       -- topup, call_debit, emergency_credit, refund, admin_adjustment
    reference_id VARCHAR(255),                      -- razorpay_payment_id, call_id, etc.
    balance_after_paisa BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transaction history and reference lookup
CREATE INDEX IF NOT EXISTS idx_wallet_tx_org_id ON public.wallet_transactions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_ref_id ON public.wallet_transactions(reference_id);

-- 3. Create `processed_webhook_events` table for idempotent deduplication
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    idempotency_hash VARCHAR(64) NOT NULL UNIQUE,    -- SHA-256 hash of event payload
    provider VARCHAR(50) NOT NULL DEFAULT 'razorpay',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_webhook_hash ON public.processed_webhook_events(idempotency_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_provider_time ON public.processed_webhook_events(provider, processed_at DESC);

-- 4. Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Tenant Isolation
-- Wallets: Tenant users can SELECT their own organization wallet
DROP POLICY IF EXISTS "Tenant users can view their own wallet" ON public.wallets;
CREATE POLICY "Tenant users can view their own wallet"
    ON public.wallets FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Wallet Transactions: Tenant users can SELECT their own organization transactions
DROP POLICY IF EXISTS "Tenant users can view their own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Tenant users can view their own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Webhook events: Service role only (internal idempotency tracker)
DROP POLICY IF EXISTS "Service role access only for processed_webhook_events" ON public.processed_webhook_events;
CREATE POLICY "Service role access only for processed_webhook_events"
    ON public.processed_webhook_events
    USING (auth.jwt() ->> 'role' = 'service_role');
