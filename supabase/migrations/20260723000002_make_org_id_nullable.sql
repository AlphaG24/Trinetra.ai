-- Migration: 20260723000002_make_org_id_nullable.sql
-- Description: Allow agents to be created without an organization (falls back to user-level isolation)

ALTER TABLE agents ALTER COLUMN organization_id DROP NOT NULL;
