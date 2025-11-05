# Stripe Integration - Server-Side Setup Guide

## Prerequisites
1. Stripe account (https://stripe.com)
2. Supabase project with Edge Functions enabled
3. Stripe API keys (test keys for development, live keys for production)

---

## Step 1: Get Your Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)

---

## Step 2: Add Stripe Secret Key to Supabase

Run this in your Supabase SQL Editor:

```sql
-- This stores your Stripe secret key securely
-- Replace 'your_stripe_secret_key_here' with your actual key
INSERT INTO vault.secrets (name, secret)
VALUES (
  'stripe_secret_key',
  'sk_test_xxxxxxxxxxxxxxxxxxxx'  -- Your Stripe secret key
);
```

---

## Step 3: Create Supabase Edge Function

### 3.1 Install Supabase CLI (if not already installed)
```bash
npm install -g supabase
```

### 3.2 Initialize Supabase Functions
```bash
# In your project root
supabase init

# Create the edge function
supabase functions new create-payment-intent
```

### 3.3 Create the Edge Function Code

Create/edit: `supabase/functions/create-payment-intent/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Stripe secret key from Supabase secrets
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!stripeKey) {
      throw new Error('Stripe secret key not found')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Parse request body
    const { amount } = await req.json()

    if (!amount || amount < 500) {
      return new Response(
        JSON.stringify({ error: 'Amount must be at least $5.00' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Step 4: Deploy the Edge Function

```bash
# Login to Supabase (if not already logged in)
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set the Stripe secret key as an environment variable
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx

# Deploy the function
supabase functions deploy create-payment-intent
```

---

## Step 5: Add Publishable Key to Your React Native App

Create/edit: `.env` file in your project root:

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
```

Then update your `app/_layout.tsx` or main app file to initialize Stripe:

```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

// Inside your app component
<StripeProvider
  publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
  merchantIdentifier="merchant.com.yourapp" // Required for Apple Pay
>
  {/* Your app content */}
</StripeProvider>
```

---

## Step 6: Test the Integration

### Test Credit Card Numbers (Stripe provides these for testing):
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`

Use any:
- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

---

## Step 7: Set Up Webhooks (Optional but Recommended)

Webhooks ensure payment success is confirmed even if the user closes the app.

### 7.1 Create Webhook Edge Function

```bash
supabase functions new stripe-webhook
```

Create: `supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !stripeKey || !webhookSecret) {
    return new Response('Missing required headers or secrets', { status: 400 })
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Handle successful payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object

      // You can update database here if needed
      console.log('Payment succeeded:', paymentIntent.id)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

### 7.2 Deploy webhook function
```bash
supabase functions deploy stripe-webhook
```

### 7.3 Register webhook in Stripe Dashboard
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://[your-project-ref].supabase.co/functions/v1/stripe-webhook`
4. Events: Select `payment_intent.succeeded`
5. Copy the webhook signing secret
6. Add it to Supabase:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

---

## Step 8: Production Checklist

Before going live:
- [ ] Replace test keys with live keys (both secret and publishable)
- [ ] Update `STRIPE_SECRET_KEY` in Supabase secrets
- [ ] Update `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in your app
- [ ] Test with real payment methods
- [ ] Set up webhook endpoint with live keys
- [ ] Enable proper error logging
- [ ] Add proper receipts/email confirmations
- [ ] Review Stripe dashboard for any security recommendations

---

## Troubleshooting

### "Failed to create payment intent"
- Check that `STRIPE_SECRET_KEY` is set in Supabase secrets
- Verify the secret key is valid and not expired
- Check Supabase function logs: `supabase functions logs create-payment-intent`

### "Card declined"
- In test mode, use test card numbers from Step 6
- In production, ask user to contact their bank

### Payments succeed but balance doesn't update
- Check RLS policies on `transactions` and user balance tables
- Verify the `deposit()` function is being called correctly
- Check for errors in the app console

---

## Quick Command Reference

```bash
# View function logs
supabase functions logs create-payment-intent

# Update secret key
supabase secrets set STRIPE_SECRET_KEY=sk_xxx

# List all secrets
supabase secrets list

# Redeploy function
supabase functions deploy create-payment-intent
```

---

## Need Help?
- Stripe Docs: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Stripe Testing: https://stripe.com/docs/testing
