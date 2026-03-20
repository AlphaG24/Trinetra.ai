-- Create user_api_settings table
create table if not exists user_api_settings (
  user_id uuid references auth.users not null primary key,
  api_key text unique not null,
  tier text default 'PROTOCOL',
  requests_used int default 0,
  request_limit int default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table user_api_settings enable row level security;

create policy "Users can view own settings" on user_api_settings
  for select using (auth.uid() = user_id);

create policy "Users can update own settings" on user_api_settings
  for update using (auth.uid() = user_id);
