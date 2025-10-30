import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Game {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  category: string;
  start_time: string;
  end_time: string;
  verification_deadline?: string;
  stake_amount_cents: number;
  total_pot_cents: number;
  max_participants: number;
  requires_photo: boolean;
  requires_location: boolean;
  status: 'draft' | 'open' | 'active' | 'verification' | 'completed' | 'cancelled';
  winner_count: number;
  total_participants: number;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  user_participation?: {
    stake_amount_cents: number;
    submitted_proof: boolean;
    is_winner: boolean;
    winnings_cents: number;
    status: string;
  };
}

interface GameParticipant {
  id: string;
  game_id: string;
  user_id: string;
  stake_amount_cents: number;
  joined_at: string;
  submitted_proof: boolean;
  proof_photo_url?: string;
  proof_timestamp?: string;
  proof_notes?: string;
  is_winner: boolean;
  winnings_cents: number;
  status: 'active' | 'completed' | 'disqualified' | 'refunded';
  profiles?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface Activity {
  id: string;
  user_id: string;
  type: 'game_created' | 'game_joined' | 'game_won' | 'game_lost' | 'friend_added' | 'achievement_unlocked';
  title: string;
  description?: string;
  game_id?: string;
  target_user_id?: string;
  is_public: boolean;
  created_at: string;
  profiles?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  games?: {
    title: string;
  };
}

interface GameContextType {
  // Games
  activeGames: Game[];
  userGames: Game[];
  currentUserGame: Game | null;
  activities: Activity[];
  
  // Loading states
  loadingGames: boolean;
  loadingActivities: boolean;
  
  // Actions
  refreshGames: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  createGame: (gameData: {
    title: string;
    description?: string;
    category: string;
    startTime: Date;
    endTime: Date;
    stakeAmount: number;
    maxParticipants?: number;
    requiresPhoto?: boolean;
    requiresLocation?: boolean;
  }) => Promise<{ error: any; data?: Game }>;
  joinGame: (gameId: string) => Promise<{ error: any }>;
  submitProof: (gameId: string, proof: {
    photoUrl?: string;
    location?: { latitude: number; longitude: number };
    notes?: string;
  }) => Promise<{ error: any }>;
  getGameParticipants: (gameId: string) => Promise<GameParticipant[]>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [userGames, setUserGames] = useState<Game[]>([]);
  const [currentUserGame, setCurrentUserGame] = useState<Game | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    if (user) {
      refreshGames();
      refreshActivities();
    } else {
      // Clear data when user logs out
      setActiveGames([]);
      setUserGames([]);
      setCurrentUserGame(null);
      setActivities([]);
    }
  }, [user]);

  const refreshGames = async () => {
    if (!user) return;

    try {
      setLoadingGames(true);

      // Get active games (open for joining)
      const { data: activeGamesData, error: activeError } = await supabase
        .from('games')
        .select(`
          *,
          profiles:creator_id (username, display_name, avatar_url)
        `)
        .in('status', ['open', 'active'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (activeError) {
        console.error('Error fetching active games:', activeError);
      } else {
        setActiveGames(activeGamesData || []);
        await AsyncStorage.setItem('active_games', JSON.stringify(activeGamesData || []));
      }

      // Get user's games (created or participated)
      const { data: userGamesData, error: userError } = await supabase
        .from('games')
        .select(`
          *,
          profiles:creator_id (username, display_name, avatar_url),
          game_participants!inner (
            user_id,
            stake_amount_cents,
            submitted_proof,
            is_winner,
            winnings_cents,
            status
          )
        `)
        .or(`creator_id.eq.${user.id},game_participants.user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (userError) {
        console.error('Error fetching user games:', userError);
      } else {
        const processedUserGames = userGamesData?.map(game => ({
          ...game,
          user_participation: Array.isArray(game.game_participants) 
            ? game.game_participants.find((p: any) => p.user_id === user.id)
            : game.game_participants
        })) || [];
        
        setUserGames(processedUserGames);
        
        // Find current active game for user
        const currentGame = processedUserGames.find(game => 
          game.status === 'active' && 
          (game.creator_id === user.id || game.user_participation)
        );
        setCurrentUserGame(currentGame || null);
        
        await AsyncStorage.setItem('user_games', JSON.stringify(processedUserGames));
      }

    } catch (error) {
      console.error('Error in refreshGames:', error);
      // Try to load cached data
      try {
        const cachedActive = await AsyncStorage.getItem('active_games');
        const cachedUser = await AsyncStorage.getItem('user_games');
        if (cachedActive) setActiveGames(JSON.parse(cachedActive));
        if (cachedUser) setUserGames(JSON.parse(cachedUser));
      } catch (cacheError) {
        console.error('Error loading cached games:', cacheError);
      }
    } finally {
      setLoadingGames(false);
    }
  };

  const refreshActivities = async () => {
    if (!user) return;

    try {
      setLoadingActivities(true);

      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url),
          games:game_id (title)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching activities:', error);
      } else {
        setActivities(data || []);
        await AsyncStorage.setItem('activities', JSON.stringify(data || []));
      }

    } catch (error) {
      console.error('Error in refreshActivities:', error);
      // Try to load cached data
      try {
        const cached = await AsyncStorage.getItem('activities');
        if (cached) setActivities(JSON.parse(cached));
      } catch (cacheError) {
        console.error('Error loading cached activities:', cacheError);
      }
    } finally {
      setLoadingActivities(false);
    }
  };

  const createGame = async (gameData: {
    title: string;
    description?: string;
    category: string;
    startTime: Date;
    endTime: Date;
    stakeAmount: number;
    maxParticipants?: number;
    requiresPhoto?: boolean;
    requiresLocation?: boolean;
  }) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          creator_id: user.id,
          title: gameData.title,
          description: gameData.description,
          category: gameData.category,
          start_time: gameData.startTime.toISOString(),
          end_time: gameData.endTime.toISOString(),
          verification_deadline: new Date(gameData.endTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          stake_amount_cents: Math.round(gameData.stakeAmount * 100),
          max_participants: gameData.maxParticipants || 100,
          requires_photo: gameData.requiresPhoto || false,
          requires_location: gameData.requiresLocation || false,
          status: 'open',
        })
        .select()
        .single();

      if (error) return { error };

      // Create activity
      await supabase.from('activities').insert({
        user_id: user.id,
        type: 'game_created',
        title: 'Created a new challenge',
        description: `"${gameData.title}" - Stake: $${gameData.stakeAmount}`,
        game_id: data.id,
        is_public: true,
      });

      // Refresh games
      await refreshGames();
      await refreshActivities();

      return { error: null, data };
    } catch (error) {
      console.error('Create game error:', error);
      return { error };
    }
  };

  const joinGame = async (gameId: string) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    try {
      // Get game details
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        return { error: { message: 'Game not found' } };
      }

      if (game.status !== 'open') {
        return { error: { message: 'Game is not open for joining' } };
      }

      // Check if user has sufficient balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance_cents')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance_cents < game.stake_amount_cents) {
        return { error: { message: 'Insufficient balance' } };
      }

      // Join the game
      const { error: joinError } = await supabase
        .from('game_participants')
        .insert({
          game_id: gameId,
          user_id: user.id,
          stake_amount_cents: game.stake_amount_cents,
        });

      if (joinError) return { error: joinError };

      // Create transaction for stake
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          type: 'stake',
          amount_cents: -game.stake_amount_cents,
          description: `Staked $${(game.stake_amount_cents / 100).toFixed(2)} for "${game.title}"`,
          game_id: gameId,
          status: 'completed',
        });

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
      }

      // Create activity
      await supabase.from('activities').insert({
        user_id: user.id,
        type: 'game_joined',
        title: 'Joined a challenge',
        description: `"${game.title}" - Staked: $${(game.stake_amount_cents / 100).toFixed(2)}`,
        game_id: gameId,
        is_public: true,
      });

      // Refresh games and activities
      await refreshGames();
      await refreshActivities();

      return { error: null };
    } catch (error) {
      console.error('Join game error:', error);
      return { error };
    }
  };

  const submitProof = async (gameId: string, proof: {
    photoUrl?: string;
    location?: { latitude: number; longitude: number };
    notes?: string;
  }) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    try {
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

      if (error) return { error };

      await refreshGames();
      return { error: null };
    } catch (error) {
      console.error('Submit proof error:', error);
      return { error };
    }
  };

  const getGameParticipants = async (gameId: string): Promise<GameParticipant[]> => {
    try {
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
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getGameParticipants:', error);
      return [];
    }
  };

  const value = {
    activeGames,
    userGames,
    currentUserGame,
    activities,
    loadingGames,
    loadingActivities,
    refreshGames,
    refreshActivities,
    createGame,
    joinGame,
    submitProof,
    getGameParticipants,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};


