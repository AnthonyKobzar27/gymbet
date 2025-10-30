import { supabase, getCurrentUser } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];
type GameInsert = Database['public']['Tables']['games']['Insert'];
type GameParticipant = Database['public']['Tables']['game_participants']['Row'];

/**
 * Get all active games
 */
export const getActiveGames = async (): Promise<Game[]> => {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      profiles:creator_id (username, display_name, avatar_url),
      game_participants (count)
    `)
    .in('status', ['open', 'active'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active games:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get user's games (created or participated)
 */
export const getUserGames = async (userId?: string): Promise<Game[]> => {
  const user = userId || (await getCurrentUser())?.id;
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      profiles:creator_id (username, display_name, avatar_url),
      game_participants!inner (user_id, stake_amount_cents, is_winner, winnings_cents)
    `)
    .or(`creator_id.eq.${user},game_participants.user_id.eq.${user}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user games:', error);
    throw error;
  }

  return data || [];
};

/**
 * Create a new game
 */
export const createGame = async (gameData: {
  title: string;
  description?: string;
  category: string;
  startTime: Date;
  endTime: Date;
  stakeAmount: number; // in dollars
  maxParticipants?: number;
  requiresPhoto?: boolean;
  requiresLocation?: boolean;
}): Promise<Game> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const gameInsert: GameInsert = {
    creator_id: user.id,
    title: gameData.title,
    description: gameData.description,
    category: gameData.category,
    start_time: gameData.startTime.toISOString(),
    end_time: gameData.endTime.toISOString(),
    verification_deadline: new Date(gameData.endTime.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours after end
    stake_amount_cents: Math.round(gameData.stakeAmount * 100),
    max_participants: gameData.maxParticipants || 100,
    requires_photo: gameData.requiresPhoto || false,
    requires_location: gameData.requiresLocation || false,
    status: 'open',
  };

  const { data, error } = await supabase
    .from('games')
    .insert(gameInsert)
    .select()
    .single();

  if (error) {
    console.error('Error creating game:', error);
    throw error;
  }

  // Create activity for game creation
  await createActivity({
    type: 'game_created',
    title: 'Created a new challenge',
    description: `"${gameData.title}" - Stake: $${gameData.stakeAmount}`,
    game_id: data.id,
  });

  return data;
};

/**
 * Join a game
 */
export const joinGame = async (gameId: string): Promise<GameParticipant> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  // Get game details
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    throw new Error('Game not found');
  }

  if (game.status !== 'open') {
    throw new Error('Game is not open for joining');
  }

  // Check if user has sufficient balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance_cents')
    .eq('user_id', user.id)
    .single();

  if (!wallet || wallet.balance_cents < game.stake_amount_cents) {
    throw new Error('Insufficient balance');
  }

  // Join the game
  const { data, error } = await supabase
    .from('game_participants')
    .insert({
      game_id: gameId,
      user_id: user.id,
      stake_amount_cents: game.stake_amount_cents,
    })
    .select()
    .single();

  if (error) {
    console.error('Error joining game:', error);
    throw error;
  }

  // Create transaction for stake
  await createTransaction({
    type: 'stake',
    amount_cents: -game.stake_amount_cents,
    description: `Staked $${(game.stake_amount_cents / 100).toFixed(2)} for "${game.title}"`,
    game_id: gameId,
  });

  // Update game participant count
  await supabase.rpc('increment_game_participants', { game_id: gameId });

  // Create activity
  await createActivity({
    type: 'game_joined',
    title: 'Joined a challenge',
    description: `"${game.title}" - Staked: $${(game.stake_amount_cents / 100).toFixed(2)}`,
    game_id: gameId,
  });

  return data;
};

/**
 * Submit proof for a game
 */
export const submitProof = async (
  gameId: string,
  proof: {
    photoUrl?: string;
    location?: { latitude: number; longitude: number };
    notes?: string;
  }
): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('game_participants')
    .update({
      submitted_proof: true,
      proof_photo_url: proof.photoUrl,
      proof_location: proof.location ? `POINT(${proof.location.longitude} ${proof.location.latitude})` : null,
      proof_timestamp: new Date().toISOString(),
      proof_notes: proof.notes,
    })
    .eq('game_id', gameId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error submitting proof:', error);
    throw error;
  }
};

/**
 * Get game participants
 */
export const getGameParticipants = async (gameId: string): Promise<GameParticipant[]> => {
  const { data, error } = await supabase
    .from('game_participants')
    .select(`
      *,
      profiles:user_id (username, display_name, avatar_url)
    `)
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching game participants:', error);
    throw error;
  }

  return data || [];
};

/**
 * Helper function to create activity
 */
const createActivity = async (activity: {
  type: 'game_created' | 'game_joined' | 'game_won' | 'game_lost';
  title: string;
  description?: string;
  game_id?: string;
}) => {
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from('activities').insert({
    user_id: user.id,
    ...activity,
  });
};

/**
 * Helper function to create transaction
 */
const createTransaction = async (transaction: {
  type: 'stake' | 'win' | 'loss' | 'refund';
  amount_cents: number;
  description: string;
  game_id?: string;
}) => {
  const user = await getCurrentUser();
  if (!user) return;

  // Get user's wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!wallet) return;

  await supabase.from('transactions').insert({
    user_id: user.id,
    wallet_id: wallet.id,
    ...transaction,
  });
};


