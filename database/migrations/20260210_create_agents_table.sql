-- Create 'agents' table for users' deployed agents
create table if not exists agents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  role text,
  status text default 'online' check (status in ('online', 'offline', 'error')),
  voice text,
  vapi_id text,
  image_url text, -- For avatar/orb
  stats jsonb default '{"calls": 0, "avg_time": "0m 0s"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table agents enable row level security;

create policy "Users can view own agents" on agents for select using (auth.uid() = user_id);
create policy "Users can insert own agents" on agents for insert with check (auth.uid() = user_id);
create policy "Users can update own agents" on agents for update using (auth.uid() = user_id);
create policy "Users can delete own agents" on agents for delete using (auth.uid() = user_id);
