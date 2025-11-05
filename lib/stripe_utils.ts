import { supabase } from './supabase';

/**
 * Create a Stripe Payment Intent on the backend
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
