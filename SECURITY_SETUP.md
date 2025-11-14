# 🔐 CRITICAL SECURITY SETUP GUIDE

**IMPORTANT:** Your API keys were committed to Git history on October 28, 2025 (commit `886f972`). Follow this guide to secure your application.

---

## 🚨 IMMEDIATE ACTIONS REQUIRED

### 1. Rotate ALL API Keys (Do This First!)

#### **Stripe Keys:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Click "Reveal test key" for your Secret Key
3. Click "Roll key" to generate a new secret key
4. Copy the new key and update your `.env` file
5. Update the webhook secret:
   - Go to https://dashboard.stripe.com/test/webhooks
   - Find your webhook endpoint
   - Click "⋮" → "Reveal signing secret" → "Roll secret"
   - Update `STRIPE_WEBHOOK_SECRET` in `.env`

#### **Supabase Keys:**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Click "Reset" next to Service Role Key
3. Copy the new key and update `SUPABASE_SERVICE_KEY` in `.env`
4. **NEVER** commit the service role key to Git!

---

### 2. Remove .env from Git History

Your `.env` file is in Git history. Remove it permanently:

```bash
# Install git-filter-repo if needed
# Windows: download from https://github.com/newren/git-filter-repo/releases
# Mac: brew install git-filter-repo
# Linux: pip3 install git-filter-repo

# Backup your repository first!
cd ..
cp -r snooze-app-actual snooze-app-actual-backup

# Remove .env from all commits
cd snooze-app-actual
git filter-repo --invert-paths --path .env --force

# If you've already pushed to remote, you'll need to force push
git push origin --force --all
git push origin --force --tags
```

**⚠️ WARNING:** Force pushing rewrites history. Make sure all team members know to re-clone the repo after this.

**Alternative (if you can't rewrite history):**
- Consider the old keys compromised forever
- Rotate keys immediately
- Monitor for unauthorized usage
- Consider creating a new Stripe account if concerned

---

### 3. Verify .gitignore is Working

Check that .env is properly ignored:

```bash
git status
```

You should **NOT** see `.env` in the output. If you do:

```bash
# Remove .env from tracking (keeps local file)
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

---

### 4. Set Environment Variables in Supabase Edge Functions

Your Edge Functions need these environment variables:

```bash
# Navigate to Supabase dashboard
# Go to: Edge Functions → Settings → Secrets

# Add these secrets:
STRIPE_SECRET_KEY=sk_test_YOUR_NEW_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_SERVICE_ROLE_KEY
```

---

## 📋 DEPLOYMENT CHECKLIST

Before running your app in production:

- [ ] Rotated all Stripe API keys
- [ ] Rotated all Supabase API keys
- [ ] Removed .env from Git history (or accepted keys are compromised)
- [ ] Verified .env is in .gitignore
- [ ] Set environment variables in Supabase Edge Functions dashboard
- [ ] Run database migrations (see below)
- [ ] Test deposits with new Stripe keys
- [ ] Test withdrawals with new setup
- [ ] Monitor webhook logs for errors

---

## 🗄️ DATABASE MIGRATION STEPS

Run these SQL scripts in order via Supabase SQL Editor:

### Step 1: Apply Security Fixes
```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Create new query
# 3. Paste contents of: database/security_fix_migration.sql
# 4. Click "Run"
```

### Step 2: Populate User IDs for Existing Data
```bash
# In Supabase SQL Editor:
# 1. Create new query
# 2. Paste contents of: database/populate_user_ids_migration.sql
# 3. Click "Run"
```

### Step 3: Verify Migration Success
```sql
-- Run this to check if any records are missing user_id:
SELECT 'profiles' AS table_name, COUNT(*) AS missing_user_id
FROM public.profiles
WHERE user_id IS NULL
UNION ALL
SELECT 'hash_to_value', COUNT(*)
FROM public.hash_to_value
WHERE user_id IS NULL
UNION ALL
SELECT 'transactions', COUNT(*)
FROM public.transactions
WHERE user_id IS NULL;

-- Result should be all zeros!
```

---

## 🔒 WHAT WAS FIXED

### 1. Database Security (RLS Policies)
**Before:**
```sql
-- ❌ INSECURE: Any user could access ANY balance
CREATE POLICY "balance_update" ON hash_to_value
  FOR UPDATE USING (true);
```

**After:**
```sql
-- ✅ SECURE: Users can ONLY access their own balance
CREATE POLICY "balance_update_own" ON hash_to_value
  FOR UPDATE USING (auth.uid() = user_id);
```

### 2. Webhook Idempotency
- Added `webhook_events` table to track processed webhooks
- Prevents duplicate deposits if Stripe sends webhook twice
- Eliminates "free money" vulnerability

### 3. Race Condition Protection
- Created `update_balance_atomic()` function
- Uses database-level row locking (`FOR UPDATE`)
- Prevents negative balances from concurrent requests

### 4. Withdrawal System
- Created `request-withdrawal` Edge Function
- Added `withdrawal_requests` table for tracking
- Implements rate limiting (5 withdrawals per day)
- **NOTE:** Still requires Stripe Refunds/Payouts setup (see below)

### 5. Authentication & Authorization
- Added user verification to `create-checkout-session`
- Verifies user_hash matches authenticated user
- Prevents users from creating checkout sessions for others

### 6. Rate Limiting
- Created `rate_limits` table and `check_rate_limit()` function
- Limits: 10 deposits/day, 5 withdrawals/day
- Prevents abuse and excessive API usage

---

## 💰 STRIPE REFUNDS SETUP (Required for Withdrawals)

Your app currently deducts balance but doesn't send money back to users. You need to:

### Option 1: Store Payment Intent IDs (Recommended)
```typescript
// In stripe-webhook/index.ts, when processing deposit:
const session = event.data.object
const payment_intent_id = session.payment_intent // Store this!

// Add to transactions table:
await supabase.from('transactions').insert({
  user_id: profile.user_id,
  user_hash: userHash,
  type: 'deposit',
  amount: amountPaid,
  stripe_payment_intent_id: payment_intent_id, // Add this column
  description: `Deposited $${amountPaid.toFixed(2)}`
})

// Then in request-withdrawal/index.ts:
const { data: recentDeposit } = await supabase
  .from('transactions')
  .select('stripe_payment_intent_id')
  .eq('user_id', user.id)
  .eq('type', 'deposit')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (recentDeposit?.stripe_payment_intent_id) {
  const refund = await stripe.refunds.create({
    payment_intent: recentDeposit.stripe_payment_intent_id,
    amount: Math.round(amount * 100), // cents
  })
}
```

### Option 2: Use Stripe Connect (For Payouts)
- Set up Stripe Connect: https://stripe.com/docs/connect
- Use Stripe Payouts API to send money directly to users
- Requires users to connect their bank accounts

### Option 3: Manual Processing (Current Setup)
- Withdrawals create pending requests in `withdrawal_requests` table
- You manually process via Stripe Dashboard
- Works for low volume, not scalable

**Recommended:** Implement Option 1 if your app will have regular withdrawals.

---

## 🔍 MONITORING & SECURITY

### Check Audit Logs Regularly
```sql
-- View recent balance changes
SELECT * FROM balance_audit_log
ORDER BY timestamp DESC
LIMIT 100;

-- Check for suspicious patterns
SELECT user_hash, COUNT(*) as change_count,
       SUM(new_value - old_value) as total_change
FROM balance_audit_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_hash
HAVING COUNT(*) > 20  -- More than 20 changes in 24h is suspicious
ORDER BY change_count DESC;
```

### Monitor Webhook Events
```sql
-- Check for duplicate webhook attempts
SELECT stripe_event_id, COUNT(*) as attempts
FROM webhook_events
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;

-- Check failed webhook processing
SELECT * FROM webhook_events
WHERE metadata->>'error' IS NOT NULL
ORDER BY processed_at DESC;
```

### Check Rate Limit Violations
```sql
-- Users hitting rate limits
SELECT user_id, action_type, SUM(action_count) as total_attempts
FROM rate_limits
WHERE window_start > NOW() - INTERVAL '24 hours'
GROUP BY user_id, action_type
ORDER BY total_attempts DESC;
```

---

## 🧪 TESTING YOUR SECURITY FIXES

### Test 1: Verify RLS Policies Work
```typescript
// Try to access another user's balance (should FAIL)
const { data, error } = await supabase
  .from('hash_to_value')
  .select('value')
  .eq('hash', 'SOMEONE_ELSES_HASH')

// Should return error: "new row violates row-level security policy"
```

### Test 2: Test Webhook Idempotency
```bash
# Send same webhook twice using Stripe CLI
stripe trigger checkout.session.completed

# Check webhook_events table - should only have 1 entry per event
```

### Test 3: Test Rate Limiting
```typescript
// Try to create 11 deposit sessions in a row
// The 11th should fail with 429 status
for (let i = 0; i < 11; i++) {
  await createCheckoutSession({ amount: 10, userHash })
}
```

### Test 4: Test Race Conditions
```typescript
// Try concurrent withdrawals that would exceed balance
Promise.all([
  withdraw(userHash, 50), // Balance: $50
  withdraw(userHash, 50), // Should fail
])
// One should succeed, one should fail with "Insufficient balance"
```

---

## 📚 ADDITIONAL RESOURCES

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe Refunds API](https://stripe.com/docs/api/refunds)
- [Git Filter Repo](https://github.com/newren/git-filter-repo)

---

## 🆘 TROUBLESHOOTING

**Error: "new row violates row-level security policy"**
- This means RLS is working! User tried to access data they shouldn't
- Check that your Edge Functions use `service_role` key, not `anon` key

**Error: "Function update_balance_atomic does not exist"**
- Run the `security_fix_migration.sql` script
- Verify it completed without errors

**Webhooks not working after key rotation:**
- Update webhook secret in Supabase Edge Functions dashboard
- Update Stripe webhook endpoint URL if it changed
- Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs

**Users can't deposit/withdraw:**
- Check that Edge Functions have correct environment variables
- Verify Stripe keys are not expired/revoked
- Check Edge Function logs for errors

---

## ✅ SECURITY CHECKLIST

After completing this guide, verify:

- [ ] All API keys rotated and new keys stored securely
- [ ] Old .env removed from Git history (or keys considered compromised)
- [ ] Database migrations completed successfully
- [ ] RLS policies preventing unauthorized access (tested)
- [ ] Webhook idempotency working (tested)
- [ ] Rate limiting working (tested)
- [ ] Edge Functions have correct environment variables
- [ ] Deposits working with new Stripe keys
- [ ] Withdrawals creating proper requests
- [ ] Monitoring queries set up
- [ ] Team members notified of security changes

---

**Last Updated:** 2025-11-13
**Security Level:** CRITICAL - Must complete before production deployment
