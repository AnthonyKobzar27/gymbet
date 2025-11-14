import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Manual webhook signature verification (works in Deno Edge Runtime)
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const signatureParts = signature.split(',')
  const timestamp = signatureParts.find(part => part.startsWith('t='))?.split('=')[1]
  const signatures = signatureParts.filter(part => part.startsWith('v1='))

  if (!timestamp || signatures.length === 0) {
    return false
  }

  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  )

  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return signatures.some(sig => {
    const providedSignature = sig.split('=')[1]
    return providedSignature === expectedSignature
  })
}

serve(async (req) => {
  console.log('🎯 Webhook request received')

  const signature = req.headers.get('stripe-signature')
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!signature) {
    console.error('❌ Missing stripe-signature header')
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.text()
    console.log('📦 Received body, length:', body.length)

    // Manually verify webhook signature
    const isValid = await verifyStripeSignature(body, signature, webhookSecret)
    if (!isValid) {
      console.error('❌ Invalid signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Signature verified')

    // Parse the event
    const event = JSON.parse(body)
    console.log(`📥 Webhook event: ${event.type} (${event.id})`)

    // Check for duplicate
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle()

    if (existingEvent) {
      console.log(`✅ Event ${event.id} already processed, skipping`)
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userHash = session.metadata?.userHash

      // Use desiredBalance from metadata (not amount_total!)
      // amount_total includes fees, desiredBalance is what user gets credited
      const desiredBalance = session.metadata?.desiredBalance
        ? parseFloat(session.metadata.desiredBalance)
        : session.amount_total ? session.amount_total / 100 : 0

      const totalPaid = session.amount_total ? session.amount_total / 100 : 0

      console.log(`💳 Payment: user=${userHash}`)
      console.log(`   Total paid: $${totalPaid}`)
      console.log(`   Crediting: $${desiredBalance}`)

      if (!userHash) {
        console.error('❌ Missing userHash in metadata')
        await supabase.from('webhook_events').insert({
          stripe_event_id: event.id,
          event_type: event.type,
          amount: totalPaid,
          metadata: { error: 'Missing userHash' }
        })
        return new Response(JSON.stringify({ error: 'Invalid metadata' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (desiredBalance <= 0) {
        console.error(`❌ Invalid amount: ${desiredBalance}`)
        return new Response(JSON.stringify({ error: 'Invalid amount' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Get user_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('hash', userHash)
        .maybeSingle()

      if (profileError || !profile?.user_id) {
        console.error('❌ Failed to get user_id:', profileError)
        await supabase.from('webhook_events').insert({
          stripe_event_id: event.id,
          event_type: event.type,
          user_hash: userHash,
          amount: desiredBalance,
          metadata: { error: 'User not found', session_id: session.id, totalPaid: totalPaid }
        })
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      console.log(`👤 Found user: ${profile.user_id}`)

      // Update balance atomically (credit desiredBalance, not totalPaid!)
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_balance_atomic', {
          p_user_id: profile.user_id,
          p_user_hash: userHash,
          p_delta: desiredBalance,
          p_transaction_type: 'deposit',
          p_description: `Stripe deposit $${desiredBalance.toFixed(2)} (paid $${totalPaid.toFixed(2)} inc. fees) (${session.id})`
        })

      if (updateError || !updateResult?.success) {
        console.error('❌ Failed to update balance:', updateError || updateResult?.error)
        await supabase.from('webhook_events').insert({
          stripe_event_id: event.id,
          event_type: event.type,
          user_hash: userHash,
          amount: desiredBalance,
          metadata: {
            error: updateError?.message || updateResult?.error,
            session_id: session.id,
            totalPaid: totalPaid,
            credited: desiredBalance
          }
        })
        return new Response(JSON.stringify({
          error: 'Failed to update balance',
          details: updateError?.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      console.log(`✅ Balance updated!`)
      console.log(`   Old: $${updateResult.old_balance}`)
      console.log(`   New: $${updateResult.new_balance}`)
      console.log(`   Transaction: ${updateResult.transaction_id}`)

      // Record successful webhook
      await supabase.from('webhook_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        user_hash: userHash,
        amount: desiredBalance,
        metadata: {
          session_id: session.id,
          transaction_id: updateResult.transaction_id,
          old_balance: updateResult.old_balance,
          new_balance: updateResult.new_balance,
          totalPaid: totalPaid,
          credited: desiredBalance
        }
      })
    }

    // Return 200 OK
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(JSON.stringify({
      received: true,
      error: error.message,
      note: 'Error logged'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
