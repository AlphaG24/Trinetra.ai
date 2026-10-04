-- Trinetra AI Migration: 20261004240000_create_essential_admin_panel.sql (UP)
-- Task 16: Essential Operations Admin Panel & Tamper-Evident Audit Trail
-- Mandates: Master Plan Section 18.15 Item 14, SEC-001, SEC-004, SEC-006

-- 1. Create `admin_audit_trail` table (Immutable append-only forensic logging)
CREATE TABLE IF NOT EXISTS public.admin_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    step_up_verified BOOLEAN NOT NULL DEFAULT true,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for performance and security audit filtering
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit_trail(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_trail(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_trail(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_trail(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_audit_trail ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins can view administrative audit trail
DROP POLICY IF EXISTS "Admins can view administrative audit trail" ON public.admin_audit_trail;
CREATE POLICY "Admins can view administrative audit trail"
    ON public.admin_audit_trail FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Append-only insertion for authenticated users executing admin handlers
DROP POLICY IF EXISTS "Admins can insert audit trail records" ON public.admin_audit_trail;
CREATE POLICY "Admins can insert audit trail records"
    ON public.admin_audit_trail FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
