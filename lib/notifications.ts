/**
 * Unified Notification Service
 * 
 * This module handles all in-app notifications (stored in database).
 * Push notifications are handled separately via game_notifications.ts edge functions.
 */

import { supabase } from './supabase';

export type NotificationType = 
  | 'welcome'
  | 'game_created'
  | 'game_joined'
  | 'player_joined'
  | 'game_started'
  | 'player_eliminated'
  | 'you_eliminated'
  | 'game_won'
  | 'game_lost'
  | 'game_ended'
  | 'stake_received'
  | 'proof_approved'
  | 'proof_rejected';

interface CreateNotificationParams {
  userHash: string;
  title: string;
  message: string;
  type: NotificationType;
}

/**
 * Create an in-app notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<{ ok: boolean; error?: any }> {
  const { userHash, title, message, type } = params;
  
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_hash: userHash,
        title,
        message,
        type,
        read: false,
      });

    if (error) {
      console.error('Failed to create notification:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { ok: false, error };
  }
}

// ============================================================================
// NOTIFICATION HELPERS - Call these from your business logic
// ============================================================================

/**
 * Send welcome notification when user creates account
 */
export async function notifyWelcome(userHash: string): Promise<void> {
  await createNotification({
    userHash,
    title: 'Welcome to GymBets! 💪',
    message: 'Thanks for joining! Start by creating a game or joining an existing one. Stay consistent and win big!',
    type: 'welcome',
  });
}

/**
 * Notify user that they successfully created a game
 */
export async function notifyGameCreated(userHash: string, stake: number): Promise<void> {
  const stakeText = stake === 0 ? 'free game' : `$${stake.toFixed(2)} stake`;
  await createNotification({
    userHash,
    title: 'Game Created! 🎮',
    message: `Your ${stakeText} game is live. Share it with friends or wait for players to join!`,
    type: 'game_created',
  });
}

/**
 * Notify user that they successfully joined a game
 */
export async function notifyGameJoined(userHash: string, stake: number, playerCount: number): Promise<void> {
  const stakeText = stake === 0 ? 'free game' : `staked $${stake.toFixed(2)}`;
  await createNotification({
    userHash,
    title: 'Game Joined! 🏋️',
    message: `You've ${stakeText}. ${8 - playerCount} more players needed to start. Get ready!`,
    type: 'game_joined',
  });
}

/**
 * Notify all players in a game that someone new joined
 */
export async function notifyPlayerJoinedGame(
  gameId: string, 
  joiningUserHash: string, 
  playerCount: number
): Promise<void> {
  // Get all players except the one who joined
  const { data: players } = await supabase
    .from('game_players')
    .select('user_hash')
    .eq('game_id', gameId)
    .neq('user_hash', joiningUserHash);

  if (!players) return;

  const remaining = 8 - playerCount;
  const message = remaining > 0 
    ? `A new player joined your game! ${remaining} more ${remaining === 1 ? 'player' : 'players'} needed.`
    : 'Your game is now full and starting!';

  for (const player of players) {
    await createNotification({
      userHash: player.user_hash,
      title: 'New Player Joined! 👥',
      message,
      type: 'player_joined',
    });
  }
}

/**
 * Notify all players that the game has started
 */
export async function notifyGameStarted(gameId: string): Promise<void> {
  const { data: players } = await supabase
    .from('game_players')
    .select('user_hash')
    .eq('game_id', gameId);

  if (!players) return;

  for (const player of players) {
    await createNotification({
      userHash: player.user_hash,
      title: 'Game Started! 🚀',
      message: 'All 8 players have joined. The competition begins now! Submit your workout proofs to stay in the game.',
      type: 'game_started',
    });
  }
}

/**
 * Notify a player that they were eliminated
 */
export async function notifyYouEliminated(userHash: string, stake: number): Promise<void> {
  const stakeText = stake > 0 ? ` Your $${stake.toFixed(2)} stake has been distributed to remaining players.` : '';
  await createNotification({
    userHash,
    title: 'You Were Eliminated 😢',
    message: `Your proof was rejected and you've been eliminated from the game.${stakeText} Better luck next time!`,
    type: 'you_eliminated',
  });
}

/**
 * Notify other players that someone was eliminated
 */
export async function notifyPlayerEliminated(
  gameId: string, 
  eliminatedUserHash: string, 
  amountReceived: number
): Promise<void> {
  const { data: players } = await supabase
    .from('game_players')
    .select('user_hash')
    .eq('game_id', gameId)
    .eq('status', 'active')
    .neq('user_hash', eliminatedUserHash);

  if (!players) return;

  const earningsText = amountReceived > 0 
    ? `You received $${amountReceived.toFixed(2)} from their stake!` 
    : 'Keep going strong!';

  for (const player of players) {
    await createNotification({
      userHash: player.user_hash,
      title: 'Player Eliminated! 💀',
      message: `A player was eliminated from your game. ${earningsText}`,
      type: 'player_eliminated',
    });
  }
}

/**
 * Notify winner(s) that they won the game
 */
export async function notifyGameWon(
  userHash: string, 
  totalWinnings: number, 
  stake: number
): Promise<void> {
  const profit = totalWinnings - stake;
  let message: string;
  
  if (profit > 0) {
    message = `You won $${totalWinnings.toFixed(2)} (including $${profit.toFixed(2)} profit)! Your consistency paid off!`;
  } else if (stake > 0) {
    message = `You got your $${stake.toFixed(2)} stake back! Great job staying consistent!`;
  } else {
    message = 'You completed the challenge! Great job staying consistent!';
  }

  await createNotification({
    userHash,
    title: 'You Won! 🏆',
    message,
    type: 'game_won',
  });
}

/**
 * Notify losers when game ends
 */
export async function notifyGameLost(userHash: string, stake: number): Promise<void> {
  const stakeText = stake > 0 ? ` You lost your $${stake.toFixed(2)} stake.` : '';
  await createNotification({
    userHash,
    title: 'Game Over 😔',
    message: `The game has ended and you didn't make it.${stakeText} Don't give up - join another game and try again!`,
    type: 'game_lost',
  });
}

/**
 * Notify all remaining players when game ends with multiple winners
 */
export async function notifyGameEnded(
  gameId: string, 
  winnerCount: number, 
  eliminatedCount: number
): Promise<void> {
  const { data: winners } = await supabase
    .from('game_players')
    .select('user_hash')
    .eq('game_id', gameId)
    .eq('status', 'winner');

  if (!winners) return;

  for (const winner of winners) {
    await createNotification({
      userHash: winner.user_hash,
      title: 'Game Complete! 🎉',
      message: `The game has ended with ${winnerCount} winner${winnerCount > 1 ? 's' : ''} and ${eliminatedCount} eliminated. Congrats on making it through!`,
      type: 'game_ended',
    });
  }
}

/**
 * Notify user when they receive stake from an eliminated player
 */
export async function notifyStakeReceived(userHash: string, amount: number): Promise<void> {
  await createNotification({
    userHash,
    title: 'Earnings Received! 💰',
    message: `You received $${amount.toFixed(2)} from an eliminated player's stake. Keep up the good work!`,
    type: 'stake_received',
  });
}

/**
 * Notify user when their proof is approved
 */
export async function notifyProofApproved(userHash: string): Promise<void> {
  await createNotification({
    userHash,
    title: 'Proof Approved! ✅',
    message: 'Your workout proof was approved by the community. Great job staying on track!',
    type: 'proof_approved',
  });
}

/**
 * Notify user when their proof is rejected
 */
export async function notifyProofRejected(userHash: string): Promise<void> {
  await createNotification({
    userHash,
    title: 'Proof Rejected ❌',
    message: 'Your workout proof was rejected by the community. Make sure your proofs clearly show your workout!',
    type: 'proof_rejected',
  });
}
