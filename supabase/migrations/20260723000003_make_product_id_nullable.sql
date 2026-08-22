-- Migration: 20260723000003_make_product_id_nullable.sql
-- Description: Allow agents to be created without a product_id

ALTER TABLE agents ALTER COLUMN product_id DROP NOT NULL;
