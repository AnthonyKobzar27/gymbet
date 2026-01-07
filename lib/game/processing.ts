import { supabase } from '../supabase';
import { addGameLog } from './logs';
import { redistributeStake } from './stake';

export async function checkAndProcessMissedProofs(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split('T')[0];

  const { data: activeGames } = await supabase
    .from('games')
    .select('id')
    .eq('status', 'active');

  if (!activeGames || activeGames.length === 0) {
    return;
  }

  for (const game of activeGames) {
    const { data: activePlayers } = await supabase
      .from('game_players')
      .select('user_hash, last_submission_date')
      .eq('game_id', game.id)
      .eq('status', 'active');

    if (!activePlayers || activePlayers.length === 0) {
      continue;
    }

    for (const player of activePlayers) {
      const { data: submission } = await supabase
        .from('game_submissions')
        .select('id')
        .eq('game_id', game.id)
        .eq('user_hash', player.user_hash)
        .eq('submission_date', yesterdayDate)
        .maybeSingle();

      if (!submission) {
        await addGameLog(
          game.id,
          player.user_hash,
          `0x${player.user_hash.substring(0, 8)} missed their workout proof`,
          'missed_workout'
        );

        const result = await redistributeStake(game.id, player.user_hash);
        if (!result.ok) {
          console.error(`Failed to redistribute stake for ${player.user_hash}:`, result.error);
        }
      }
    }

    const { data: remainingPlayers } = await supabase
      .from('game_players')
      .select('user_hash')
      .eq('game_id', game.id)
      .eq('status', 'active');

    if (remainingPlayers && remainingPlayers.length === 1) {
      const winner = remainingPlayers[0];

      await supabase
        .from('game_players')
        .update({ status: 'winner' })
        .eq('game_id', game.id)
        .eq('user_hash', winner.user_hash);

      await supabase
        .from('games')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', game.id);

      await addGameLog(
        game.id,
        winner.user_hash,
        `🏆 0x${winner.user_hash.substring(0, 8)} won the game!`,
        'win'
      );
    }
  }
}

