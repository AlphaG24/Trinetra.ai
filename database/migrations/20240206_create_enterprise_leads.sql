-- Create enterprise_leads table
create table if not exists enterprise_leads (
  id uuid default gen_random_uuid() primary key,
  work_email text not null,
  company_name text not null,
  infrastructure_needs text not null,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table enterprise_leads enable row level security;

-- Allow anyone (anon) to insert leads
create policy "Anyone can insert enterprise leads" on enterprise_leads
  for insert with check (true);

-- Only authenticated staff (or service role) can view
create policy "Staff can view enterprise leads" on enterprise_leads
  for select using (auth.role() = 'service_role');
