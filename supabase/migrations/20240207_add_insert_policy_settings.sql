-- Add missing INSERT policy for user_api_settings
create policy "Users can insert own settings" on user_api_settings
  for insert with check (auth.uid() = user_id);
