ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

UPDATE voice_calls 
SET organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = voice_calls.user_id LIMIT 1)
WHERE organization_id IS NULL;
