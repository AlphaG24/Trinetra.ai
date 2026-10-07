-- ==============================================================================
-- Trinetra AI Migration: 20261004180000_create_prepaid_wallet_and_spend_limits_down.sql (DOWN)
-- Task 10: Rollback for Prepaid Wallet, Transactions, and Webhook Idempotency
-- ==============================================================================

-- Drop RLS policies
DROP POLICY IF EXISTS "Tenant users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Tenant users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Service role access only for processed_webhook_events" ON public.processed_webhook_events;

-- Drop tables
DROP TABLE IF EXISTS public.processed_webhook_events;
DROP TABLE IF EXISTS public.wallet_transactions;
DROP TABLE IF EXISTS public.wallets;
