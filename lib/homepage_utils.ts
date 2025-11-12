import { supabase } from '../lib/supabase';

export interface UserStats {
  workoutLogged: number;
  workoutAverage: number;
  profitMade: number;
  workoutHistory: number[];
  profitHistory: number[];
  currentSplitDay?: string;
}

export async function getStats(userHash: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('home_page_top')
    .select('workout_logged, profit_made, workout_history, profit_history, current_split_day')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (error) {
    console.error('failed to get user stats', error);
    return { workoutLogged: 0, workoutAverage: 0, profitMade: 0, workoutHistory: [0], profitHistory: [0], currentSplitDay: 'No split set' };
  }

  const workoutHistory = data?.workout_history ?? [0];
  const workoutAverage = workoutHistory.length > 0
    ? workoutHistory.reduce((sum: number, val: number) => sum + val, 0) / workoutHistory.length
    : 0;

  return {
    workoutLogged: data?.workout_logged ?? 0,
    workoutAverage: Math.round(workoutAverage * 10) / 10, // Round to 1 decimal place
    profitMade: data?.profit_made ?? 0,
    workoutHistory: workoutHistory,
    profitHistory: data?.profit_history ?? [0],
    currentSplitDay: data?.current_split_day ?? 'No split set',
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
        workout_logged: 0,
        profit_made: 0,
        workout_history: [0],
        profit_history: [0],
        current_split_day: 'No split set'
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

export async function addWorkout(userHash: string, splitDay: string): Promise<{ ok: boolean; error?: any }> {
  console.log('=== addWorkout called ===');
  console.log('userHash:', userHash);
  console.log('split day:', splitDay);

  // Check if user has already logged workout today
  const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
  console.log('Today:', today);

  const { data: existingLog, error: checkError } = await supabase
    .from('home_page_top')
    .select('last_workout_log_date')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (checkError) {
    console.error('Failed to check last workout log date:', checkError);
    return { ok: false, error: checkError };
  }

  const lastLogDate = existingLog?.last_workout_log_date;
  console.log('Last workout log date:', lastLogDate);

  if (lastLogDate === today) {
    console.log('User already logged workout today!');
    return {
      ok: false,
      error: { message: 'You have already logged workout today. Come back tomorrow!' }
    };
  }

  const current = await getStats(userHash);
  console.log('Current stats:', current);

  const newWorkout = current.workoutLogged + 1;
  console.log('New workout count:', newWorkout);

  // Update history - keep last 7 entries (1 for completed, 0 for skipped)
  const newHistory = [...current.workoutHistory, 1].slice(-7);
  console.log('New workout history:', newHistory);

  const { data, error } = await supabase
    .from('home_page_top')
    .update({
      workout_logged: newWorkout,
      workout_history: newHistory,
      last_workout_log_date: today,
      current_split_day: splitDay,
    })
    .eq('user_hash', userHash)
    .select();

  console.log('Update result - data:', data);
  console.log('Update result - error:', error);

  if (error) {
    console.error('Failed to add workout:', error);
    return { ok: false, error };
  }

  if (!data || data.length === 0) {
    console.error('Update matched 0 rows! userHash might not exist or not match.');
    return { ok: false, error: { message: 'No rows updated. Check user_hash match.' } };
  }

  console.log('Workout added successfully!');
  return { ok: true };
}

// Check if user can log workout today (returns true if they haven't logged yet today)
export async function canLogWorkoutToday(userHash: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('home_page_top')
    .select('last_workout_log_date')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (error) {
    console.error('Failed to check workout log status:', error);
    return true; // Default to allowing if error
  }

  const lastLogDate = data?.last_workout_log_date;
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
