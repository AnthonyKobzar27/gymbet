import { supabase } from './supabase';

/**
 * Create a Stripe Checkout Session
 * Opens a hosted Stripe payment page
 * Amount should be in dollars (e.g., 10 for $10)
 */
export async function createCheckoutSession(amount: number, userHash: string): Promise<string> {
  console.log('=== createCheckoutSession ===');
  console.log('Amount:', amount);
  console.log('User hash:', userHash);

  try {
    // Call Supabase Edge Function to create checkout session
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        amount: amount, // Amount in dollars, edge function will convert to cents
        userHash: userHash
      },
    });

    if (error) {
      console.error('Failed to create checkout session:', error);
      throw new Error(error.message || 'Failed to create checkout session');
    }

    if (!data || !data.url) {
      throw new Error('No checkout URL returned from server');
    }

    console.log('Checkout session created successfully');
    return data.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a Stripe Payment Intent on the backend (DEPRECATED - use createCheckoutSession)
 * Amount should be in cents (e.g., $10 = 1000 cents)
 */
export async function createPaymentIntent(amountInCents: number): Promise<string> {
  console.log('=== createPaymentIntent ===');
  console.log('Amount in cents:', amountInCents);

  try {
    // Call your Supabase Edge Function or backend API
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { amount: amountInCents },
    });

    if (error) {
      console.error('Failed to create payment intent:', error);
      throw new Error(error.message || 'Failed to create payment intent');
    }

    if (!data || !data.clientSecret) {
      throw new Error('No client secret returned from server');
    }

    console.log('Payment intent created successfully');
    return data.clientSecret;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Add a transaction record to the database
 */
export async function addTransaction(params: {
  type: 'deposit' | 'withdrawal' | 'stake' | 'payout';
  amount: number;
  description: string;
  userHash?: string;
}): Promise<{ ok: boolean; error?: any }> {
  console.log('=== addTransaction ===');
  console.log('Transaction:', params);

  try {
    const { error } = await supabase
      .from('transactions')
      .insert({
        user_hash: params.userHash,
        type: params.type,
        amount: params.amount,
        description: params.description,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to add transaction:', error);
      return { ok: false, error };
    }

    console.log('Transaction added successfully');
    return { ok: true };
  } catch (error) {
    console.error('Error adding transaction:', error);
    return { ok: false, error };
  }
}

/**
 * Request a withdrawal (secure - uses Edge Function)
 * Amount should be in dollars (e.g., 50 for $50)
 */
export async function requestWithdrawal(amount: number, userHash: string): Promise<{ ok: boolean; error?: string; withdrawal_id?: string }> {
  console.log('=== requestWithdrawal ===');
  console.log('Amount:', amount);
  console.log('User hash:', userHash);

  try {
    // Call Supabase Edge Function to request withdrawal
    const { data, error } = await supabase.functions.invoke('request-withdrawal', {
      body: {
        amount: amount,
        userHash: userHash
      },
    });

    if (error) {
      console.error('Failed to request withdrawal:', error);
      return { ok: false, error: error.message || 'Failed to request withdrawal' };
    }

    if (!data || !data.success) {
      return { ok: false, error: data?.error || 'Withdrawal request failed' };
    }

    console.log('Withdrawal requested successfully:', data.withdrawal_id);
    return { ok: true, withdrawal_id: data.withdrawal_id };
  } catch (error) {
    console.error('Error requesting withdrawal:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get user's transaction history
 */
export async function getTransactions(userHash: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_hash', userHash)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to get transactions:', error);
    return [];
  }

  return data || [];
}
