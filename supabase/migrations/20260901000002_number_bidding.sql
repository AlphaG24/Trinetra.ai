-- Add bidding columns to phone_numbers table
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS bidding_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_bid_paisa INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bid_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS minimum_bid_paisa INTEGER DEFAULT 0;

-- Create number_bids table
CREATE TABLE IF NOT EXISTS number_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  bid_amount_paisa INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, won, lost, cancelled, purchased
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index foreign keys for query performance
CREATE INDEX IF NOT EXISTS idx_number_bids_phone_number_id ON number_bids(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_number_bids_organization_id ON number_bids(organization_id);
CREATE INDEX IF NOT EXISTS idx_number_bids_user_id ON number_bids(user_id);
CREATE INDEX IF NOT EXISTS idx_number_bids_status ON number_bids(status);

-- Enable RLS on number_bids
ALTER TABLE number_bids ENABLE ROW LEVEL SECURITY;

-- Policies for number_bids
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'number_bids' AND policyname = 'Users can view bids for own org'
  ) THEN
    CREATE POLICY "Users can view bids for own org" ON number_bids
      FOR SELECT USING (
        auth.uid() = user_id OR 
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'number_bids' AND policyname = 'Users can insert bids for own org'
  ) THEN
    CREATE POLICY "Users can insert bids for own org" ON number_bids
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'number_bids' AND policyname = 'Admins full access to number_bids'
  ) THEN
    CREATE POLICY "Admins full access to number_bids" ON number_bids
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;
