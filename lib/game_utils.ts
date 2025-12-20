import { supabase } from './supabase';
import { addActivityLogWithId, getRandomValidators, distributeProofToValidators } from './activity_log_utils';
import { getBalance, withdraw, deposit } from './transaction_utils';
import { addTransaction } from './stripe_utils';

export interface WeeklySchedule {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface Game {
  id: string;
  split_type: string;
  weekly_schedule?: WeeklySchedule;
  stake: number;
  status: 'joinable' | 'active' | 'completed';
  player_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_hash: string;
  joined_at: string;
  status: 'active' | 'eliminated' | 'winner';
  total_workouts: number;
  last_submission_date: string | null;
}

export interface GameSubmission {
  id: string;
  game_id: string;
  user_hash: string;
  submission_date: string;
  photo_url: string;
  submitted_at: string;
  is_on_time: boolean;
  verified: boolean;
}

export interface GameLog {
  id: string;
  game_id: string;
  user_hash: string | null;
  message: string;
  event_type: 'join' | 'workout' | 'elimination' | 'win' | 'missed_workout' | 'game_start' | 'game_end' | 'chat' | 'proof';
  created_at: string;
  photo_url?: string | null;
}

export interface GameWithPlayers extends Game {
  players: GamePlayer[];
  logs: GameLog[];
}

export async function createGame(
  weeklySchedule: WeeklySchedule,
  stake: number
): Promise<{ ok: boolean; game?: Game; error?: any }> {
  if (!stake || typeof stake !== 'number' || !isFinite(stake)) {
    return { ok: false, error: { message: 'Invalid stake amount' } };
  }

  if (stake < 0.50) {
    return { ok: false, error: { message: 'Minimum stake is $0.50' } };
  }

  if (stake > 100) {
    return { ok: false, error: { message: 'Maximum stake is $100' } };
  }

  const roundedStake = Math.round(stake * 100) / 100;

  if (!weeklySchedule || typeof weeklySchedule !== 'object') {
    return { ok: false, error: { message: 'Invalid weekly schedule' } };
  }

  const { data, error } = await supabase
    .from('games')
    .insert({
      split_type: JSON.stringify(weeklySchedule),
      stake: roundedStake,
      status: 'joinable',
      player_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create game:', error);
    return { ok: false, error };
  }

  const game = data as Game;
  try {
    game.weekly_schedule = JSON.parse(game.split_type);
  } catch (e) {
    game.weekly_schedule = {
      monday: game.split_type,
      tuesday: game.split_type,
      wednesday: game.split_type,
      thursday: game.split_type,
      friday: game.split_type,
      saturday: game.split_type,
      sunday: game.split_type,
    };
  }

  return { ok: true, game };
}


export async function getJoinableGames(onlyFreeGames: boolean = false): Promise<Game[]> {
  let query = supabase
    .from('games')
    .select('*')
    .eq('status', 'joinable')
    .lt('player_count', 8);

  // If onlyFreeGames is true, only show games with stake = 0
  if (onlyFreeGames) {
    query = query.eq('stake', 0);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get joinable games:', error);
    return [];
  }

  const games = (data as Game[]) || [];
  games.forEach(game => {
    try {
      game.weekly_schedule = JSON.parse(game.split_type);
    } catch (e) {
      game.weekly_schedule = {
        monday: game.split_type,
        tuesday: game.split_type,
        wednesday: game.split_type,
        thursday: game.split_type,
        friday: game.split_type,
        saturday: game.split_type,
        sunday: game.split_type,
      };
    }
  });

  return games;
}

export async function joinGame(
  gameId: string,
  userHash: string
): Promise<{ ok: boolean; error?: any }> {
  
  const { data: existingPlayer } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_hash', userHash)
    .maybeSingle();

  if (existingPlayer) {
    return { ok: false, error: { message: 'Already in this game' } };
  }

  const { data: game } = await supabase
    .from('games')
    .select('player_count, status, stake')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { ok: false, error: { message: 'Game not found' } };
  }

  if (game.status !== 'joinable') {
    return { ok: false, error: { message: 'Game is not joinable' } };
  }

  if (game.player_count >= 8) {
    return { ok: false, error: { message: 'Game is full' } };
  }

  // Check if user is in an active game
  const activeGame = await getUserActiveGame(userHash);
  
  // If user is not in a game and trying to join a paid game (stake > 0), reject
  if (!activeGame && game.stake > 0) {
    return { ok: false, error: { message: 'Paid games can only be joined on the web. Please join a free game (stake $0) from the app.' } };
  }

  const userBalance = await getBalance(userHash);

  if (userBalance < game.stake) {
    return { ok: false, error: { message: `Insufficient balance. Need $${game.stake.toFixed(2)}, but you have $${userBalance.toFixed(2)}` } };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('hash', userHash)
    .single();

  if (profileError || !profile?.user_id) {
    console.error('Failed to get user_id:', profileError);
    return { ok: false, error: { message: 'Failed to get user profile' } };
  }

  const { data: updateResult, error: updateError } = await supabase
    .rpc('update_balance_atomic', {
      p_user_id: profile.user_id,
      p_user_hash: userHash,
      p_delta: -game.stake,
      p_transaction_type: 'stake',
      p_description: `Staked $${game.stake.toFixed(2)} for game ${gameId}`
    });

  if (updateError || !updateResult?.success) {
    console.error('Failed to deduct stake:', updateError || updateResult?.error);
    return { ok: false, error: { message: 'Failed to process stake payment: ' + (updateError?.message || updateResult?.error || 'Unknown error') } };
  }

  const { error: insertError } = await supabase
    .from('game_players')
    .insert({
      game_id: gameId,
      user_hash: userHash,
      status: 'active',
      total_workouts: 0,
    });

  if (insertError) {
    console.error('Failed to join game:', insertError);
    const { error: refundError } = await supabase
      .rpc('update_balance_atomic', {
        p_user_id: profile.user_id,
        p_user_hash: userHash,
        p_delta: game.stake,
        p_transaction_type: 'deposit',
        p_description: `Refund: Failed to join game ${gameId}`
      });
    
    if (refundError) {
      console.error('❌ CRITICAL: Failed to refund stake after insert failure!', refundError);
    }
    
    return { ok: false, error: insertError };
  }

  const newPlayerCount = game.player_count + 1;
  const newStatus = newPlayerCount === 8 ? 'active' : 'joinable';
  const updateData: any = {
    player_count: newPlayerCount,
    status: newStatus,
  };

  if (newStatus === 'active') {
    updateData.started_at = new Date().toISOString();
  }

  const { error: gameUpdateError } = await supabase
    .from('games')
    .update(updateData)
    .eq('id', gameId);

  if (gameUpdateError) {
    console.error('Failed to update game:', gameUpdateError);
    return { ok: false, error: gameUpdateError };
  }

  await addGameLog(
    gameId,
    userHash,
    `Player 0x${userHash.substring(0, 8)} joined the game`,
    'join'
  );

  const { addActivityLog } = await import('@/lib/activity_log_utils');
  await addActivityLog(
    userHash,
    userHash,
    `joined a game with $${game.stake.toFixed(2)} stake`,
    'bet'
  );

  if (newStatus === 'active') {
    await addGameLog(
      gameId,
      null,
      'Game started! All 8 players have joined.',
      'game_start'
    );

    const { notifyGameStart } = await import('@/lib/notification_utils');
    await notifyGameStart();
  }

  return { ok: true };
}

export async function leaveGame(
  gameId: string,
  userHash: string
): Promise<{ ok: boolean; error?: any; refunded?: number }> {
  const { data: game } = await supabase
    .from('games')
    .select('status, stake, player_count')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { ok: false, error: { message: 'Game not found' } };
  }

  if (game.status !== 'joinable') {
    return { ok: false, error: { message: 'Cannot leave a game that has already started' } };
  }

  const { data: player } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_hash', userHash)
    .maybeSingle();

  if (!player) {
    return { ok: false, error: { message: 'You are not in this game' } };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('hash', userHash)
    .single();

  if (profileError || !profile?.user_id) {
    return { ok: false, error: { message: 'Failed to get user profile' } };
  }

  const { data: updateResult, error: refundError } = await supabase
    .rpc('update_balance_atomic', {
      p_user_id: profile.user_id,
      p_user_hash: userHash,
      p_delta: game.stake,
      p_transaction_type: 'deposit',
      p_description: `Refund from leaving game ${gameId}`
    });

  if (refundError || !updateResult?.success) {
    return { ok: false, error: { message: 'Failed to refund stake' } };
  }

  const { error: deleteError } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('user_hash', userHash);

  if (deleteError) {
    console.error('Failed to remove player:', deleteError);
    return { ok: false, error: deleteError };
  }

  const { error: updateError } = await supabase
    .from('games')
    .update({
      player_count: game.player_count - 1,
    })
    .eq('id', gameId);

  if (updateError) {
    console.error('Failed to update player count:', updateError);
    return { ok: false, error: updateError };
  }

  await addGameLog(
    gameId,
    userHash,
    `Player 0x${userHash.substring(0, 8)} left the game`,
    'chat'
  );

  const { addActivityLog } = await import('@/lib/activity_log_utils');
  await addActivityLog(
    userHash,
    userHash,
    `left a game and received $${game.stake.toFixed(2)} refund`,
    'leave'
  );

  return { ok: true, refunded: game.stake };
}

export async function getGameDetails(gameId: string): Promise<GameWithPlayers | null> {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    console.error('Failed to get game details:', gameError);
    return null;
  }

  const parsedGame = game as Game;
  try {
    parsedGame.weekly_schedule = JSON.parse(parsedGame.split_type);
  } catch (e) {
    parsedGame.weekly_schedule = {
      monday: parsedGame.split_type,
      tuesday: parsedGame.split_type,
      wednesday: parsedGame.split_type,
      thursday: parsedGame.split_type,
      friday: parsedGame.split_type,
      saturday: parsedGame.split_type,
      sunday: parsedGame.split_type,
    };
  }

  const { data: players, error: playersError } = await supabase
    .from('game_players')
    .select('*')
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true });

  if (playersError) {
    console.error('Failed to get game players:', playersError);
    return null;
  }

  const { data: logs, error: logsError } = await supabase
    .from('game_logs')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (logsError) {
    console.error('Failed to get game logs:', logsError);
    return null;
  }

  return {
    ...parsedGame,
    players: (players as GamePlayer[]) || [],
    logs: (logs as GameLog[]) || [],
  } as GameWithPlayers;
}

export async function getUserGames(userHash: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select('game_id, games(*)')
    .eq('user_hash', userHash)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Failed to get user games:', error);
    return [];
  }

  const games = data?.map((item: any) => item.games).filter(Boolean) || [];
  return games as Game[];
}

export async function getUserActiveGame(userHash: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('game_players')
    .select('game_id, games(*)')
    .eq('user_hash', userHash)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  const game = (data as any).games as Game;
  if (game && (game.status === 'active' || game.status === 'joinable')) {
    return game;
  }

  return null;
}

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

export async function submitWakeupProof(
  gameId: string,
  userHash: string,
  photoUri: string,
  caption: string,
  splitType: string
): Promise<{ ok: boolean; isOnTime?: boolean; error?: any }> {
  const submissionDate = new Date().toISOString().split('T')[0];
  const submittedAt = new Date();

  const { data: existing } = await supabase
    .from('game_submissions')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_hash', userHash)
    .eq('submission_date', submissionDate)
    .maybeSingle();

  if (existing) {
    console.error('Already submitted today');
    return { ok: false, error: { message: 'Already submitted today' } };
  }

  const isOnTime = true;

  const fileName = `${gameId}/${userHash}/${submissionDate}-${Date.now()}.jpg`;

  const response = await fetch(photoUri);
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
    return { ok: false, error: { message: 'Image must be less than 10MB' } };
  }

  if (arrayBuffer.byteLength < 1000) {
    return { ok: false, error: { message: 'Invalid image file' } };
  }

  const { error: uploadError } = await supabase.storage
    .from('workout-proofs')
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Failed to upload photo:', uploadError);
    return { ok: false, error: uploadError };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('workout-proofs')
    .getPublicUrl(fileName);

  const { error: insertError } = await supabase
    .from('game_submissions')
    .insert({
      game_id: gameId,
      user_hash: userHash,
      submission_date: submissionDate,
      photo_url: publicUrl,
      submitted_at: submittedAt.toISOString(),
      is_on_time: isOnTime,
      verified: true,
    });

  if (insertError) {
    console.error('Failed to submit wakeup proof:', insertError);
    return { ok: false, error: insertError };
  }

  if (isOnTime) {
    const { data: player } = await supabase
      .from('game_players')
      .select('total_workouts')
      .eq('game_id', gameId)
      .eq('user_hash', userHash)
      .single();

    if (player) {
      await supabase
        .from('game_players')
        .update({
          total_workouts: player.total_workouts + 1,
          last_submission_date: submissionDate,
        })
        .eq('game_id', gameId)
        .eq('user_hash', userHash);
    }
  }

  const { data: homeStats } = await supabase
    .from('home_page_top')
    .select('workout_logged, workout_history')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (homeStats) {
    const newWorkoutCount = (homeStats.workout_logged || 0) + 1;
    const newHistory = [...(homeStats.workout_history || []), 1].slice(-7);

    await supabase
      .from('home_page_top')
      .update({
        workout_logged: newWorkoutCount,
        workout_history: newHistory,
        current_split_day: caption || 'Workout',
      })
      .eq('user_hash', userHash);
  }

  const proofMessage = caption ? `"${caption}"` : 'submitted workout proof';
  await supabase
    .from('game_logs')
    .insert({
      game_id: gameId,
      user_hash: userHash,
      message: `0x${userHash.substring(0, 8)}: ${proofMessage}`,
      event_type: 'proof',
      photo_url: publicUrl,
    });

  const verificationEmoji = isOnTime ? '✓' : '✗';
  const timeString = submittedAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const activityMessage = `${verificationEmoji} Submitted workout proof at ${timeString} - "${caption}"`;

  const activityResult = await addActivityLogWithId(
    userHash,
    userHash,
    activityMessage,
    'workout',
    publicUrl,
    gameId
  );

  if (!activityResult.ok || !activityResult.id) {
    console.error('⚠️ WARNING: Failed to add to activity feed! Check RLS on activity_log table');
  } else {
    const validators = await getRandomValidators(userHash, gameId, 100);

    if (validators.length > 0) {
      const distributionResult = await distributeProofToValidators(
        activityResult.id,
        validators
      );

      if (distributionResult.ok) {
        console.log(`✅ Successfully distributed proof ${activityResult.id} to ${validators.length} validators`);
      } else {
        console.error('⚠️ Failed to distribute proof:', distributionResult.error);
      }
    } else {
      console.error('⚠️ CRITICAL: No validators found! Proof will not be distributed. Check if profiles exist in database.');
    }
  }

  return { ok: true, isOnTime };
}

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

  const { error: updateError } = await supabase
    .from('game_players')
    .update({ status: 'eliminated' })
    .eq('game_id', gameId)
    .eq('user_hash', eliminatedUserHash);

  if (updateError) {
    console.error('Failed to update eliminated player status:', updateError);
  }

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

  if (eliminatedCount >= 2) {
    if (remainingPlayers && remainingPlayers.length > 0) {
      for (const winner of remainingPlayers) {
        const { data: payouts, error: payoutError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_hash', winner.user_hash)
          .eq('type', 'payout')
          .like('description', `%game ${gameId}%`);

        let totalWinnings = 0;
        if (!payoutError && payouts) {
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
            const platformFee = actualProfit * 0.10;
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
        } else {
          console.error(`Failed to refund stake to winner ${winner.user_hash}:`, refundResult.error);
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
        `Game ended! ${eliminatedCount} players eliminated. ${remainingPlayers.length} winners!`,
        'game_end'
      );
    }
  } else if (remainingPlayers && remainingPlayers.length === 1) {
    const winner = remainingPlayers[0];

    const { data: payouts, error: payoutError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_hash', winner.user_hash)
      .eq('type', 'payout')
      .like('description', `%game ${gameId}%`);

    let totalWinnings = 0;
    if (!payoutError && payouts) {
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
        const platformFee = actualProfit * 0.10;
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
    } else {
      console.error(`Failed to refund stake to winner ${winner.user_hash}:`, refundResult.error);
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
  } else if (remainingPlayers) {
  }

  return { ok: true };
}

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

export async function getGameSubmissions(
  gameId: string,
  date?: string
): Promise<GameSubmission[]> {
  let query = supabase
    .from('game_submissions')
    .select('*')
    .eq('game_id', gameId);

  if (date) {
    query = query.eq('submission_date', date);
  }

  const { data, error } = await query.order('submitted_at', { ascending: false });

  if (error) {
    console.error('Failed to get game submissions:', error);
    return [];
  }

  return (data as GameSubmission[]) || [];
}
