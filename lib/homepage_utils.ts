import { supabase } from '../lib/supabase';

export interface UserStats {
  sleepLogged: number;
  sleepAverage: number;
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
    return { sleepLogged: 0, sleepAverage: 0, profitMade: 0, sleepHistory: [0], profitHistory: [0] };
  }

  const sleepHistory = data?.sleep_history ?? [0];
  const sleepAverage = sleepHistory.length > 0
    ? sleepHistory.reduce((sum: number, val: number) => sum + val, 0) / sleepHistory.length
    : 0;

  return {
    sleepLogged: data?.sleep_logged ?? 0,
    sleepAverage: Math.round(sleepAverage * 10) / 10, // Round to 1 decimal place
    profitMade: data?.profit_made ?? 0,
    sleepHistory: sleepHistory,
    profitHistory: data?.profit_history ?? [0],
  };
}

export async function initStats(userHash: string): Promise<boolean> {
  console.log('=== initStats called ===');
  console.log('userHash:', userHash);

  // First check if the user already has stats
  const { data: existing, error: checkError } = await supabase
    .from('home_page_top')
    .select('user_hash')
    .eq('user_hash', userHash)
    .maybeSingle();

  console.log('Existing stats check - data:', existing);
  console.log('Existing stats check - error:', checkError);

  // Only create if user doesn't exist
  if (!existing) {
    console.log('No existing stats found, creating new entry...');
    const { data, error } = await supabase
      .from('home_page_top')
      .insert({
        user_hash: userHash,
        sleep_logged: 0,
        profit_made: 0,
        sleep_history: [0],
        profit_history: [0]
      })
      .select();

    console.log('Insert result - data:', data);
    console.log('Insert result - error:', error);

    if (error) {
      console.error('❌ FAILED to init user stats', error);
      return false;
    }

    console.log('✅ Stats initialized successfully!');
  } else {
    console.log('User already has stats entry');
  }
  return true;
}

export async function addSleep(userHash: string, hours: number): Promise<{ ok: boolean; error?: any }> {
  console.log('=== addSleep called ===');
  console.log('userHash:', userHash);
  console.log('hours to add:', hours);

  // Check if user has already logged sleep today
  const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
  console.log('Today:', today);

  const { data: existingLog, error: checkError } = await supabase
    .from('home_page_top')
    .select('last_sleep_log_date')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (checkError) {
    console.error('Failed to check last sleep log date:', checkError);
    return { ok: false, error: checkError };
  }

  const lastLogDate = existingLog?.last_sleep_log_date;
  console.log('Last sleep log date:', lastLogDate);

  if (lastLogDate === today) {
    console.log('User already logged sleep today!');
    return {
      ok: false,
      error: { message: 'You have already logged sleep today. Come back tomorrow!' }
    };
  }

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
      last_sleep_log_date: today,
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

// Check if user can log sleep today (returns true if they haven't logged yet today)
export async function canLogSleepToday(userHash: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('home_page_top')
    .select('last_sleep_log_date')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (error) {
    console.error('Failed to check sleep log status:', error);
    return true; // Default to allowing if error
  }

  const lastLogDate = data?.last_sleep_log_date;
  return lastLogDate !== today;
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
