# Activity Log Setup

## 1. Create the Table in Supabase

Go to your Supabase SQL Editor and run the SQL in `activity_log_schema.sql`:

```sql
create table public.activity_log (
  id bigserial primary key,
  user_hash text not null default '0'::text,
  sender_hash text not null default '0'::text,
  message text not null default ''::text,
  typeofmessage text not null default 'wakeup'::text,
  image text null,
  timestep timestamp with time zone not null default now()
) tablespace pg_default;

create index idx_activity_log_user_hash on public.activity_log(user_hash);
create index idx_activity_log_timestep on public.activity_log(timestep desc);
```

## 2. Enable Realtime (Important!)

In Supabase, go to **Database > Replication** and enable realtime for the `activity_log` table.

Or run this SQL:

```sql
alter publication supabase_realtime add table activity_log;
```

## 3. Test with Sample Data

Use the Supabase SQL Editor to insert test data:

```sql
insert into activity_log (user_hash, sender_hash, message, typeofmessage)
values
  ('0x742d35Cc6634C0532925a3b8', '0x742d35Cc6634C0532925a3b8', 'woke up at 6:30 AM and won $10!', 'wakeup'),
  ('0x89Ab23Ef5678C0532925a3b9', '0x89Ab23Ef5678C0532925a3b9', 'said: "Lets go! Easy money"', 'comment'),
  ('0x456f78Cd9012C0532925a3c0', '0x456f78Cd9012C0532925a3c0', 'joined a new game with $5 stake', 'bet');
```

## 4. How It Works

- `getActivityFeed()` - Fetches the latest 50 activity logs
- `addActivityLog()` - Adds a new activity to the feed
- `subscribeToActivityFeed()` - Real-time updates when new activities are added

The homescreen automatically:
- Loads the feed on mount
- Subscribes to real-time updates
- Shows new activities instantly when they're added

## Activity Types

- `wakeup` - User woke up and logged sleep
- `comment` - User posted a comment
- `bet` - User joined a game
- `win` - User won a game
- `loss` - User lost a game
- `proof` - User submitted proof (with image)
- `join` - User joined a cohort
