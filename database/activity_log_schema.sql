-- Activity Log Table - Simple schema matching home_page_top pattern
-- Run this in Supabase SQL Editor

create table public.activity_log (
  id bigserial primary key,
  user_hash text not null default '0'::text,
  sender_hash text not null default '0'::text,
  message text not null default ''::text,
  typeofmessage text not null default 'wakeup'::text,
  image text null,
  timestep timestamp with time zone not null default now()
) tablespace pg_default;

-- Create index on user_hash for efficient queries
create index idx_activity_log_user_hash on public.activity_log(user_hash);

-- Create index on timestep for chronological ordering
create index idx_activity_log_timestep on public.activity_log(timestep desc);
