-- Add file_size column to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Optional: Add user_id column if it was missed earlier, just in case
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Optional: Ensure status is an enum or constraint if needed, but text is fine for now.
-- ALTER TABLE documents ADD CONSTRAINT valid_status CHECK (status IN ('processing', 'uploaded', 'indexed', 'failed'));
