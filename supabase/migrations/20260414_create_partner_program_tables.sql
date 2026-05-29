create table if not exists partners (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text,
  full_name text,
  company_name text,
  phone text,
  payout_email text,
  referral_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'rejected')),
  commission_rate numeric(5,2) not null default 0,
  commission_currency text not null default 'INR',
  total_referrals integer not null default 0,
  qualified_referrals integer not null default 0,
  pending_commission numeric(12,2) not null default 0,
  approved_commission numeric(12,2) not null default 0,
  paid_commission numeric(12,2) not null default 0,
  total_revenue_generated numeric(12,2) not null default 0,
  last_referral_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_partners_user_id on partners(user_id);
create index if not exists idx_partners_referral_code on partners(referral_code);

create table if not exists partner_referrals (
  id uuid default gen_random_uuid() primary key,
  partner_id uuid references partners(id) on delete cascade not null,
  referred_user_id uuid references auth.users(id) on delete set null,
  referred_email text,
  referred_name text,
  referral_code text not null,
  lead_source text,
  referral_status text not null default 'pending' check (referral_status in ('pending', 'qualified', 'converted', 'rejected', 'paid')),
  conversion_value numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  referred_at timestamp with time zone default timezone('utc'::text, now()) not null,
  converted_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_partner_referrals_partner_id on partner_referrals(partner_id);
create index if not exists idx_partner_referrals_referral_code on partner_referrals(referral_code);
create index if not exists idx_partner_referrals_referred_user_id on partner_referrals(referred_user_id);

alter table partners enable row level security;
alter table partner_referrals enable row level security;

create policy "Users can view own partner profile"
  on partners for select
  using (auth.uid() = user_id);

create policy "Users can insert own partner profile"
  on partners for insert
  with check (auth.uid() = user_id);

create policy "Users can update own partner profile"
  on partners for update
  using (auth.uid() = user_id);

create policy "Users can view own partner referrals"
  on partner_referrals for select
  using (
    exists (
      select 1
      from partners
      where partners.id = partner_referrals.partner_id
        and partners.user_id = auth.uid()
    )
  );
