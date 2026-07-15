-- Persistent Rate Limiting Schema & Functions

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    timestamps TIMESTAMPTZ[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to prune old rate limiting entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at ON rate_limits(updated_at);


CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key TEXT,
    p_max_requests INT,
    p_window_seconds INT
)
RETURNS TABLE (
    limited BOOLEAN,
    remaining INT,
    reset_seconds INT
) AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
    v_timestamps TIMESTAMPTZ[];
    v_count INT;
    v_oldest TIMESTAMPTZ;
BEGIN
    -- Get existing timestamps (locking row for concurrency safety)
    SELECT timestamps INTO v_timestamps FROM rate_limits WHERE key = p_key FOR UPDATE;
    
    -- Initialize if empty
    IF v_timestamps IS NULL THEN
        v_timestamps := '{}';
    END IF;
    
    -- Filter out expired timestamps outside the sliding window
    SELECT ARRAY(
        SELECT t FROM unnest(v_timestamps) AS t WHERE t > v_window_start
    ) INTO v_timestamps;
    
    v_count := array_length(v_timestamps, 1);
    IF v_count IS NULL THEN
        v_count := 0;
    END IF;
    
    IF v_count >= p_max_requests THEN
        -- Limit exceeded
        v_oldest := v_timestamps[1];
        limited := TRUE;
        remaining := 0;
        reset_seconds := CEIL(EXTRACT(EPOCH FROM (v_oldest + (p_window_seconds || ' seconds')::INTERVAL - v_now)))::INT;
        IF reset_seconds < 0 THEN
            reset_seconds := 0;
        END IF;
        
        -- Save pruned array
        INSERT INTO rate_limits (key, timestamps, updated_at)
        VALUES (p_key, v_timestamps, v_now)
        ON CONFLICT (key) DO UPDATE
        SET timestamps = EXCLUDED.timestamps, updated_at = EXCLUDED.updated_at;
    ELSE
        -- Allowed, append current request timestamp
        v_timestamps := array_append(v_timestamps, v_now);
        v_count := v_count + 1;
        limited := FALSE;
        remaining := p_max_requests - v_count;
        reset_seconds := p_window_seconds;
        
        INSERT INTO rate_limits (key, timestamps, updated_at)
        VALUES (p_key, v_timestamps, v_now)
        ON CONFLICT (key) DO UPDATE
        SET timestamps = EXCLUDED.timestamps, updated_at = EXCLUDED.updated_at;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
