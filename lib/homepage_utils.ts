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
  // First check if the user already has stats
  const { data: existing } = await supabase
    .from('home_page_top')
    .select('user_hash')
    .eq('user_hash', userHash)
    .maybeSingle();

  // Only create if user doesn't exist
  if (!existing) {
    const { error } = await supabase
      .from('home_page_top')
      .insert({
        user_hash: userHash,
        sleep_logged: 0,
        profit_made: 0,
        sleep_history: [0],
        profit_history: [0]
      });

    if (error) {
      console.error('failed to init user stats', error);
      return false;
    }
  }
  return true;
}

export async function addSleep(userHash: string, hours: number): Promise<{ ok: boolean; error?: any }> {
  console.log('=== addSleep called ===');
  console.log('userHash:', userHash);
  console.log('hours to add:', hours);

  const current = await getStats(userHash);
  console.log('Current stats:', current);

  const newSleep = current.sleepLogged + Math.abs(hours);
  console.log('New sleep value:', newSleep);

  // Update history - keep last 7 entries
  const newHistory = [...current.sleepHistory, Math.abs(hours)].slice(-7);
  console.log('New sleep history:', newHistory);

  const { data, error } = await supabase
    .from('home_page_top')
    .update({
      sleep_logged: newSleep,
      sleep_history: newHistory,
    })
    .eq('user_hash', userHash)
    .select();

  console.log('Update result - data:', data);
  console.log('Update result - error:', error);

  if (error) {
    console.error('Failed to add sleep:', error);
    return { ok: false, error };
  }

  if (!data || data.length === 0) {
    console.error('Update matched 0 rows! userHash might not exist or not match.');
    return { ok: false, error: { message: 'No rows updated. Check user_hash match.' } };
  }

  console.log('Sleep added successfully!');
  return { ok: true };
}

export async function addProfit(userHash: string, profit: number): Promise<{ ok: boolean; error?: any }> {
  console.log('=== addProfit called ===');
  console.log('userHash:', userHash);
  console.log('profit to add:', profit);

  const current = await getStats(userHash);
  console.log('Current stats:', current);

  const newProfit = current.profitMade + Math.abs(profit);
  console.log('New profit value:', newProfit);

  // Update history - keep last 7 entries
  const newHistory = [...current.profitHistory, Math.abs(profit)].slice(-7);
  console.log('New profit history:', newHistory);

  const { data, error } = await supabase
    .from('home_page_top')
    .update({
      profit_made: newProfit,
      profit_history: newHistory,
    })
    .eq('user_hash', userHash)
    .select();

  console.log('Update result - data:', data);
  console.log('Update result - error:', error);

  if (error) {
    console.error('Failed to add profit:', error);
    return { ok: false, error };
  }

  if (!data || data.length === 0) {
    console.error('Update matched 0 rows! userHash might not exist or not match.');
    return { ok: false, error: { message: 'No rows updated. Check user_hash match.' } };
  }

  console.log('Profit added successfully!');
  return { ok: true };
}
