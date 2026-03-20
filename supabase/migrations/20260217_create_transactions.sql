create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  amount numeric not null,
  description text,
  status text default 'completed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table transactions enable row level security;

-- Users can view their own transactions
create policy "Users can view own transactions" 
  on transactions for select 
  using (auth.uid() = user_id);

-- Admin (raghav@trinetra.ai) can view all transactions
-- Note: This hardcodes the admin email in the policy for simplicity as per the admin page logic
create policy "Admins can view all transactions" 
  on transactions for select 
  using (
    (select email from auth.users where id = auth.uid()) = 'raghav@trinetra.ai'
  );

-- Allow inserts for authenticated users (e.g. purchasing)
create policy "Users can insert own transactions" 
  on transactions for insert 
  with check (auth.uid() = user_id);
