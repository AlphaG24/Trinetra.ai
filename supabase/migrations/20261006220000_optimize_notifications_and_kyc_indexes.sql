-- Migration: 20261006220000_optimize_notifications_and_kyc_indexes.sql
-- Description: Composite performance indexes to eliminate sequential scans and prevent database connection exhaustion
-- Standard: DB-003, Master Plan Section 18.6

-- 1. Notifications Table Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON public.notifications (user_id, is_read) 
    WHERE is_read = false;

-- 2. KYC Documents Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_documents_org_status 
    ON public.kyc_documents (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_created 
    ON public.kyc_documents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kyc_access_audit_doc_accessed 
    ON public.kyc_access_audit_logs (document_id, accessed_at DESC);
