-- 1. Fix Missing DELETE Policy for Chat Sessions
create policy "Users can delete own sessions"
  on public.chat_sessions for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2. Ensure Chat Messages can be inserted (System messages included)
-- Sometimes strict checks fail if the session lookup has issues, though it shouldn't.
-- Let's reinforce the insert policy.
drop policy if exists "Users can insert messages to own sessions" on public.chat_messages;

create policy "Users can insert messages to own sessions"
  on public.chat_messages for insert
  to authenticated
  with check (
    -- Allow if the session belongs to the user
    exists (
      select 1 from public.chat_sessions
      where id = chat_messages.session_id
      and user_id = auth.uid()
    )
  );

-- 3. Allow Deleting Messages (Cascade usually handles this, but good to have)
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

-- 4. Verify Role Constraint (Just in case it was created wrong manually)
alter table public.chat_messages drop constraint if exists chat_messages_role_check;
alter table public.chat_messages add constraint chat_messages_role_check 
  check (role in ('user', 'system'));
