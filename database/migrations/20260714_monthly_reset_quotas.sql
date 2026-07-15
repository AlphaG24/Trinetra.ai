-- 1. Add monthly_reset_enabled to platform_services
ALTER TABLE platform_services ADD COLUMN IF NOT EXISTS monthly_reset_enabled BOOLEAN DEFAULT TRUE;

-- 2. Create function to reset demo quotas
CREATE OR REPLACE FUNCTION reset_monthly_demo_quotas()
RETURNS void AS $$
BEGIN
  -- Reset user_service_quotas for services that have monthly reset enabled
  UPDATE user_service_quotas
  SET quota_used = 0,
      updated_at = NOW()
  WHERE is_demo = true
    AND service_slug IN (
      SELECT slug 
      FROM platform_services 
      WHERE monthly_reset_enabled = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
