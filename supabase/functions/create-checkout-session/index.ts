import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error')
    }

    // =========================================================================
    // AUTHENTICATION: Verify user is logged in
    // =========================================================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { amount, userHash } = await req.json()

    console.log('Received amount:', amount, 'userHash:', userHash, 'user:', user.id)

    // =========================================================================
    // VERIFY USER HASH MATCHES AUTHENTICATED USER
    // =========================================================================
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('hash, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.hash !== userHash) {
      console.error('Hash mismatch:', profile.hash, '!=', userHash)
      return new Response(
        JSON.stringify({ error: 'Invalid user hash' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // RATE LIMITING: Max 10 deposit requests per day
    // =========================================================================
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: user.id,
        p_action_type: 'deposit',
        p_max_count: 10,
        p_window_minutes: 1440 // 24 hours
      })

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError)
      // Continue anyway - don't block user due to rate limit failure
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: `Deposit limit exceeded. You can make ${rateLimitResult.max_count} deposits per day.`,
          retry_after_hours: 24
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate fees
    // User wants X amount in their account
    // They must pay: X + Stripe fees (2.9% + $0.30) + Platform fee ($0.10)

    const desiredBalance = amount // What user wants in their account
    const stripeFeePercent = 0.029 // 2.9%
    const stripeFeeFixed = 0.30 // $0.30
    const platformFee = 0.10 // Your $0.10 cut

    // Calculate total Stripe fee
    const stripeFee = (desiredBalance * stripeFeePercent) + stripeFeeFixed

    // Total amount user must pay
    const totalCharge = desiredBalance + stripeFee + platformFee
    const totalChargeInCents = Math.round(totalCharge * 100)

    console.log('💰 Fee breakdown:')
    console.log(`   Desired balance: $${desiredBalance.toFixed(2)}`)
    console.log(`   Stripe fee: $${stripeFee.toFixed(2)}`)
    console.log(`   Platform fee: $${platformFee.toFixed(2)}`)
    console.log(`   Total charge: $${totalCharge.toFixed(2)}`)

    // Stripe minimum is $0.50 (50 cents)
    if (totalChargeInCents < 50) {
      return new Response(
        JSON.stringify({ error: 'Amount must be at least $0.50' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (totalChargeInCents > 1000000) {
      return new Response(
        JSON.stringify({ error: 'Amount must be less than $10,000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Checkout Session with fee breakdown
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Deposit $${desiredBalance.toFixed(2)}`,
              description: `Account credit: $${desiredBalance.toFixed(2)} + Processing fee: $${stripeFee.toFixed(2)} + Platform fee: $${platformFee.toFixed(2)}`,
            },
            unit_amount: totalChargeInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'snoozeapp://profile?success=true',
      cancel_url: 'snoozeapp://profile?cancelled=true',
      metadata: {
        userHash: userHash,
        desiredBalance: desiredBalance.toString(), // Amount to credit to user
        totalCharge: totalCharge.toString(), // Total they paid
        stripeFee: stripeFee.toFixed(2),
        platformFee: platformFee.toFixed(2),
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
