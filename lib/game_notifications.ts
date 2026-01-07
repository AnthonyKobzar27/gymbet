import { supabase } from './supabase';

type GameEventType = 
  | 'game_started'
  | 'player_joined'
  | 'player_eliminated'
  | 'game_won'
  | 'proof_approved'
  | 'proof_rejected';

interface NotifyGameEventParams {
  eventType: GameEventType;
  gameId: string;
  targetUserHash?: string;
  triggerUserHash?: string;
  additionalData?: Record<string, any>;
}

/**
 * Send a game event notification to players via edge function
 */
export async function notifyGameEvent(params: NotifyGameEventParams): Promise<{ ok: boolean; error?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('game-event-notification', {
      body: params,
    });

    if (error) {
      console.error('Error sending game event notification:', error);
      return { ok: false, error };
    }

    console.log('Game event notification sent:', data);
    return { ok: true };
  } catch (error) {
    console.error('Error invoking game-event-notification:', error);
    return { ok: false, error };
  }
}

/**
 * Notify all players in a game that it has started
 */
export async function notifyGameStarted(gameId: string): Promise<void> {
  await notifyGameEvent({
    eventType: 'game_started',
    gameId,
  });
}

/**
 * Notify all players that someone joined the game
 */
export async function notifyPlayerJoined(gameId: string, joiningUserHash: string): Promise<void> {
  await notifyGameEvent({
    eventType: 'player_joined',
    gameId,
    triggerUserHash: joiningUserHash,
  });
}

/**
 * Notify a player they were eliminated and other players about the elimination
 */
export async function notifyPlayerEliminated(gameId: string, eliminatedUserHash: string): Promise<void> {
  await notifyGameEvent({
    eventType: 'player_eliminated',
    gameId,
    targetUserHash: eliminatedUserHash,
  });
}

/**
 * Notify the winner and other players that the game ended
 */
export async function notifyGameWon(gameId: string, winnerUserHash: string, winAmount: number): Promise<void> {
  await notifyGameEvent({
    eventType: 'game_won',
    gameId,
    targetUserHash: winnerUserHash,
    additionalData: { winAmount },
  });
}

/**
 * Notify a player their proof was approved
 */
export async function notifyProofApproved(gameId: string, userHash: string): Promise<void> {
  await notifyGameEvent({
    eventType: 'proof_approved',
    gameId,
    targetUserHash: userHash,
  });
}

/**
 * Notify a player their proof was rejected
 */
export async function notifyProofRejected(gameId: string, userHash: string): Promise<void> {
  await notifyGameEvent({
    eventType: 'proof_rejected',
    gameId,
    targetUserHash: userHash,
  });
}

