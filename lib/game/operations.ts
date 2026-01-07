import { supabase } from '../supabase';
import { Game, WeeklySchedule } from '@/types/game';
import { getBalance } from '../transaction_utils';
import { addGameLog } from './logs';
import { notifyGameStarted, notifyPlayerJoined } from '../game_notifications';

function parseWeeklySchedule(splitType: string): WeeklySchedule {
  try {
    return JSON.parse(splitType);
  } catch (e) {
    return {
      monday: splitType,
      tuesday: splitType,
      wednesday: splitType,
      thursday: splitType,
      friday: splitType,
      saturday: splitType,
      sunday: splitType,
    };
  }
}

export async function createGame(
  weeklySchedule: WeeklySchedule,
  stake: number
): Promise<{ ok: boolean; game?: Game; error?: any }> {
  if (typeof stake !== 'number' || !isFinite(stake) || stake < 0) {
    return { ok: false, error: { message: 'Invalid stake amount' } };
  }

  if (stake > 0 && stake < 0.50) {
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
  game.weekly_schedule = parseWeeklySchedule(game.split_type);

  return { ok: true, game };
}

export async function getJoinableGames(onlyFreeGames: boolean = false): Promise<Game[]> {
  let query = supabase
    .from('games')
    .select('*')
    .eq('status', 'joinable')
    .lt('player_count', 8);

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
    game.weekly_schedule = parseWeeklySchedule(game.split_type);
  });

  return games;
}

export async function getUserActiveGame(userHash: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('game_players')
    .select('game_id, games(*)')
    .eq('user_hash', userHash)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error fetching active game:', error);
    return null;
  }
  if (!data) {
    return null;
  }

  const game = (data as any).games as Game;
  if (game && (game.status === 'active' || game.status === 'joinable')) {
    return game;
  }

  return null;
}

export async function getUserGames(userHash: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select('game_id, games(*)')
    .eq('user_hash', userHash);

  if (error) {
    console.error('Failed to get user games:', error);
    return [];
  }

  const games = (data || [])
    .map((item: any) => item.games as Game)
    .filter((game: Game) => game !== null);

  games.forEach(game => {
    game.weekly_schedule = parseWeeklySchedule(game.split_type);
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

  // Check if user already has an active game
  const activeGame = await getUserActiveGame(userHash);
  if (activeGame) {
    return { ok: false, error: { message: 'You already have an active game. Leave it first to join another.' } };
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

  // Send push notification to other players about new player joining
  notifyPlayerJoined(gameId, userHash).catch(err => 
    console.log('Non-critical: Failed to send player joined notification', err)
  );

  if (newStatus === 'active') {
    // Game just started - notify all players!
    notifyGameStarted(gameId).catch(err => 
      console.log('Non-critical: Failed to send game started notification', err)
    );

    await addGameLog(
      gameId,
      null,
      'Game started! All 8 players have joined.',
      'game_start'
    );
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

  // CRITICAL: Refund stake BEFORE removing player to ensure atomicity
  // If refund fails, player stays in game (no data loss)
  if (game.stake > 0) {
    const { data: refundResult, error: refundError } = await supabase
      .rpc('update_balance_atomic', {
        p_user_id: profile.user_id,
        p_user_hash: userHash,
        p_delta: game.stake,
        p_transaction_type: 'deposit',
        p_description: `Refund: Left game ${gameId}`
      });

    if (refundError || !refundResult?.success) {
      console.error('❌ CRITICAL: Failed to refund stake when leaving game!', refundError || refundResult?.error);
      return { ok: false, error: { message: 'Failed to refund stake. Please try again.' } };
    }
  }

  // Only remove player AFTER successful refund
  const { error: deleteError } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('user_hash', userHash);

  if (deleteError) {
    console.error('Failed to remove player after refund:', deleteError);
    // If deletion fails but refund succeeded, try to reverse the refund
    if (game.stake > 0) {
      await supabase.rpc('update_balance_atomic', {
        p_user_id: profile.user_id,
        p_user_hash: userHash,
        p_delta: -game.stake,
        p_transaction_type: 'stake',
        p_description: `Reversal: Failed to leave game ${gameId}`
      });
    }
    return { ok: false, error: deleteError };
  }

  const newPlayerCount = Math.max(0, game.player_count - 1);
  await supabase
    .from('games')
    .update({ player_count: newPlayerCount })
    .eq('id', gameId);

  await addGameLog(
    gameId,
    userHash,
    `Player 0x${userHash.substring(0, 8)} left the game`,
    'join'
  );

  return { ok: true, refunded: game.stake };
}

export async function getGameDetails(gameId: string): Promise<import('@/types/game').GameWithPlayers | null> {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    console.error('Failed to get game:', gameError);
    return null;
  }

  const gameData = game as Game;
  gameData.weekly_schedule = parseWeeklySchedule(gameData.split_type);

  const { data: players, error: playersError } = await supabase
    .from('game_players')
    .select('*')
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true });

  if (playersError) {
    console.error('Failed to get players:', playersError);
    return null;
  }

  const { data: logs, error: logsError } = await supabase
    .from('game_logs')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (logsError) {
    console.error('Failed to get logs:', logsError);
    return null;
  }

  return {
    ...gameData,
    players: (players || []) as import('@/types/game').GamePlayer[],
    logs: (logs || []) as import('@/types/game').GameLog[],
  };
}

