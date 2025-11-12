# Security Setup Guide

## What This Script Does

The `enable_rls_security.sql` script protects your database from attacks by:

1. **Enabling Row Level Security (RLS)** on all tables
2. **Creating secure policies** that control who can read/write data
3. **Adding balance audit logging** to track all money movements
4. **Maintaining full functionality** - your app works exactly the same!

## How to Apply Security

### Step 1: Run the Database Migrations (in order)

Open your Supabase SQL Editor and run these files in order:

1. **First:** `add_game_id_to_activity_log.sql` (for stake slashing)
2. **Second:** `enable_rls_security.sql` (this one - for security)

### Step 2: Verify RLS is Enabled

After running the script, check the output at the bottom. You should see:

```
✅ All 8 tables now have rowsecurity = true
✅ Multiple policies created for each table
```

### Step 3: Test Your App

Your app should work exactly the same! The security happens in the background.

## What's Protected

### 🛡️ Balance Table (hash_to_value)
- **Most Critical** - This is your money!
- All balance changes are now logged in `balance_audit_log`
- You can review suspicious activity anytime

### 🎮 Game Tables
- **games** - Anyone can view, authenticated users can create/update
- **game_players** - Public transparency, system controls membership
- **game_submissions** - Immutable proofs (can't be edited or deleted)
- **game_logs** - Public activity logs

### 📱 User Tables
- **profiles** - Public read (for leaderboard), authenticated write
- **activity_log** - Public feed, authenticated users can post
- **home_page_top** - Public feed

## Security Features Added

### 1. Balance Auditing
Every time a balance changes, it's logged:
```sql
SELECT * FROM balance_audit_log ORDER BY timestamp DESC LIMIT 10;
```

This helps you catch:
- Unauthorized deposits
- Suspicious withdrawals
- Balance manipulation attempts

### 2. Immutable Proofs
Once a proof is submitted, it can NEVER be:
- Edited
- Deleted
- Modified

This prevents cheating!

### 3. Role-Based Access
- **anon** role: For unauthenticated users (read-only on most things)
- **authenticated** role: For logged-in users (can write data)
- **service_role** role: For your backend code only (full access)

## What Attacks Are Prevented

✅ **SQL Injection** - RLS policies filter all queries
✅ **Unauthorized Balance Changes** - Audited and controlled
✅ **Proof Tampering** - Submissions are immutable
✅ **Mass Data Deletion** - Policies prevent bulk deletes
✅ **Fake Game Manipulation** - Status changes are controlled

## Important: Key Management

### ⚠️ NEVER EXPOSE THESE:
- ❌ `service_role` key - Keep this secret, only use in secure backend
- ❌ Database password

### ✅ SAFE TO USE IN APP:
- ✅ `anon` key - This is public-facing, it's safe
- ✅ Your Supabase URL

## Monitoring Your Database

### Check Balance Changes
```sql
-- See all balance changes in last 24 hours
SELECT * FROM balance_audit_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

### Check for Suspicious Activity
```sql
-- Look for large balance changes
SELECT * FROM balance_audit_log
WHERE ABS(new_value - old_value) > 100
ORDER BY timestamp DESC;
```

### Check RLS Status
```sql
-- Verify RLS is still enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'hash_to_value', 'games');
```

## Troubleshooting

### "Permission Denied" Errors

If users can't access data after enabling RLS:

1. **Check your Supabase client setup:**
   ```typescript
   // Make sure you're using the anon key, not service role
   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```

2. **Verify policies are active:**
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

3. **Check grants:**
   ```sql
   -- Should show permissions for anon and authenticated roles
   SELECT grantee, privilege_type, table_name
   FROM information_schema.role_table_grants
   WHERE table_schema = 'public';
   ```

### App Still Working After RLS?

**This is GOOD!**

The security is invisible to your app. The policies allow legitimate operations while blocking malicious ones.

## Additional Security Recommendations

### 1. Rate Limiting (Recommended)
Add rate limiting for sensitive operations:
- Max 1 proof submission per user per day per game
- Max 10 game creations per user per day
- Max 100 balance queries per user per hour

Can be done via Supabase Edge Functions or your API layer.

### 2. IP Logging (Optional)
Track IP addresses for balance changes:
```sql
ALTER TABLE balance_audit_log ADD COLUMN ip_address TEXT;
```

### 3. Two-Factor for Large Withdrawals (Optional)
For withdrawals over $100, require additional verification.

### 4. Regular Audits
Review `balance_audit_log` weekly for:
- Unusual patterns
- Large transactions
- Rapid balance changes
- Same IP making many changes

## Rollback (If Needed)

If something breaks, you can disable RLS temporarily:

```sql
-- EMERGENCY ONLY - This removes protection!
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE hash_to_value DISABLE ROW LEVEL SECURITY;
-- ... repeat for other tables
```

But **find and fix the issue** rather than leaving RLS disabled!

## Summary

✅ **Run** `enable_rls_security.sql` in Supabase SQL Editor
✅ **Verify** all tables show `rowsecurity = true`
✅ **Test** your app - everything should work the same
✅ **Monitor** `balance_audit_log` regularly
✅ **Keep** your service_role key secret

Your database is now protected! 🔐
