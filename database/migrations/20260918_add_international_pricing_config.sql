-- Migration: 20260918_add_international_pricing_config.sql
-- Description: Insert default international USD pricing keys into system_config table

-- UP MIGRATION
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('starter_price_usd_cents', '8900', 'International Starter plan monthly price in USD cents ($89)'),
  ('professional_price_usd_cents', '24900', 'International Professional plan monthly price in USD cents ($249)'),
  ('enterprise_price_usd_cents', '59900', 'International Enterprise plan monthly price in USD cents ($599)'),
  ('trial_price_usd_cents', '500', 'International Trial plan price in USD cents ($5)'),
  ('foreign_number_cost_usd_cents', '1500', 'International dedicated number monthly price in USD cents ($15)'),
  ('overage_per_minute_usd_cents', '12', 'International per-minute voice overage price in USD cents ($0.12/min)')
ON CONFLICT (config_key) DO UPDATE
SET description = EXCLUDED.description;

-- DOWN MIGRATION
-- DELETE FROM public.system_config 
-- WHERE config_key IN (
--   'starter_price_usd_cents',
--   'professional_price_usd_cents',
--   'enterprise_price_usd_cents',
--   'trial_price_usd_cents',
--   'foreign_number_cost_usd_cents',
--   'overage_per_minute_usd_cents'
-- );
