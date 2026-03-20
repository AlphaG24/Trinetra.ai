-- Create available_agents table
create table if not exists available_agents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  description text,
  status text check (status in ('Active', 'Coming Soon')),
  icon_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Optional but recommended)
alter table available_agents enable row level security;

create policy "Enable read access for all users" on available_agents
  for select using (true);

-- Insert dummy data
insert into available_agents (name, slug, description, status, icon_name) values
  ('Trinetra Auditor', 'auditor', 'AI Audit & Compliance Agent', 'Active', 'FileText'),
  ('Nexus Lead Hunter', 'nexus', 'Automated Lead Generation', 'Coming Soon', 'Search'),
  ('Aura Receptionist', 'aura', 'AI Voice Receptionist', 'Coming Soon', 'Headphones')
on conflict (slug) do nothing;
