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

    console.log('Received amount:', amount, 'userHash:', userHash)

    // Amount is in dollars, convert to cents
    const amountInCents = Math.round(amount * 100)

    console.log('Amount in cents:', amountInCents)

    if (amountInCents < 500) {
      return new Response(
        JSON.stringify({ error: 'Amount must be at least $5.00' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amountInCents > 1000000) {
      return new Response(
        JSON.stringify({ error: 'Amount must be less than $10,000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Checkout Session with single line item
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Deposit $${amount.toFixed(2)}`,
              description: 'Add funds to your account',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'snoozeapp://profile?success=true',
      cancel_url: 'snoozeapp://profile?cancelled=true',
      metadata: {
        userHash: userHash,
      },
    })

    console.log('Session created:', session.id)

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
