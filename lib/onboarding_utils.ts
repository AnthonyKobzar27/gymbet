import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

/**
 * Check if the current user has completed onboarding
 * Returns false if user is not logged in or profile doesn't exist
 */
export async function hasCompletedOnboarding(user: User | null): Promise<boolean> {
  if (!user) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.onboarding_completed === true;
  } catch (error) {
    return false;
  }
}

/**
 * Mark onboarding as completed for the current user
 */
export async function setOnboardingCompleted(user: User | null): Promise<boolean> {
  if (!user) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id);

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Reset onboarding status for the current user (useful for testing)
 */
export async function resetOnboarding(user: User | null): Promise<boolean> {
  if (!user) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: false })
      .eq('user_id', user.id);

    if (error) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

