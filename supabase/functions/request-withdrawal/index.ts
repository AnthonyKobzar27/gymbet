import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get user from auth header
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { amount, userHash } = await req.json()

    console.log(`=� Withdrawal request: user=${user.id}, amount=$${amount}`)

    // =========================================================================
    // VALIDATION
    // =========================================================================

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be greater than $0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount < 0.50) {
      return new Response(
        JSON.stringify({ error: 'Minimum withdrawal amount is $0.50' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount > 10000) {
      return new Response(
        JSON.stringify({ error: 'Maximum withdrawal amount is $10,000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // RATE LIMITING: Max 5 withdrawals per day
    // =========================================================================

    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: user.id,
        p_action_type: 'withdrawal',
        p_max_count: 5,
        p_window_minutes: 1440 // 24 hours
      })

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError)
      // Continue anyway - don't block user due to rate limit failure
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: `Withdrawal limit exceeded. You can make ${rateLimitResult.max_count} withdrawals per day.`,
          retry_after_hours: 24
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // CHECK BALANCE
    // =========================================================================

    const { data: balanceData, error: balanceError } = await supabase
      .from('hash_to_value')
      .select('value')
      .eq('user_id', user.id)
      .eq('hash', userHash)
      .maybeSingle()

    if (balanceError || !balanceData) {
      return new Response(
        JSON.stringify({ error: 'Failed to get balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentBalance = balanceData.value || 0

    if (currentBalance < amount) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient balance',
          current_balance: currentBalance,
          requested: amount
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // DEDUCT BALANCE ATOMICALLY
    // =========================================================================

    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_balance_atomic', {
        p_user_id: user.id,
        p_user_hash: userHash,
        p_delta: -amount,
        p_transaction_type: 'withdrawal',
        p_description: `Withdrawal request $${amount.toFixed(2)}`
      })

    if (updateError || !updateResult?.success) {
      console.error('Failed to deduct balance:', updateError || updateResult?.error)
      return new Response(
        JSON.stringify({
          error: 'Failed to process withdrawal',
          details: updateError?.message || updateResult?.error
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(` Balance deducted: ${userHash}`)
    console.log(`   Old: $${updateResult.old_balance}`)
    console.log(`   New: $${updateResult.new_balance}`)
    console.log(`   Transaction ID: ${updateResult.transaction_id}`)

    // =========================================================================
    // CREATE WITHDRAWAL REQUEST
    // =========================================================================

    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        user_hash: userHash,
        amount: amount,
        status: 'pending'
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error('Failed to create withdrawal request:', withdrawalError)
      // Try to refund the balance
      await supabase.rpc('update_balance_atomic', {
        p_user_id: user.id,
        p_user_hash: userHash,
        p_delta: amount,
        p_transaction_type: 'deposit',
        p_description: `Refund: Failed withdrawal request`
      })
      return new Response(
        JSON.stringify({ error: 'Failed to create withdrawal request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // RETURN SUCCESS
    // =========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: withdrawalRequest.id,
        amount: amount,
        new_balance: updateResult.new_balance,
        status: 'pending',
        estimated_processing: '1-3 business days',
        message: 'Withdrawal request submitted successfully. Funds will be processed within 1-3 business days.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('L Withdrawal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
