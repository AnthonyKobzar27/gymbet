import { supabase } from '../lib/supabase';

// Simple interface matching the table exactly
export interface ActivityLog {
  id: number;
  user_hash: string;
  sender_hash: string;
  message: string;
  typeofmessage: string;
  image: string | null;
  timestep: string;
}

// Get the activity feed - just fetch and return
export async function getActivityFeed(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('timestep', { ascending: false })
    .limit(50);

  if (error) {
    console.error('failed to get activity feed', error);
    return [];
  }

  return data || [];
}

// Add a new activity log entry - just insert
export async function addActivityLog(
  userHash: string,
  senderHash: string,
  message: string,
  typeofmessage: string,
  image?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('activity_log')
    .insert({
      user_hash: userHash,
      sender_hash: senderHash,
      message: message,
      typeofmessage: typeofmessage,
      image: image || null,
    });

  if (error) {
    console.error('failed to add activity log', error);
    return false;
  }

  return true;
}

// Subscribe to new activity logs - real-time updates
export function subscribeToActivityFeed(callback: (newLog: ActivityLog) => void) {
  const channel = supabase
    .channel('activity_log_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_log' },
      (payload) => {
        callback(payload.new as ActivityLog);
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    channel.unsubscribe();
  };
}
