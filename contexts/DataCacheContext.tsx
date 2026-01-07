import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Game, WeeklySchedule, GameWithPlayers } from '@/types/game';
import { ProofItem } from '@/types/proof';
import { useAuth } from './AuthContext';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface UserProfile {
  username: string;
  email: string;
  hash: string;
  balance: number;
  gender?: string | null;
}

interface CacheData {
  userProfile: UserProfile | null;
  activeGame: GameWithPlayers | null;
  weeklySchedule: WeeklySchedule | null;
  joinableGames: Game[];
  notifications: Notification[];
  unreadCount: number;
  allProofs: ProofItem[];
  myProofs: ProofItem[];
  myVotes: ProofItem[];
  isPreloaded: boolean;
  isLoading: boolean;
  cachedUserId: string | null; // Track which user the cache belongs to
}

interface DataCacheContextType {
  cache: CacheData;
  preloadAllData: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshGames: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshProofs: () => Promise<void>;
  setActiveGame: (game: GameWithPlayers | null, schedule: WeeklySchedule | null) => void;
  setJoinableGames: (games: Game[]) => void;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  setProofs: (all: ProofItem[], my: ProofItem[], votes: ProofItem[]) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  clearCache: () => void;
}

const initialCache: CacheData = {
  userProfile: null,
  activeGame: null,
  weeklySchedule: null,
  joinableGames: [],
  notifications: [],
  unreadCount: 0,
  allProofs: [],
  myProofs: [],
  myVotes: [],
  isPreloaded: false,
  isLoading: false,
  cachedUserId: null,
};

const DataCacheContext = createContext<DataCacheContextType | null>(null);

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const { user, getUserProfile: authGetProfile } = useAuth();
  const [cache, setCache] = useState<CacheData>(initialCache);
  const lastUserId = useRef<string | null>(null);

  // Clear cache and trigger preload when user changes
  useEffect(() => {
    const currentUserId = user?.id || null;
    
    // User signed out
    if (!currentUserId) {
      if (lastUserId.current !== null) {
        console.log('User signed out, clearing cache');
        setCache(initialCache);
      }
      lastUserId.current = null;
      return;
    }
    
    // Different user signed in
    if (currentUserId !== lastUserId.current) {
      console.log('New user detected, clearing cache and triggering preload');
      setCache(initialCache);
      lastUserId.current = currentUserId;
    }
  }, [user?.id]);

  // Preload all data for current user
  const preloadAllData = useCallback(async () => {
    if (!user) return;
    
    // Check if already loading or preloaded for current user
    if (cache.isLoading) return;
    if (cache.isPreloaded && cache.cachedUserId === user.id) return;
    
    setCache(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Get profile first
      const profile = await authGetProfile();
      if (!profile?.hash) {
        setCache(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Import utilities dynamically
      const [
        { getUserActiveGame, getGameDetails, getJoinableGames },
        { getNotifications, getUnreadCount },
        { getActivityFeed, getVoteCounts, getUserVotes },
        { getBlockedUsers },
      ] = await Promise.all([
        import('@/lib/game'),
        import('@/lib/notification_utils'),
        import('@/lib/activityLog'),
        import('@/lib/flagging_utils'),
      ]);

      // Fetch all data in parallel
      const [
        activeGame,
        joinableGames,
        notifications,
        unreadCount,
        activityLogs,
        blockedUsers,
      ] = await Promise.all([
        getUserActiveGame(profile.hash),
        getJoinableGames(),
        getNotifications(profile.hash),
        getUnreadCount(profile.hash),
        getActivityFeed(),
        getBlockedUsers(profile.hash),
      ]);

      // Get game details if active game exists
      let weeklySchedule: WeeklySchedule | null = null;
      let gameWithPlayers: GameWithPlayers | null = null;
      if (activeGame) {
        const details = await getGameDetails(activeGame.id);
        if (details) {
          gameWithPlayers = details;
          weeklySchedule = details.weekly_schedule || null;
        }
      }

      // Process proofs
      const workoutLogs = activityLogs.filter(log => log.typeofmessage === 'workout');
      const logIds = workoutLogs.map(log => log.id);
      
      const [voteCounts, userVotesMap] = await Promise.all([
        logIds.length > 0 ? getVoteCounts(logIds) : Promise.resolve(new Map()),
        logIds.length > 0 ? getUserVotes(logIds, profile.hash) : Promise.resolve(new Map()),
      ]);

      const processProof = (log: any): ProofItem => {
        const counts = voteCounts.get(log.id) || { approvals: 0, rejections: 0 };
        const userVote = userVotesMap.get(log.id);
        const createdAt = new Date(log.timestep);
        const now = new Date();
        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const isPending = log.validation_status === 'pending';
        const timeRemaining = isPending ? Math.max(0, 24 - hoursElapsed) : undefined;

        // Debug logging for images
        if (log.image) {
          console.log(`[DataCache] Proof ${log.id} has image:`, log.image);
        }

        return {
          id: log.id.toString(),
          userHash: log.user_hash,
          message: log.message || '',
          image: log.image || null, // FIXED: was log.image_url, should be log.image
          timestamp: createdAt.toLocaleDateString(),
          approvals: counts.approvals,
          rejections: counts.rejections,
          validationStatus: log.validation_status || 'pending',
          canVote: isPending && log.user_hash !== profile.hash && !blockedUsers.includes(log.user_hash),
          isPending,
          timeRemaining,
          userVote,
          createdAt, // Added missing createdAt property
        };
      };

      const allProofs = workoutLogs
        .filter(log => !blockedUsers.includes(log.user_hash))
        .map(processProof);
      
      const myProofs = workoutLogs
        .filter(log => log.user_hash === profile.hash)
        .map(processProof);
      
      const myVotes = workoutLogs
        .filter(log => userVotesMap.has(log.id))
        .map(processProof);

      setCache({
        userProfile: profile,
        activeGame: gameWithPlayers,
        weeklySchedule,
        joinableGames,
        notifications,
        unreadCount,
        allProofs,
        myProofs,
        myVotes,
        isPreloaded: true,
        isLoading: false,
        cachedUserId: user.id,
      });
    } catch (error) {
      console.error('Preload error:', error);
      setCache(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, authGetProfile, cache.isLoading, cache.isPreloaded, cache.cachedUserId]);

  // Auto-preload when user is available and cache is empty/stale
  useEffect(() => {
    if (user && !cache.isPreloaded && !cache.isLoading) {
      preloadAllData();
    }
  }, [user, cache.isPreloaded, cache.isLoading, preloadAllData]);

  // Individual refresh functions
  const refreshBalance = useCallback(async () => {
    if (!cache.userProfile?.hash) return;
    
    try {
      const { getBalance } = await import('@/lib/transaction_utils');
      const balance = await getBalance(cache.userProfile.hash);
      setCache(prev => ({
        ...prev,
        userProfile: prev.userProfile ? { ...prev.userProfile, balance } : null,
      }));
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }, [cache.userProfile?.hash]);

  const refreshGames = useCallback(async () => {
    if (!cache.userProfile?.hash) return;
    
    try {
      const { getUserActiveGame, getGameDetails, getJoinableGames } = await import('@/lib/game');
      
      const [activeGame, joinableGames] = await Promise.all([
        getUserActiveGame(cache.userProfile.hash),
        getJoinableGames(),
      ]);

      let weeklySchedule: WeeklySchedule | null = null;
      let gameWithPlayers: GameWithPlayers | null = null;
      if (activeGame) {
        const details = await getGameDetails(activeGame.id);
        if (details) {
          gameWithPlayers = details;
          weeklySchedule = details.weekly_schedule || null;
        }
      }

      setCache(prev => ({
        ...prev,
        activeGame: gameWithPlayers,
        weeklySchedule,
        joinableGames,
      }));
    } catch (error) {
      console.error('Failed to refresh games:', error);
    }
  }, [cache.userProfile?.hash]);

  const refreshNotifications = useCallback(async () => {
    if (!cache.userProfile?.hash) return;
    
    try {
      const { getNotifications, getUnreadCount } = await import('@/lib/notification_utils');
      
      const [notifications, unreadCount] = await Promise.all([
        getNotifications(cache.userProfile.hash),
        getUnreadCount(cache.userProfile.hash),
      ]);

      setCache(prev => ({ ...prev, notifications, unreadCount }));
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }, [cache.userProfile?.hash]);

  const refreshProofs = useCallback(async () => {
    if (!cache.userProfile?.hash) return;
    
    try {
      const { getActivityFeed, getVoteCounts, getUserVotes } = await import('@/lib/activityLog');
      const { getBlockedUsers } = await import('@/lib/flagging_utils');

      const [activityLogs, blockedUsers] = await Promise.all([
        getActivityFeed(),
        getBlockedUsers(cache.userProfile.hash),
      ]);

      const workoutLogs = activityLogs.filter(log => log.typeofmessage === 'workout');
      const logIds = workoutLogs.map(log => log.id);
      
      const [voteCounts, userVotesMap] = await Promise.all([
        logIds.length > 0 ? getVoteCounts(logIds) : Promise.resolve(new Map()),
        logIds.length > 0 ? getUserVotes(logIds, cache.userProfile!.hash) : Promise.resolve(new Map()),
      ]);

      const processProof = (log: any): ProofItem => {
        const counts = voteCounts.get(log.id) || { approvals: 0, rejections: 0 };
        const userVote = userVotesMap.get(log.id);
        const createdAt = new Date(log.timestep);
        const now = new Date();
        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const isPending = log.validation_status === 'pending';
        const timeRemaining = isPending ? Math.max(0, 24 - hoursElapsed) : undefined;

        // Debug logging for images
        if (log.image) {
          console.log(`[DataCache refreshProofs] Proof ${log.id} has image:`, log.image);
        }

        return {
          id: log.id.toString(),
          userHash: log.user_hash,
          message: log.message || '',
          image: log.image || null, // FIXED: was log.image_url, should be log.image
          timestamp: createdAt.toLocaleDateString(),
          approvals: counts.approvals,
          rejections: counts.rejections,
          validationStatus: log.validation_status || 'pending',
          canVote: isPending && log.user_hash !== cache.userProfile!.hash && !blockedUsers.includes(log.user_hash),
          isPending,
          timeRemaining,
          userVote,
          createdAt, // Added missing createdAt property
        };
      };

      const allProofs = workoutLogs.filter(log => !blockedUsers.includes(log.user_hash)).map(processProof);
      const myProofs = workoutLogs.filter(log => log.user_hash === cache.userProfile!.hash).map(processProof);
      const myVotes = workoutLogs.filter(log => userVotesMap.has(log.id)).map(processProof);

      setCache(prev => ({ ...prev, allProofs, myProofs, myVotes }));
    } catch (error) {
      console.error('Failed to refresh proofs:', error);
    }
  }, [cache.userProfile?.hash]);

  const setActiveGame = useCallback((game: GameWithPlayers | null, schedule: WeeklySchedule | null) => {
    setCache(prev => ({ ...prev, activeGame: game, weeklySchedule: schedule }));
  }, []);

  const setJoinableGames = useCallback((games: Game[]) => {
    setCache(prev => ({ ...prev, joinableGames: games }));
  }, []);

  const setNotifications = useCallback((notifications: Notification[], unreadCount: number) => {
    setCache(prev => ({ ...prev, notifications, unreadCount }));
  }, []);

  const setProofs = useCallback((all: ProofItem[], my: ProofItem[], votes: ProofItem[]) => {
    setCache(prev => ({ ...prev, allProofs: all, myProofs: my, myVotes: votes }));
  }, []);

  const setUserProfile = useCallback((profile: UserProfile | null) => {
    setCache(prev => ({ ...prev, userProfile: profile }));
  }, []);

  const clearCache = useCallback(() => {
    setCache(initialCache);
  }, []);

  return (
    <DataCacheContext.Provider value={{
      cache,
      preloadAllData,
      refreshBalance,
      refreshGames,
      refreshNotifications,
      refreshProofs,
      setActiveGame,
      setJoinableGames,
      setNotifications,
      setProofs,
      setUserProfile,
      clearCache,
    }}>
      {children}
    </DataCacheContext.Provider>
  );
}

// Safe hook that returns defaults when not in provider (for initial renders)
export function useDataCache(): DataCacheContextType {
  const context = useContext(DataCacheContext);
  if (!context) {
    // Return safe defaults during initial render before provider is ready
    return {
      cache: initialCache,
      preloadAllData: async () => {},
      refreshBalance: async () => {},
      refreshGames: async () => {},
      refreshNotifications: async () => {},
      refreshProofs: async () => {},
      setActiveGame: () => {},
      setJoinableGames: () => {},
      setNotifications: () => {},
      setProofs: () => {},
      setUserProfile: () => {},
      clearCache: () => {},
    };
  }
  return context;
}
