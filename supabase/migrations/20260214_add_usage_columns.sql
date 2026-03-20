-- Add usage tracking columns to profiles
alter table profiles 
add column if not exists seconds_used_this_month integer default 0,
add column if not exists monthly_limit_seconds integer default 600; -- Default 10 mins for free tier

-- Add index for faster lookups if needed (though PK is usually enough)
-- create index if not exists idx_profiles_usage on profiles(seconds_used_this_month);
