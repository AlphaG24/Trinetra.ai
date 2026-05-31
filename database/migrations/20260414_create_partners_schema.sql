-- Run this migration if table needs updating
ALTER TABLE partners ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS email TEXT UNIQUE NOT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS payout_email TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE NOT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS referral_link TEXT GENERATED ALWAYS AS 
  ('https://trinetra.ai/?ref=' || referral_code) STORED;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 20.00;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
  CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));
ALTER TABLE partners ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS approved_on TIMESTAMPTZ;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE partners ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Referral ledger table
CREATE TABLE IF NOT EXISTS partner_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  referral_name TEXT NOT NULL,
  referral_email TEXT,
  source TEXT DEFAULT 'direct',
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'qualified', 'converted', 'rejected')),
  deal_value NUMERIC(12,2) DEFAULT 0,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  commission_status TEXT DEFAULT 'pending' 
    CHECK (commission_status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Partners can view own record" ON partners
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Partners can update own record" ON partners
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Partners can view own referrals" ON partner_referrals
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM partners WHERE auth_user_id = auth.uid()
    )
  );

-- Admin policies (service role bypasses RLS)
-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partners_updated_at 
  BEFORE UPDATE ON partners 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER referrals_updated_at 
  BEFORE UPDATE ON partner_referrals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
