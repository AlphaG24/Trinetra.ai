create table if not exists public.tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  subject text not null,
  message text not null,
  status text default 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED'
  priority text default 'LOW', -- 'LOW', 'HIGH', 'CRITICAL'
  created_at timestamptz default now()
);

alter table public.tickets enable row level security;

create policy "Users manage own tickets" on public.tickets
  for all using (auth.uid() = user_id);
