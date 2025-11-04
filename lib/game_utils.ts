import { supabase } from './supabase';
import { addActivityLog } from './activity_log_utils';

export interface Game {
  id: string;
  wake_up_time: string;
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
  total_wakeups: number;
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
  event_type: 'join' | 'wakeup' | 'elimination' | 'win' | 'missed_wakeup' | 'game_start' | 'game_end' | 'chat' | 'proof';
  created_at: string;
  photo_url?: string | null;
}

export interface GameWithPlayers extends Game {
  players: GamePlayer[];
  logs: GameLog[];
}

/**
 * Create a new game
 */
export async function createGame(
  wakeUpTime: string,
  stake: number
): Promise<{ ok: boolean; game?: Game; error?: any }> {
  const { data, error } = await supabase
    .from('games')
    .insert({
      wake_up_time: wakeUpTime,
      stake: stake,
      status: 'joinable',
      player_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create game:', error);
    return { ok: false, error };
  }

  return { ok: true, game: data as Game };
}

/**
 * Get all joinable games (not full and not started)
 */
export async function getJoinableGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'joinable')
    .lt('player_count', 8)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get joinable games:', error);
    return [];
  }

  return (data as Game[]) || [];
}

/**
 * Join a game
 */
export async function joinGame(
  gameId: string,
  userHash: string
): Promise<{ ok: boolean; error?: any }> {
  // Check if user is already in the game
  const { data: existingPlayer } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_hash', userHash)
    .maybeSingle();

  if (existingPlayer) {
    return { ok: false, error: { message: 'Already in this game' } };
  }

  // Check current player count
  const { data: game } = await supabase
    .from('games')
    .select('player_count, status')
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

  // Add player to game
  const { error: insertError } = await supabase
    .from('game_players')
    .insert({
      game_id: gameId,
      user_hash: userHash,
      status: 'active',
      total_wakeups: 0,
    });

  if (insertError) {
    console.error('Failed to join game:', insertError);
    return { ok: false, error: insertError };
  }

  // Increment player count
  const newPlayerCount = game.player_count + 1;
  const newStatus = newPlayerCount === 8 ? 'active' : 'joinable';
  const updateData: any = {
    player_count: newPlayerCount,
    status: newStatus,
  };

  if (newStatus === 'active') {
    updateData.started_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('games')
    .update(updateData)
    .eq('id', gameId);

  if (updateError) {
    console.error('Failed to update game:', updateError);
    return { ok: false, error: updateError };
  }

  // Add log entry
  await addGameLog(
    gameId,
    userHash,
    `Player ${userHash.substring(0, 8)} joined the game`,
    'join'
  );

  // If game is now full, add game start log
  if (newStatus === 'active') {
    await addGameLog(
      gameId,
      null,
      'Game started! All 8 players have joined.',
      'game_start'
    );
  }

  return { ok: true };
}

/**
 * Get game details with players and logs
 */
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
    ...game,
    players: (players as GamePlayer[]) || [],
    logs: (logs as GameLog[]) || [],
  } as GameWithPlayers;
}

/**
 * Get all games for a user (active and completed)
 */
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

  // Extract games from the joined query
  const games = data?.map((item: any) => item.games).filter(Boolean) || [];
  return games as Game[];
}

/**
 * Get user's active game (only one active game allowed at a time)
 */
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

  // Check if the game itself is active or joinable (not completed)
  const game = data.games as Game;
  if (game && (game.status === 'active' || game.status === 'joinable')) {
    return game;
  }

  return null;
}

/**
 * Add a log entry to a game
 */
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

/**
 * Send a chat message in a game
 */
export async function sendChatMessage(
  gameId: string,
  userHash: string,
  message: string
): Promise<{ ok: boolean; error?: any }> {
  console.log('=== sendChatMessage ===');
  console.log('Game ID:', gameId);
  console.log('User hash:', userHash);
  console.log('Message:', message);

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

  console.log('Chat message sent successfully');
  return { ok: true };
}

/**
 * Submit wakeup proof (photo) with photo upload to Supabase Storage
 */
export async function submitWakeupProof(
  gameId: string,
  userHash: string,
  photoUri: string,
  caption: string,
  wakeUpTime: string
): Promise<{ ok: boolean; isOnTime?: boolean; error?: any }> {
  console.log('=== submitWakeupProof ===');
  console.log('Game ID:', gameId);
  console.log('User hash:', userHash);
  console.log('Photo URI:', photoUri);
  console.log('Caption:', caption);

  const submissionDate = new Date().toISOString().split('T')[0];
  const submittedAt = new Date();

  // Check if already submitted today
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

  // Calculate if submission is on time
  const now = submittedAt;
  const [hours, minutes] = wakeUpTime.split(':').map(Number);
  const deadline = new Date(now);
  deadline.setHours(hours, minutes, 0, 0);

  const isOnTime = now <= deadline;
  console.log('Is on time:', isOnTime, 'Deadline:', deadline, 'Now:', now);

  // Upload photo to Supabase Storage
  console.log('Uploading photo to storage...');
  const fileName = `${gameId}/${userHash}/${submissionDate}-${Date.now()}.jpg`;

  // Convert photo URI to ArrayBuffer for React Native
  const response = await fetch(photoUri);
  const arrayBuffer = await response.arrayBuffer();

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('wakeup-proofs')
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Failed to upload photo:', uploadError);
    return { ok: false, error: uploadError };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('wakeup-proofs')
    .getPublicUrl(fileName);

  console.log('Photo uploaded successfully:', publicUrl);

  // Insert submission
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

  // If on time, increment total_wakeups
  if (isOnTime) {
    const { data: player } = await supabase
      .from('game_players')
      .select('total_wakeups')
      .eq('game_id', gameId)
      .eq('user_hash', userHash)
      .single();

    if (player) {
      await supabase
        .from('game_players')
        .update({
          total_wakeups: player.total_wakeups + 1,
          last_submission_date: submissionDate,
        })
        .eq('game_id', gameId)
        .eq('user_hash', userHash);
    }
  }

  // Add proof log entry with photo URL
  const proofMessage = caption ? `"${caption}"` : 'submitted wakeup proof';
  await supabase
    .from('game_logs')
    .insert({
      game_id: gameId,
      user_hash: userHash,
      message: `${userHash.substring(0, 8)}: ${proofMessage}`,
      event_type: 'proof',
      photo_url: publicUrl,
    });

  // Add to activity feed with verification status
  const verificationEmoji = isOnTime ? '✓' : '✗';
  const timeString = submittedAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const activityMessage = `${verificationEmoji} Submitted wakeup proof at ${timeString} - "${caption}"`;

  console.log('=== Adding to activity feed ===');
  console.log('Activity message:', activityMessage);
  console.log('Photo URL:', publicUrl);

  const activityAdded = await addActivityLog(
    userHash,
    userHash,
    activityMessage,
    'wakeup',
    publicUrl
  );

  if (!activityAdded) {
    console.error('⚠️ WARNING: Failed to add to activity feed! Check RLS on activity_log table');
  } else {
    console.log('✅ Successfully added to activity feed!');
  }

  console.log('Proof submitted successfully!');
  return { ok: true, isOnTime };
}

/**
 * Get submissions for a specific game and date
 */
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
