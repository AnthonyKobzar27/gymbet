import { useState, useCallback, useEffect } from 'react';
import { Game, GameWithPlayers } from '@/types/game';
import { useDataCache } from '@/contexts/DataCacheContext';
import { getGameSubmissions } from '@/lib/game';

export const useGames = (userHash: string | null) => {
  const { cache, refreshGames } = useDataCache();
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  // Check submission status when active game changes
  useEffect(() => {
    const checkSubmission = async () => {
      if (cache.activeGame && userHash) {
        const today = new Date().toISOString().split('T')[0];
        const submissions = await getGameSubmissions(cache.activeGame.id, today);
        const userSubmission = submissions.find(s => s.user_hash === userHash);
        setHasSubmittedToday(!!userSubmission);
      } else {
        setHasSubmittedToday(false);
      }
    };
    checkSubmission();
  }, [cache.activeGame?.id, userHash]);

  const loadGames = useCallback(async () => {
    await refreshGames();
  }, [refreshGames]);

  return {
    activeGame: cache.activeGame,
    joinableGames: cache.joinableGames,
    hasSubmittedToday,
    loadGames,
  };
};
