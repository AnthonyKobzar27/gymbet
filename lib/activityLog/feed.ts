import { supabase } from '../supabase';
import { ActivityLog } from '@/types/activityLog';

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

export async function addActivityLogWithId(
  userHash: string,
  senderHash: string,
  message: string,
  typeofmessage: string,
  image?: string,
  gameId?: string | null
): Promise<{ ok: boolean; id?: number; error?: any }> {
  console.log('=== INSERT TO activity_log TABLE ===');
  console.log('image parameter:', image);
  console.log('image is null?', image === null);
  console.log('image is undefined?', image === undefined);
  console.log('====================================');

  const insertData = {
    user_hash: userHash,
    sender_hash: senderHash,
    message: message,
    typeofmessage: typeofmessage,
    image: image || null,
    game_id: gameId || null,
  };

  console.log('=== DATA BEING INSERTED ===');
  console.log(JSON.stringify(insertData, null, 2));
  console.log('===========================');

  const { data, error } = await supabase
    .from('activity_log')
    .insert(insertData)
    .select('id, image')
    .single();

  if (error) {
    console.error('❌ failed to add activity log', error);
    return { ok: false, error };
  }

  console.log('=== INSERTED DATA RETURNED ===');
  console.log('id:', data.id);
  console.log('image:', data.image);
  console.log('==============================');

  return { ok: true, id: data.id };
}

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

  return () => {
    channel.unsubscribe();
  };
}

