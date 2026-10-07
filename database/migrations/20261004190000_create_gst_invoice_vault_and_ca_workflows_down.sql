-- ==============================================================================
-- Trinetra AI Migration: 20261004190000_create_gst_invoice_vault_and_ca_workflows_down.sql (DOWN)
-- Task 11: Revert GST Invoicing Vault & CA-Reviewed Workflows
-- ==============================================================================

-- Drop Policies
DROP POLICY IF EXISTS "Admins insert invoice ca reviews" ON public.invoice_ca_reviews;
DROP POLICY IF EXISTS "Admins view invoice ca reviews" ON public.invoice_ca_reviews;
DROP POLICY IF EXISTS "Admins manage invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users view own invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users view own invoices" ON public.invoices;

-- Drop Tables in reverse dependency order
DROP TABLE IF EXISTS public.invoice_ca_reviews CASCADE;
DROP TABLE IF EXISTS public.invoice_line_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
