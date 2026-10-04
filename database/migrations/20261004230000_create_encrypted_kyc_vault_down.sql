-- Migration Down: 20261004230000_create_encrypted_kyc_vault_down.sql
-- Description: Rollback KYC documents and KYC audit logs tables

DROP TABLE IF EXISTS public.kyc_access_audit_logs CASCADE;
DROP TABLE IF EXISTS public.kyc_documents CASCADE;
