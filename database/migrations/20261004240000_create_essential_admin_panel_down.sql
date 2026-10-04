-- Trinetra AI Migration: 20261004240000_create_essential_admin_panel_down.sql (DOWN)
-- Task 16: Revert Essential Operations Admin Panel & Tamper-Evident Audit Trail

DROP POLICY IF EXISTS "Admins can insert audit trail records" ON public.admin_audit_trail;
DROP POLICY IF EXISTS "Admins can view administrative audit trail" ON public.admin_audit_trail;

DROP TABLE IF EXISTS public.admin_audit_trail CASCADE;
