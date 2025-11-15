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
    workoutAverage: Math.round(workoutAverage * 10) / 10,
    profitMade: data?.profit_made ?? 0,
    workoutHistory: workoutHistory,
    profitHistory: data?.profit_history ?? [0],
    currentSplitDay: data?.current_split_day ?? 'No split set',
  };
}

export async function initStats(userHash: string): Promise<boolean> {
  const { data: existing, error: checkError } = await supabase
    .from('home_page_top')
    .select('user_hash')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
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


    if (error) {
      return false;
    }
  }
  return true;
}

export async function addWorkout(userHash: string, splitDay: string): Promise<{ ok: boolean; error?: any }> {
  const today = new Date().toISOString().split('T')[0];

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

  if (lastLogDate === today) {
    return {
      ok: false,
      error: { message: 'You have already logged workout today. Come back tomorrow!' }
    };
  }

  const current = await getStats(userHash);
  const newWorkout = current.workoutLogged + 1;
  const newHistory = [...current.workoutHistory, 1].slice(-7);

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

  if (error) {
    console.error('Failed to add workout:', error);
    return { ok: false, error };
  }

  if (!data || data.length === 0) {
    console.error('Update matched 0 rows! userHash might not exist or not match.');
    return { ok: false, error: { message: 'No rows updated. Check user_hash match.' } };
  }

  return { ok: true };
}

export async function canLogWorkoutToday(userHash: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('home_page_top')
    .select('last_workout_log_date')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (error) {
    return true;
  }

  const lastLogDate = data?.last_workout_log_date;
  return lastLogDate !== today;
}

export async function addProfit(userHash: string, profit: number): Promise<{ ok: boolean; error?: any }> {
  const current = await getStats(userHash);
  const newProfit = current.profitMade + Math.abs(profit);
  const newHistory = [...current.profitHistory, Math.abs(profit)].slice(-7);

  const { data, error } = await supabase
    .from('home_page_top')
    .update({
      profit_made: newProfit,
      profit_history: newHistory,
    })
    .eq('user_hash', userHash)
    .select();

  if (error) {
    console.error('Failed to add profit:', error);
    return { ok: false, error };
  }

  if (!data || data.length === 0) {
    console.error('Update matched 0 rows! userHash might not exist or not match.');
    return { ok: false, error: { message: 'No rows updated. Check user_hash match.' } };
  }

  return { ok: true };
}
