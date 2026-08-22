-- Create agent_knowledge table
CREATE TABLE IF NOT EXISTS agent_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vapi_agent_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'parsing',
    content_excerpt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Users can view their own agent knowledge documents"
    ON agent_knowledge FOR SELECT
    USING (auth.uid() = user_id);

-- Insert policy
CREATE POLICY "Users can insert their own agent knowledge documents"
    ON agent_knowledge FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Delete policy
CREATE POLICY "Users can delete their own agent knowledge documents"
    ON agent_knowledge FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_user_id ON agent_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_vapi_agent_id ON agent_knowledge(vapi_agent_id);
