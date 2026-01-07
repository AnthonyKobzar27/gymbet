import { supabase } from '../supabase';
import { deposit } from '../transaction_utils';
import { addTransaction } from '../stripe_utils';
import { addGameLog } from './logs';
import { notifyGameWon } from '../game_notifications';

export async function handleMultipleWinners(
  gameId: string,
  winners: Array<{ user_hash: string }>,
  stakeAmount: number,
  eliminatedCount: number
): Promise<void> {
  for (const winner of winners) {
    const { data: payouts } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_hash', winner.user_hash)
      .eq('type', 'payout')
      .like('description', `%game ${gameId}%`);

    let totalWinnings = 0;
    if (payouts) {
      totalWinnings = payouts.reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
    }

    const refundResult = await deposit(winner.user_hash, stakeAmount);
    if (refundResult.ok) {
      await addTransaction({
        type: 'payout',
        amount: stakeAmount,
        description: `Winner stake refund from game ${gameId}`,
        userHash: winner.user_hash
      });

      const actualProfit = totalWinnings;
      const { addProfit } = await import('@/lib/homepage_utils');
      const { addActivityLog } = await import('@/lib/activity_log_utils');
      
      if (actualProfit > 0) {
        const userProfit = actualProfit * 0.90;
        await addProfit(winner.user_hash, userProfit);
        const totalWon = userProfit + stakeAmount;
        await addActivityLog(
          winner.user_hash,
          winner.user_hash,
          `Won $${totalWon.toFixed(2)}`,
          'win'
        );
      } else {
        await addActivityLog(
          winner.user_hash,
          winner.user_hash,
          `Won a game!`,
          'win'
        );
      }
    }
  }

  await supabase
    .from('game_players')
    .update({ status: 'winner' })
    .eq('game_id', gameId)
    .eq('status', 'active');

  await supabase
    .from('games')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString()
    })
    .eq('id', gameId);

  await addGameLog(
    gameId,
    null,
    `Game ended! ${eliminatedCount} players eliminated. ${winners.length} winners!`,
    'game_end'
  );

  // Notify all winners
  for (const winner of winners) {
    const winAmount = stakeAmount; // Each winner gets their stake back + share of eliminated stakes
    notifyGameWon(gameId, winner.user_hash, winAmount).catch(err =>
      console.log('Non-critical: Failed to send game won notification', err)
    );
  }
}

export async function handleSingleWinner(
  gameId: string,
  winner: { user_hash: string },
  stakeAmount: number
): Promise<void> {
  const { data: payouts } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_hash', winner.user_hash)
    .eq('type', 'payout')
    .like('description', `%game ${gameId}%`);

  let totalWinnings = 0;
  if (payouts) {
    totalWinnings = payouts.reduce((sum, tx) => sum + (parseFloat(tx.amount.toString()) || 0), 0);
  }

  const refundResult = await deposit(winner.user_hash, stakeAmount);
  if (refundResult.ok) {
    await addTransaction({
      type: 'payout',
      amount: stakeAmount,
      description: `Winner stake refund from game ${gameId}`,
      userHash: winner.user_hash
    });

    const actualProfit = totalWinnings;
    const { addProfit } = await import('@/lib/homepage_utils');
    const { addActivityLog } = await import('@/lib/activity_log_utils');
    
    if (actualProfit > 0) {
      const userProfit = actualProfit * 0.90;
      await addProfit(winner.user_hash, userProfit);
      const totalWon = userProfit + stakeAmount;
      await addActivityLog(
        winner.user_hash,
        winner.user_hash,
        `won a game! Received $${totalWon.toFixed(2)} ($${userProfit.toFixed(2)} profit + $${stakeAmount.toFixed(2)} stake back)`,
        'win'
      );
    } else {
      await addActivityLog(
        winner.user_hash,
        winner.user_hash,
        `won a game and got their $${stakeAmount.toFixed(2)} stake back!`,
        'win'
      );
    }
  }

  await supabase
    .from('game_players')
    .update({ status: 'winner' })
    .eq('game_id', gameId)
    .eq('user_hash', winner.user_hash);

  await supabase
    .from('games')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString()
    })
    .eq('id', gameId);

  await addGameLog(
    gameId,
    winner.user_hash,
    `🏆 0x${winner.user_hash.substring(0, 8)} won the game!`,
    'win'
  );

  // Send push notification to winner
  const totalWon = totalWinnings > 0 ? (totalWinnings * 0.90) + stakeAmount : stakeAmount;
  notifyGameWon(gameId, winner.user_hash, totalWon).catch(err =>
    console.log('Non-critical: Failed to send game won notification', err)
  );
}

