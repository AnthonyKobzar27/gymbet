import { supabase } from '../supabase';
import { GameLog } from '@/types/game';

export async function addGameLog(
  gameId: string,
  userHash: string | null,
  message: string,
  eventType: GameLog['event_type']
): Promise<boolean> {
  const { error } = await supabase
    .from('game_logs')
    .insert({
      game_id: gameId,
      user_hash: userHash,
      message: message,
      event_type: eventType,
    });

  if (error) {
    console.error('Failed to add game log:', error);
    return false;
  }

  return true;
}

export async function sendChatMessage(
  gameId: string,
  userHash: string,
  message: string
): Promise<{ ok: boolean; error?: any }> {
  const { error } = await supabase
    .from('game_logs')
    .insert({
      game_id: gameId,
      user_hash: userHash,
      message: message,
      event_type: 'chat',
    });

  if (error) {
    console.error('Failed to send chat message:', error);
    return { ok: false, error };
  }

  return { ok: true };
}

