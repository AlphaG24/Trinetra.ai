-- 1. Add missing 'source' column to chat_messages
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'chat_messages' and column_name = 'source') then
    alter table public.chat_messages add column source text;
  end if;
end $$;

-- 2. Enable RLS
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- 3. Fix Policies for Deleting and Inserting
-- Re-create DELETE policy for sessions
drop policy if exists "Users can delete own sessions" on public.chat_sessions;
create policy "Users can delete own sessions"
  on public.chat_sessions for delete
  to authenticated
  using (auth.uid() = user_id);

-- Re-create INSERT policy for messages
drop policy if exists "Users can insert messages to own sessions" on public.chat_messages;
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

-- Re-create DELETE policy for messages
drop policy if exists "Users can delete own messages" on public.chat_messages;
create policy "Users can delete own messages"
  on public.chat_messages for delete
  to authenticated
  using (
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
