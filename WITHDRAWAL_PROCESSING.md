# Withdrawal Processing Guide

## Overview

This app uses a **semi-automated withdrawal system**:
1. Users request withdrawals through the app
2. Their balance is immediately deducted from the database
3. Withdrawal requests are stored with `status: 'pending'`
4. **You (admin) process these withdrawals** using the admin tools below
5. The system automatically creates Stripe refunds and updates the database

## Setup

### 1. Add Admin Secret to Environment

Add this to your Supabase Edge Function secrets:

```bash
# In Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets
ADMIN_SECRET=your-secure-random-secret-here
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

Or use any long random string.

### 2. Deploy the Edge Function

```bash
npx supabase functions deploy process-withdrawals
```

## How to Process Withdrawals

### Method 1: Using the Admin Script (Recommended)

#### List pending withdrawals:
```bash
node scripts/process-withdrawals.js list
```

#### Process a specific withdrawal:
```bash
node scripts/process-withdrawals.js process <withdrawal_id>
```

#### Process all pending withdrawals at once:
```bash
node scripts/process-withdrawals.js process-all
```

### Method 2: Using cURL or API calls

#### List pending withdrawals:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-withdrawals \
  -H "Content-Type: application/json" \
  -d '{"action": "list", "adminSecret": "your-admin-secret"}'
```

#### Process a withdrawal:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-withdrawals \
  -H "Content-Type: application/json" \
  -d '{
    "action": "process",
    "withdrawalId": "uuid-here",
    "adminSecret": "your-admin-secret"
  }'
```

#### Process all pending:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-withdrawals \
  -H "Content-Type: application/json" \
  -d '{"action": "process_all", "adminSecret": "your-admin-secret"}'
```

## How It Works

### What happens when you process a withdrawal:

1. **Finds the user's most recent deposit** from the `webhook_events` table
2. **Retrieves the Stripe Checkout Session** to get the `payment_intent`
3. **Gets the charge ID** from the payment intent
4. **Creates a Stripe refund** for the withdrawal amount
5. **Updates the database** with:
   - `status: 'completed'`
   - `stripe_refund_id: 're_xxxxx'`
   - `processed_at: timestamp`

### If something fails:

- The withdrawal is marked as `status: 'failed'`
- The error message is stored in `error_message`
- **The user's balance is automatically refunded** so they don't lose money
- You can review failed withdrawals in the database

## Database Schema

### `withdrawal_requests` table:
- `id` - UUID (primary key)
- `user_id` - UUID (references auth.users)
- `user_hash` - TEXT
- `amount` - NUMERIC
- `status` - TEXT ('pending', 'processing', 'completed', 'failed')
- `stripe_refund_id` - TEXT (populated after processing)
- `requested_at` - TIMESTAMPTZ
- `processed_at` - TIMESTAMPTZ
- `error_message` - TEXT (if failed)

## Security Notes

1. **Admin Secret**: Keep your `ADMIN_SECRET` secure. Anyone with this secret can process withdrawals.
2. **Service Role Key**: The script uses the service role key to bypass RLS.
3. **Rate Limiting**: Users are limited to 5 withdrawals per day (configured in the request-withdrawal function).
4. **Balance Verification**: The system ensures users have sufficient balance before accepting withdrawal requests.
5. **Idempotency**: Each withdrawal can only be processed once.

## Monitoring

### Check pending withdrawals in Supabase:
```sql
SELECT * FROM withdrawal_requests WHERE status = 'pending' ORDER BY requested_at;
```

### Check failed withdrawals:
```sql
SELECT * FROM withdrawal_requests WHERE status = 'failed' ORDER BY requested_at DESC;
```

### View recent refunds:
```sql
SELECT * FROM withdrawal_requests WHERE status = 'completed' ORDER BY processed_at DESC LIMIT 10;
```

## Troubleshooting

### "No recent deposit found for this user"
- User has no deposit history in `webhook_events` table
- Manually refund via Stripe Dashboard and mark as completed in database

### "No charge found for payment intent"
- Payment was incomplete or failed
- Check Stripe Dashboard for the session
- Manually process or mark as failed

### "Insufficient funds to refund"
- The original charge amount is less than the withdrawal amount
- This shouldn't happen if your deposit/withdrawal logic is correct
- Review the user's transaction history

## Future Improvements

Consider implementing:
- Automated batch processing (cron job that runs daily)
- Webhook notifications when withdrawals are processed
- User notifications (email/push) when withdrawal is complete
- Admin dashboard UI for easier management
- Stripe Connect for direct payouts instead of refunds
