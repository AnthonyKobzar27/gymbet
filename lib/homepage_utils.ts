import { supabase } from '../lib/supabase';

export interface UserStats {
  sleepLogged: number;
  profitMade: number;
  sleepHistory: number[];
  profitHistory: number[];
}

export async function getStats(userHash: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('home_page_top')
    .select('sleep_logged, profit_made, sleep_history, profit_history')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (error) {
    console.error('failed to get user stats', error);
    return { sleepLogged: 0, profitMade: 0, sleepHistory: [0], profitHistory: [0] };
  }

  return {
    sleepLogged: data?.sleep_logged ?? 0,
    profitMade: data?.profit_made ?? 0,
    sleepHistory: data?.sleep_history ?? [0],
    profitHistory: data?.profit_history ?? [0],
  };
}

export async function initStats(userHash: string): Promise<boolean> {
  const { error } = await supabase
    .from('home_page_top')
    .upsert(
      {
        user_hash: userHash,
        sleep_logged: 0,
        profit_made: 0,
        sleep_history: [0],
        profit_history: [0]
      },
      { onConflict: 'user_hash' }
    );

  if (error) {
    console.error('failed to init user stats', error);
    return false;
  }
  return true;
}

export async function addSleep(userHash: string, hours: number): Promise<{ ok: boolean; error?: any }> {
  const current = await getStats(userHash);
  const newSleep = current.sleepLogged + Math.abs(hours);

  // Update history - keep last 7 entries
  const newHistory = [...current.sleepHistory, Math.abs(hours)].slice(-7);

  const { error } = await supabase
    .from('home_page_top')
    .upsert(
      {
        user_hash: userHash,
        sleep_logged: newSleep,
        profit_made: current.profitMade,
        sleep_history: newHistory,
        profit_history: current.profitHistory
      },
      { onConflict: 'user_hash' }
    );

  if (error) {
    console.error('failed to add sleep', error);
    return { ok: false, error };
  }

  return { ok: true };
}

export async function addProfit(userHash: string, profit: number): Promise<{ ok: boolean; error?: any }> {
  const current = await getStats(userHash);
  const newProfit = current.profitMade + Math.abs(profit);

  // Update history - keep last 7 entries
  const newHistory = [...current.profitHistory, Math.abs(profit)].slice(-7);

  const { error } = await supabase
    .from('home_page_top')
    .upsert(
      {
        user_hash: userHash,
        sleep_logged: current.sleepLogged,
        profit_made: newProfit,
        sleep_history: current.sleepHistory,
        profit_history: newHistory
      },
      { onConflict: 'user_hash' }
    );

  if (error) {
    console.error('failed to add profit', error);
    return { ok: false, error };
  }

  return { ok: true };
}
