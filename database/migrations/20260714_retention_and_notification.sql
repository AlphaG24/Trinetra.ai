-- Database Migration: Data Retention & 2-Tier Notifications System

-- 1. CLEANUP / RETENTION PROCEDURE
CREATE OR REPLACE FUNCTION cleanup_retention_data()
RETURNS void AS $$
BEGIN
  -- Deletion of old voice call logs after 30 days
  DELETE FROM agent_call_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Deletion of user accounts and profiles inactive for > 12 months
  DELETE FROM auth.users
  WHERE last_sign_in_at < NOW() - INTERVAL '12 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. NOTIFICATIONS TABLES
CREATE TABLE IF NOT EXISTS official_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'normal', -- 'normal' or 'important'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_read_notifications (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES official_notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, notification_id)
);

-- Enable Row-Level Security
ALTER TABLE official_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_read_notifications ENABLE ROW LEVEL SECURITY;

-- 3. ROW LEVEL SECURITY POLICIES
DROP POLICY IF EXISTS "Allow authenticated users to read notifications" ON official_notifications;
CREATE POLICY "Allow authenticated users to read notifications"
ON official_notifications
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow users to read their own status" ON user_read_notifications;
CREATE POLICY "Allow users to read their own status"
ON user_read_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own status" ON user_read_notifications;
CREATE POLICY "Allow users to insert their own status"
ON user_read_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. RPC TO MARK ALL READ
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_read_notifications (user_id, notification_id)
  SELECT p_user_id, id
  FROM official_notifications
  ON CONFLICT (user_id, notification_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
