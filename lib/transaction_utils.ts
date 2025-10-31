import { supabase } from '../lib/supabase';

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
  const { error } = await supabase
    .from('hash_to_value')
    .upsert({ hash: userHash, value: 0 }, { onConflict: 'hash' });

  if (error) {
    console.error('failed to init user balance', error);
    return false;
  }
  return true;
}

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

export async function deposit(userHash: string, amount: number) {
  return changeBalance(userHash, Math.abs(amount));
}

export async function withdraw(userHash: string, amount: number) {
  return changeBalance(userHash, -Math.abs(amount));
}