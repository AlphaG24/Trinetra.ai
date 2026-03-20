-- Create chat_sessions table
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null default 'New Analysis',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create chat_messages table
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'system')),
  content text not null,
  source text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Policies for chat_sessions
create policy "Users can view own sessions"
  on public.chat_sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.chat_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.chat_sessions for update
  to authenticated
  using (auth.uid() = user_id);

-- Policies for chat_messages
create policy "Users can view messages from own sessions"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );

create policy "Users can insert messages to own sessions"
  on public.chat_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );
