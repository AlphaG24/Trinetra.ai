-- Migration: 20261006220000_optimize_notifications_and_kyc_indexes_down.sql
-- Description: Revert performance indexes for notifications and KYC documents
-- Standard: DB-MIG-SYMMETRY, Master Plan Section 18.0

DROP INDEX IF EXISTS public.idx_notifications_user_created;
DROP INDEX IF EXISTS public.idx_notifications_user_unread;
DROP INDEX IF EXISTS public.idx_kyc_documents_org_status;
DROP INDEX IF EXISTS public.idx_kyc_documents_user_created;
DROP INDEX IF EXISTS public.idx_kyc_access_audit_doc_accessed;
