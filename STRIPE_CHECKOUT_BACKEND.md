# Stripe Checkout Backend Setup (Multiple Price Options)

Your app now goes **straight to Stripe Checkout** when the user clicks "Deposit"!

The user will see multiple deposit options ($10, $25, $50, $100) in the Stripe Checkout page.

---

## What You Need to Do

### Step 1: Create Supabase Edge Function

Go to your Supabase Dashboard → **Edge Functions** → **New Function**

Name: `create-checkout-session`

Paste this code:

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
    if (!stripeKey) {
      throw new Error('Stripe secret key not found')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { amount, userHash } = await req.json()

    // If amount is 0, create session with multiple price options
    // Otherwise create session with specific amount
    let lineItems

    if (amount === 0 || !amount) {
      // Show multiple options: $10, $25, $50, $100
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Deposit $10',
            },
            unit_amount: 1000, // $10
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Deposit $25',
            },
            unit_amount: 2500, // $25
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Deposit $50',
            },
            unit_amount: 5000, // $50
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Deposit $100',
            },
            unit_amount: 10000, // $100
          },
          quantity: 1,
        },
      ]
    } else {
      // Single amount deposit
      if (amount < 500) {
        return new Response(
          JSON.stringify({ error: 'Amount must be at least $5.00' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Deposit $${(amount / 100).toFixed(2)}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ]
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'exp://localhost:8081/--/(tabs)/profile?success=true',
      cancel_url: 'exp://localhost:8081/--/(tabs)/profile?cancelled=true',
      metadata: {
        userHash: userHash,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Deploy** the function.

---

### Step 2: Set Stripe Secret Key

Go to **Settings** → **Edge Function Secrets**

Add:
- Name: `STRIPE_SECRET_KEY`
- Value: `sk_test_...` (your Stripe secret key)

---

### Step 3: Set Up Webhook (CRITICAL!)

The webhook updates the user's balance after payment succeeds.

#### Create Webhook Function

Create another Edge Function: `stripe-webhook`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!signature || !stripeKey || !webhookSecret) {
    return new Response('Missing headers or secrets', { status: 400 })
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabase = createClient(supabaseUrl!, supabaseKey!)

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userHash = session.metadata.userHash
      const amountPaid = session.amount_total / 100 // Convert cents to dollars

      console.log(`Payment successful for user ${userHash}: $${amountPaid}`)

      // Get current balance
      const { data: currentBalance } = await supabase
        .from('balances')
        .select('balance')
        .eq('user_hash', userHash)
        .single()

      const newBalance = (currentBalance?.balance || 0) + amountPaid

      // Update balance
      await supabase
        .from('balances')
        .upsert({
          user_hash: userHash,
          balance: newBalance,
        })

      // Add transaction record
      await supabase
        .from('transactions')
        .insert({
          user_hash: userHash,
          type: 'deposit',
          amount: amountPaid,
          description: `Deposited $${amountPaid.toFixed(2)}`,
          created_at: new Date().toISOString(),
        })

      console.log(`✅ Balance updated: ${userHash} -> $${newBalance}`)
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

**Deploy** the webhook function.

---

### Step 4: Register Webhook in Stripe

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Webhook URL: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
4. Events: Select `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **Signing Secret** (starts with `whsec_...`)
7. Add to Supabase Edge Function Secrets:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...`

---

## How It Works

1. User clicks **"Deposit"** button
2. Browser opens Stripe Checkout with **4 options: $10, $25, $50, $100**
3. User selects amount and pays with card
4. Stripe sends webhook to your backend
5. Backend updates user's balance automatically
6. User returns to app with updated balance! 🎉

---

## Test It!

1. Click "Deposit" in your app
2. You should see Stripe Checkout open with 4 deposit options
3. Select any amount
4. Use test card: `4242 4242 4242 4242`
5. Complete payment
6. Your balance updates! ✅

---

## Troubleshooting

### "No checkout URL returned"
- Check Edge Function logs for `create-checkout-session`
- Verify `STRIPE_SECRET_KEY` is set

### Balance doesn't update
- Check webhook is registered in Stripe Dashboard
- View webhook delivery logs in Stripe
- Check Edge Function logs for `stripe-webhook`
- Verify `STRIPE_WEBHOOK_SECRET` is correct

### Browser doesn't open
- Make sure you have `expo-web-browser` installed
- Run: `npx expo install expo-web-browser`

---

## Optional: Customize Amounts

Want different amounts? Edit line 34-64 in the Edge Function:

```typescript
lineItems = [
  {
    price_data: {
      currency: 'usd',
      product_data: { name: 'Deposit $5' },
      unit_amount: 500, // $5 in cents
    },
    quantity: 1,
  },
  // Add more options...
]
```

---

That's it! Super clean flow! 🚀
