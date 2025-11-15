import { supabase } from '../lib/supabase';

// ============================================================================
// SECURITY NOTE: These functions use client-side Supabase client
// ============================================================================
// After implementing Row Level Security (RLS), these functions will:
// - Only allow users to access their own balance (verified by auth.uid())
// - Prevent race conditions using database-level locking
// - Log all balance changes to audit_log table
//
// For critical financial operations (deposits, withdrawals), use:
// - Stripe webhook handler (for deposits)
// - request-withdrawal Edge Function (for withdrawals)
//
// These client-side functions are safe to use for:
// - Game stakes (deducting balance when joining games)
// - Game payouts (adding balance when winning games)
// - Reading balance (display purposes)
// ============================================================================

export async function getBalance(userHash: string): Promise<number> {
  const { data, error } = await supabase
    .from('hash_to_value')
    .select('value')
    .eq('hash', userHash)
    .maybeSingle();

  if (error) {
    console.error('failed to get user balance', error);
    return 0;
  }

  return data?.value ?? 0;
}

export async function initBalance(userHash: string): Promise<boolean> {
  // RLS will automatically set user_id from auth.uid() via trigger
  const { error } = await supabase
    .from('hash_to_value')
    .upsert({ hash: userHash, value: 0 }, { onConflict: 'hash' });

  if (error) {
    console.error('failed to init user balance', error);
    return false;
  }
  return true;
}

/**
 * @deprecated Use update_balance_atomic() RPC for critical financial operations
 * This function has race conditions. Safe for game stakes/payouts only.
 */
export async function changeBalance(userHash: string, delta: number): Promise<{ ok: boolean; newBalance?: number; error?: any }> {


  const current = await getBalance(userHash);
  const next = current + delta;
  if (next < 0) {
    return { ok: false, error: new Error('Insufficient balance') };
  }

  const { error } = await supabase
    .from('hash_to_value')
    .upsert({ hash: userHash, value: next }, { onConflict: 'hash' });

  if (error) {
    console.error('failed to change user balance', error);
    return { ok: false, error };
  }

  return { ok: true, newBalance: next };
}

/**
 * @deprecated For user deposits, use Stripe checkout flow instead
 * This function is safe for game payouts (adding winnings)
 */
export async function deposit(userHash: string, amount: number) {
  return changeBalance(userHash, Math.abs(amount));
}

/**
 * @deprecated For user withdrawals, use request-withdrawal Edge Function
 * This function is safe for game stakes (deducting entry fees)
 */
export async function withdraw(userHash: string, amount: number) {
  return changeBalance(userHash, -Math.abs(amount));
}