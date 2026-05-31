-- Create waitlist_entries table
create table if not exists waitlist_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  agent_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, agent_name)
);

-- RLS Policies
alter table waitlist_entries enable row level security;

create policy "Users can insert their own waitlist entries" on waitlist_entries
  for insert with check (auth.uid() = user_id);

create policy "Users can read their own waitlist entries" on waitlist_entries
  for select using (auth.uid() = user_id);
