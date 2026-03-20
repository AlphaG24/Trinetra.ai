-- Create a new storage bucket for audits
insert into storage.buckets (id, name, public)
values ('audits', 'audits', true)
on conflict (id) do nothing;

-- Enable RLS
alter table storage.objects enable row level security;

-- Policy: Allow authenticated uploads
create policy "Authenticated users can upload audits"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'audits' );

-- Policy: Allow authenticated users to view their own audits (or all, depending on need. For now, authenticated read all)
create policy "Authenticated users can select audits"
on storage.objects for select
to authenticated
using ( bucket_id = 'audits' );

-- Policy: Allow Service Role full access (for backend ingestion)
-- Service role bypasses RLS by default, but good to be explicit if needed. Usually not needed for service_role.
