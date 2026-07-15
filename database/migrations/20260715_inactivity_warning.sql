-- Database Migration: Inactivity warning column, modified retention cleanup, and RPC helpers

-- 1. Add inactivity_warning_sent_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Update cleanup_retention_data to require warning sent at least 30 days ago
CREATE OR REPLACE FUNCTION cleanup_retention_data()
RETURNS void AS $$
BEGIN
  -- Deletion of old voice call logs after 30 days
  DELETE FROM agent_call_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Deletion of user accounts and profiles inactive for > 12 months
  -- (Must either have no profile and be old, or have profile and warning sent > 30 days ago)
  DELETE FROM auth.users u
  WHERE u.last_sign_in_at < NOW() - INTERVAL '12 months'
    AND (
      NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
      OR EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = u.id 
          AND p.inactivity_warning_sent_at IS NOT NULL 
          AND p.inactivity_warning_sent_at < NOW() - INTERVAL '30 days'
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Stored procedure to retrieve inactive users to warn (inactive > 11 months, not yet warned since last sign in)
CREATE OR REPLACE FUNCTION get_inactive_users_to_warn()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR,
  last_sign_in_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::VARCHAR, u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.last_sign_in_at < NOW() - INTERVAL '11 months'
    AND (p.inactivity_warning_sent_at IS NULL OR p.inactivity_warning_sent_at < u.last_sign_in_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Stored procedure to mark user warning as sent
CREATE OR REPLACE FUNCTION mark_user_inactivity_warning_sent(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET inactivity_warning_sent_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
