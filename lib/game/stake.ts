import { supabase } from '../supabase';
import { deposit } from '../transaction_utils';
import { addTransaction } from '../stripe_utils';
import { addGameLog } from './logs';
import { handleMultipleWinners, handleSingleWinner } from './stakeHelpers';
import { notifyPlayerEliminated } from '../game_notifications';

export async function redistributeStake(
  gameId: string,
  eliminatedUserHash: string
): Promise<{ ok: boolean; error?: any }> {
  const { data: game } = await supabase
    .from('games')
    .select('stake')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { ok: false, error: { message: 'Game not found' } };
  }

  const stakeAmount = game.stake;

  const { data: activePlayers, error: playersError } = await supabase
    .from('game_players')
    .select('user_hash')
    .eq('game_id', gameId)
    .eq('status', 'active')
    .neq('user_hash', eliminatedUserHash);

  if (playersError || !activePlayers || activePlayers.length === 0) {
    console.error('Failed to get active players:', playersError);
    return { ok: false, error: playersError || { message: 'No active players to distribute to' } };
  }

  const amountPerPlayer = stakeAmount / activePlayers.length;

  for (const player of activePlayers) {
    const depositResult = await deposit(player.user_hash, amountPerPlayer);
    if (!depositResult.ok) {
      console.error('Failed to deposit to player:', player.user_hash);
      continue;
    }

    await addTransaction({
      type: 'payout',
      amount: amountPerPlayer,
      description: `Payout from eliminated player in game ${gameId}`,
      userHash: player.user_hash
    });
  }

  await supabase
    .from('game_players')
    .update({ status: 'eliminated' })
    .eq('game_id', gameId)
    .eq('user_hash', eliminatedUserHash);

  await addGameLog(
    gameId,
    eliminatedUserHash,
    `0x${eliminatedUserHash.substring(0, 8)} was eliminated. Stake redistributed to remaining players.`,
    'elimination'
  );

  const { addActivityLog } = await import('@/lib/activity_log_utils');
  await addActivityLog(
    eliminatedUserHash,
    eliminatedUserHash,
    `Lost $${stakeAmount.toFixed(2)} stake`,
    'loss'
  );

  // Send push notification about elimination
  notifyPlayerEliminated(gameId, eliminatedUserHash).catch(err =>
    console.log('Non-critical: Failed to send elimination notification', err)
  );

  const { data: remainingPlayers } = await supabase
    .from('game_players')
    .select('user_hash')
    .eq('game_id', gameId)
    .eq('status', 'active');

  const { data: eliminatedPlayers } = await supabase
    .from('game_players')
    .select('user_hash')
    .eq('game_id', gameId)
    .eq('status', 'eliminated');

  const eliminatedCount = eliminatedPlayers?.length || 0;

  if (eliminatedCount >= 2 && remainingPlayers && remainingPlayers.length > 0) {
    await handleMultipleWinners(gameId, remainingPlayers, stakeAmount, eliminatedCount);
  } else if (remainingPlayers && remainingPlayers.length === 1) {
    await handleSingleWinner(gameId, remainingPlayers[0], stakeAmount);
  }

  return { ok: true };
}

