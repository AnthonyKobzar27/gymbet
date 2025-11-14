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
    const adminSecret = Deno.env.get('ADMIN_SECRET') // Add this to your env

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // =========================================================================
    // ADMIN AUTHENTICATION
    // =========================================================================

    const { action, adminSecret: providedSecret, withdrawalId } = await req.json()

    // Check admin secret (simple auth for now)
    if (adminSecret && providedSecret !== adminSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid admin secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔧 Admin action: ${action}`)

    // =========================================================================
    // ACTION: List pending withdrawals
    // =========================================================================

    if (action === 'list') {
      const { data: withdrawals, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          id,
          user_id,
          user_hash,
          amount,
          status,
          requested_at,
          error_message
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch withdrawals:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch withdrawals' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          pending_count: withdrawals?.length || 0,
          withdrawals: withdrawals || []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =========================================================================
    // ACTION: Process a specific withdrawal
    // =========================================================================

    if (action === 'process') {
      if (!withdrawalId) {
        return new Response(
          JSON.stringify({ error: 'withdrawal_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`💰 Processing withdrawal: ${withdrawalId}`)

      // Get withdrawal request
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', withdrawalId)
        .single()

      if (fetchError || !withdrawal) {
        return new Response(
          JSON.stringify({ error: 'Withdrawal request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (withdrawal.status !== 'pending') {
        return new Response(
          JSON.stringify({
            error: `Withdrawal already ${withdrawal.status}`,
            withdrawal
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark as processing
      await supabase
        .from('withdrawal_requests')
        .update({ status: 'processing' })
        .eq('id', withdrawalId)

      console.log(`👤 User: ${withdrawal.user_hash}`)
      console.log(`💵 Amount: $${withdrawal.amount}`)

      // =========================================================================
      // Find the most recent successful payment for this user
      // =========================================================================

      try {
        // Get user's most recent deposit transaction with payment_intent
        const { data: recentDeposit, error: depositError } = await supabase
          .from('webhook_events')
          .select('metadata')
          .eq('user_hash', withdrawal.user_hash)
          .eq('event_type', 'checkout.session.completed')
          .order('processed_at', { ascending: false })
          .limit(1)
          .single()

        if (depositError || !recentDeposit?.metadata?.session_id) {
          throw new Error('No recent deposit found for this user')
        }

        console.log(`🔍 Found deposit session: ${recentDeposit.metadata.session_id}`)

        // Get the checkout session from Stripe to find the payment_intent
        const session = await stripe.checkout.sessions.retrieve(
          recentDeposit.metadata.session_id
        )

        if (!session.payment_intent) {
          throw new Error('No payment_intent found in session')
        }

        console.log(`💳 Payment Intent: ${session.payment_intent}`)

        // Get the payment intent to find the charge
        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent as string
        )

        if (!paymentIntent.latest_charge) {
          throw new Error('No charge found for payment intent')
        }

        const chargeId = paymentIntent.latest_charge as string
        console.log(`🔖 Charge ID: ${chargeId}`)

        // Create refund
        const refundAmount = Math.round(withdrawal.amount * 100) // Convert to cents

        console.log(`💸 Creating refund for $${withdrawal.amount} (${refundAmount} cents)`)

        const refund = await stripe.refunds.create({
          charge: chargeId,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            withdrawal_id: withdrawalId,
            user_hash: withdrawal.user_hash
          }
        })

        console.log(`✅ Refund created: ${refund.id}`)
        console.log(`   Status: ${refund.status}`)

        // Update withdrawal request as completed
        const { error: updateError } = await supabase
          .from('withdrawal_requests')
          .update({
            status: 'completed',
            stripe_refund_id: refund.id,
            processed_at: new Date().toISOString()
          })
          .eq('id', withdrawalId)

        if (updateError) {
          console.error('Failed to update withdrawal request:', updateError)
          // Refund was created but DB update failed - log this for manual review
          throw new Error('Refund created but failed to update database')
        }

        return new Response(
          JSON.stringify({
            success: true,
            withdrawal_id: withdrawalId,
            refund_id: refund.id,
            amount: withdrawal.amount,
            status: refund.status,
            message: `Successfully refunded $${withdrawal.amount} to user`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (stripeError: any) {
        console.error('❌ Stripe error:', stripeError)

        // Mark withdrawal as failed
        await supabase
          .from('withdrawal_requests')
          .update({
            status: 'failed',
            error_message: stripeError.message || 'Stripe refund failed',
            processed_at: new Date().toISOString()
          })
          .eq('id', withdrawalId)

        // Refund the user's balance since withdrawal failed
        await supabase.rpc('update_balance_atomic', {
          p_user_id: withdrawal.user_id,
          p_user_hash: withdrawal.user_hash,
          p_delta: withdrawal.amount,
          p_transaction_type: 'deposit',
          p_description: `Refund: Failed withdrawal ${withdrawalId}`
        })

        return new Response(
          JSON.stringify({
            error: 'Failed to process withdrawal',
            details: stripeError.message,
            withdrawal_id: withdrawalId,
            balance_refunded: true
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // =========================================================================
    // ACTION: Process all pending withdrawals
    // =========================================================================

    if (action === 'process_all') {
      const { data: withdrawals, error } = await supabase
        .from('withdrawal_requests')
        .select('id')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })

      if (error || !withdrawals || withdrawals.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No pending withdrawals to process',
            processed: 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`📋 Processing ${withdrawals.length} withdrawals...`)

      const results = []
      for (const withdrawal of withdrawals) {
        try {
          // Recursively call this function to process each withdrawal
          const response = await fetch(req.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'process',
              withdrawalId: withdrawal.id,
              adminSecret: providedSecret
            })
          })

          const result = await response.json()
          results.push({
            withdrawal_id: withdrawal.id,
            success: response.ok,
            ...result
          })
        } catch (err: any) {
          results.push({
            withdrawal_id: withdrawal.id,
            success: false,
            error: err.message
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      return new Response(
        JSON.stringify({
          success: true,
          total: withdrawals.length,
          successful: successCount,
          failed: failCount,
          results
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Invalid action
    return new Response(
      JSON.stringify({
        error: 'Invalid action',
        valid_actions: ['list', 'process', 'process_all']
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Admin function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
