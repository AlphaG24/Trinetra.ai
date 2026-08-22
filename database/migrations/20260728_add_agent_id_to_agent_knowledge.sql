-- up
ALTER TABLE agent_knowledge ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);

-- down
ALTER TABLE agent_knowledge DROP COLUMN IF EXISTS agent_id;
