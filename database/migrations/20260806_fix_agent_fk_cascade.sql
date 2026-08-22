-- Migration: Add ON DELETE CASCADE to agent FK references
-- Fixes: hard-deleting an agent fails with FK constraint violation
-- when agent_knowledge or leads records reference the agent.

-- 1. Fix agent_knowledge -> agents FK (if it exists without CASCADE)
ALTER TABLE agent_knowledge
  DROP CONSTRAINT IF EXISTS agent_knowledge_agent_id_fkey;

ALTER TABLE agent_knowledge
  ADD CONSTRAINT agent_knowledge_agent_id_fkey
  FOREIGN KEY (agent_id)
  REFERENCES agents(id)
  ON DELETE SET NULL;  -- Set NULL so knowledge base records are preserved

-- 2. Fix leads -> agents FK (set null on delete, not cascade — preserves lead data)
ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_agent_id_fkey;

ALTER TABLE leads
  ADD CONSTRAINT leads_agent_id_fkey
  FOREIGN KEY (agent_id)
  REFERENCES agents(id)
  ON DELETE SET NULL;

-- 3. Verify integrations already has ON DELETE CASCADE (from 20260724)
-- integrations.agent_id already has ON DELETE CASCADE — no change needed.
