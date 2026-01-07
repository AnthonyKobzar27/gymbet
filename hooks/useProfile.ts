import { useState, useCallback } from 'react';
import { getStats } from '@/lib/homepage_utils';
import { getUserGames } from '@/lib/game';

export const useProfile = (userHash: string | null) => {
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  const loadUserMetrics = useCallback(async (hash: string) => {
    const stats = await getStats(hash);
    setTotalWorkouts(stats.workoutLogged);
    const games = await getUserGames(hash);
    setGamesPlayed(games.length);
  }, []);

  return {
    totalWorkouts,
    gamesPlayed,
    loadUserMetrics,
  };
};

