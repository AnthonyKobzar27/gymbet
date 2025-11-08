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
        .from('hash_to_value')
        .select('value')
        .eq('hash', userHash)
        .maybeSingle()

      const newBalance = (currentBalance?.value || 0) + amountPaid

      // Update balance
      await supabase
        .from('hash_to_value')
        .upsert({
          hash: userHash,
          value: newBalance,
        }, { onConflict: 'hash' })

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
