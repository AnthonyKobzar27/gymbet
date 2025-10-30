import { supabase, getCurrentUser, getUserWallet } from '../lib/supabase';
import { encryptStripeCustomerId, decryptStripeCustomerId } from '../lib/encryption';
import { Database } from '../lib/database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type Wallet = Database['public']['Tables']['wallets']['Row'];

/**
 * Get user's current balance from Supabase
 */
export const getUserBalance = async (): Promise<number> => {
  try {
    const wallet = await getUserWallet();
    if (!wallet) {
      console.warn('No wallet found for user');
      return 0;
    }
    
    // Convert cents to dollars
    return wallet.balance_cents / 100;
  } catch (error) {
    console.error('Error getting balance from Supabase:', error);
    return 0;
  }
};

/**
 * Update user balance (used internally by transactions)
 */
export const updateUserBalance = async (amountDollars: number): Promise<number> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const amountCents = Math.round(amountDollars * 100);

  // Get current wallet
  const wallet = await getUserWallet();
  if (!wallet) throw new Error('Wallet not found');

  // Update balance
  const { data, error } = await supabase
    .from('wallets')
    .update({
      balance_cents: wallet.balance_cents + amountCents,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating balance:', error);
    throw error;
  }

  return data.balance_cents / 100;
};

/**
 * Create a transaction record
 */
export const addTransaction = async (transaction: {
  type: 'deposit' | 'withdrawal' | 'stake' | 'win' | 'loss' | 'refund';
  amount: number; // in dollars
  description: string;
  stripePaymentIntentId?: string;
  gameId?: string;
  metadata?: any;
}): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const wallet = await getUserWallet();
  if (!wallet) throw new Error('Wallet not found');

  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      wallet_id: wallet.id,
      type: transaction.type,
      amount_cents: Math.round(transaction.amount * 100),
      description: transaction.description,
      stripe_payment_intent_id: transaction.stripePaymentIntentId,
      game_id: transaction.gameId,
      metadata: transaction.metadata || {},
      status: 'completed',
    });

  if (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

/**
 * Get user's transaction history
 */
export const getTransactions = async (): Promise<Transaction[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      games:game_id (title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error getting transactions:', error);
    return [];
  }

  return data || [];
};

/**
 * Process Stripe payment success (called by webhook)
 */
export const processStripePayment = async (
  paymentIntentId: string,
  amountCents: number,
  userId: string
): Promise<void> => {
  try {
    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet not found for user:', userId);
      return;
    }

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance_cents: wallet.balance_cents + amountCents,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
      return;
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        type: 'deposit',
        amount_cents: amountCents,
        description: `Stripe deposit of $${(amountCents / 100).toFixed(2)}`,
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed',
      });

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return;
    }

    // Create activity
    await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: 'game_joined', // Using existing type, you might want to add 'deposit' type
        title: 'Deposited funds',
        description: `Added $${(amountCents / 100).toFixed(2)} to wallet`,
        is_public: false,
      });

    console.log(`✅ Processed payment: $${(amountCents / 100).toFixed(2)} for user ${userId}`);
  } catch (error) {
    console.error('Error processing Stripe payment:', error);
  }
};

/**
 * Store encrypted Stripe customer ID
 */
export const storeStripeCustomerId = async (customerId: string): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const encryptedCustomerId = encryptStripeCustomerId(customerId);

  const { error } = await supabase
    .from('wallets')
    .update({
      encrypted_stripe_customer_id: encryptedCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('Error storing Stripe customer ID:', error);
    throw error;
  }
};

/**
 * Get decrypted Stripe customer ID
 */
export const getStripeCustomerId = async (): Promise<string | null> => {
  const wallet = await getUserWallet();
  if (!wallet?.encrypted_stripe_customer_id) return null;

  try {
    return decryptStripeCustomerId(wallet.encrypted_stripe_customer_id);
  } catch (error) {
    console.error('Error decrypting Stripe customer ID:', error);
    return null;
  }
};

/**
 * Get wallet statistics
 */
export const getWalletStats = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount_cents')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error getting wallet stats:', error);
    return null;
  }

  const stats = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalWinnings: 0,
    totalStaked: 0,
    transactionCount: data.length,
  };

  data.forEach(transaction => {
    const amount = transaction.amount_cents / 100;
    switch (transaction.type) {
      case 'deposit':
        stats.totalDeposits += amount;
        break;
      case 'withdrawal':
        stats.totalWithdrawals += Math.abs(amount);
        break;
      case 'win':
        stats.totalWinnings += amount;
        break;
      case 'stake':
        stats.totalStaked += Math.abs(amount);
        break;
    }
  });

  return stats;
};

/**
 * Request withdrawal (placeholder - implement with Stripe payouts)
 */
export const requestWithdrawal = async (amountDollars: number): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const wallet = await getUserWallet();
  if (!wallet) throw new Error('Wallet not found');

  const amountCents = Math.round(amountDollars * 100);

  if (wallet.balance_cents < amountCents) {
    throw new Error('Insufficient balance');
  }

  // Create pending withdrawal transaction
  await addTransaction({
    type: 'withdrawal',
    amount: -amountDollars,
    description: `Withdrawal request for $${amountDollars.toFixed(2)}`,
  });

  // In a real implementation, you would:
  // 1. Create a Stripe payout
  // 2. Update transaction status based on payout result
  // 3. Handle webhook for payout confirmation

  console.log(`Withdrawal request for $${amountDollars} processed`);
  return true;
};


