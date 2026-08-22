-- Create indexes to optimize dashboard dashboard overview queries
CREATE INDEX IF NOT EXISTS idx_voice_calls_user_created ON voice_calls(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_calls_org_created ON voice_calls(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
