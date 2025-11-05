# Quick Start - What You Need To Do Now

## ✅ Already Done (In Your Code)
- PaymentModal with Stripe integration
- Balance tracking system
- Stake deduction on game join
- Stake redistribution logic
- Keyboard dismissal on payment modal
- StripeProvider wrapper in app

---

## 🚀 What You Need To Do (Server Side)

### 1. Get Stripe Keys (5 minutes)
1. Go to https://dashboard.stripe.com/register (or login)
2. Get your keys from https://dashboard.stripe.com/apikeys
   - **Secret Key**: `sk_test_...` (keep this private!)
   - **Publishable Key**: `pk_test_...` (safe to use in app)

---

### 2. Create `.env` File (2 minutes)
Create a file called `.env` in your project root:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

Replace `pk_test_your_actual_key_here` with your actual publishable key from Stripe.

---

### 3. Set Up Supabase Edge Function (15 minutes)

#### Option A: Using Supabase Dashboard (Easiest)
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. Click **"New Function"**
4. Name it: `create-payment-intent`
5. Paste this code:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('Stripe secret key not found')

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { amount } = await req.json()
    if (!amount || amount < 500) {
      return new Response(
        JSON.stringify({ error: 'Amount must be at least $5.00' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
    })

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

6. Click **"Deploy"**
7. Go to **Settings** → **Edge Function Secrets**
8. Add a new secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: Your Stripe secret key (`sk_test_...`)

#### Option B: Using CLI
See the full `STRIPE_SETUP_GUIDE.md` for CLI instructions.

---

### 4. Test It! (5 minutes)

1. Restart your app: `npm start` or `expo start`
2. Click the **"Deposit"** button in your app
3. Enter an amount (e.g., $10)
4. Use test card: `4242 4242 4242 4242`
   - Expiry: `12/34` (any future date)
   - CVC: `123` (any 3 digits)
   - ZIP: `12345` (any 5 digits)
5. Click **"DEPOSIT NOW"**
6. Balance should update! 🎉

---

## 📝 Daily Missed Proof Check (Optional - Set Up Later)

For automatic elimination of players who miss their proofs, you'll need to set up a daily cron job.

**Quick version:**
- Create another Supabase Edge Function called `daily-check`
- Call `checkAndProcessMissedProofs()` from `game_utils.ts`
- Set up a cron job to run it daily (see `STRIPE_SETUP_GUIDE.md` for details)

**For now:** You can manually trigger it by calling `runDailyMissedProofCheck()` from `lib/admin_utils.ts`

---

## ⚠️ Common Issues

### "No client secret returned"
- Make sure you added `STRIPE_SECRET_KEY` to Supabase Edge Function secrets
- Check the Edge Function logs in Supabase dashboard

### "Payment failed"
- Make sure you're using test card `4242 4242 4242 4242` in test mode
- Check that `.env` file has the correct publishable key

### Keyboard won't dismiss
- This is now fixed! Tap outside the input fields

### Balance not updating
- Check RLS policies on `transactions` table in Supabase
- Make sure user is logged in

---

## 🎯 Summary: 3 Things to Do Right Now

1. **Get your Stripe keys** → Add publishable key to `.env`
2. **Create Supabase Edge Function** → Copy/paste the code above
3. **Test with card 4242 4242 4242 4242** → See if balance updates!

That's it! See `STRIPE_SETUP_GUIDE.md` for more details.
