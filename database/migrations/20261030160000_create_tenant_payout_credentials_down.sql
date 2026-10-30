-- Revert Migration: 20261030160000_create_tenant_payout_credentials_down.sql
-- Description: Drop tenant_payout_credentials table and policies

DROP POLICY IF EXISTS "Users update own org payout credentials" ON public.tenant_payout_credentials;
DROP POLICY IF EXISTS "Users insert own org payout credentials" ON public.tenant_payout_credentials;
DROP POLICY IF EXISTS "Users view own org payout credentials" ON public.tenant_payout_credentials;

DROP INDEX IF EXISTS public.idx_tenant_payout_user;
DROP INDEX IF EXISTS public.idx_tenant_payout_org;

DROP TABLE IF EXISTS public.tenant_payout_credentials;
