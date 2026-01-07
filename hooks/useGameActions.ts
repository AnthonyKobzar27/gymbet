import { useCallback } from 'react';
import { Alert } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';
import { joinGame, leaveGame, getGameDetails, submitWakeupProof, sendChatMessage, getJoinableGames } from '@/lib/game';
import { useDataCache } from '@/contexts/DataCacheContext';
import { GameWithPlayers } from '@/types/game';

export const useGameActions = (
  userHash: string | null,
  activeGame: GameWithPlayers | null,
  _onGamesReload?: () => void // Keep for backwards compat but use cache instead
) => {
  const { refreshBalance, refreshGames } = useDataCache();

  const handleJoinGame = useCallback(
    async (gameId: string) => {
      if (!userHash) {
        triggerHaptic('error');
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      triggerHaptic('medium');
      const gameDetails = await getGameDetails(gameId);
      if (!gameDetails) {
        triggerHaptic('error');
        Alert.alert('Error', 'Could not load game details');
        return;
      }

      const result = await joinGame(gameId, userHash);

      if (result.ok) {
        triggerHaptic('success');
        await Promise.all([refreshBalance(), refreshGames()]);
        Alert.alert('Success!', 'Successfully joined the game!');
      } else {
        triggerHaptic('error');
        Alert.alert('Error', `Failed to join game: ${result.error?.message || 'Unknown error'}`);
      }
    },
    [userHash, refreshBalance, refreshGames]
  );

  const handleLeaveGame = useCallback(async () => {
    if (!activeGame || !userHash) return;

    triggerHaptic('warning');
    Alert.alert(
      'Leave Game?',
      `Are you sure you want to leave? You will get your $${activeGame.stake} stake refunded.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => triggerHaptic('light') },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('medium');
            const result = await leaveGame(activeGame.id, userHash);

            if (result.ok) {
              triggerHaptic('success');
              await Promise.all([refreshBalance(), refreshGames()]);
              const refundAmount = result.refunded || activeGame.stake || 0;
              Alert.alert('Success', `You left the game and received a $${refundAmount.toFixed(2)} refund!`);
            } else {
              triggerHaptic('error');
              Alert.alert('Error', `Failed to leave game: ${result.error?.message || 'Unknown error'}`);
            }
          },
        },
      ]
    );
  }, [activeGame, userHash, refreshBalance, refreshGames]);

  const handleJoinRandomGame = useCallback(async () => {
    if (!userHash) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please log in first');
      return;
    }

    triggerHaptic('medium');
    const games = await getJoinableGames(true);

    if (games.length === 0) {
      triggerHaptic('warning');
      Alert.alert('No Games Available', 'There are no free games to join right now!');
      return;
    }

    const randomGame = games[0];
    const result = await joinGame(randomGame.id, userHash);

    if (result.ok) {
      triggerHaptic('success');
      await Promise.all([refreshBalance(), refreshGames()]);
      Alert.alert('Success!', 'Joined free game!');
    } else {
      triggerHaptic('error');
      Alert.alert('Error', result.error?.message || 'Failed to join game');
    }
  }, [userHash, refreshBalance, refreshGames]);

  const handleProofSubmit = useCallback(
    async (photoUri: string, caption: string) => {
      if (!activeGame || !userHash) return;

      triggerHaptic('medium');
      const result = await submitWakeupProof(
        activeGame.id,
        userHash,
        photoUri,
        caption,
        activeGame.split_type
      );

      if (result.ok) {
        triggerHaptic(result.isOnTime ? 'success' : 'warning');
        Alert.alert(
          'Success!',
          result.isOnTime ? 'Your workout proof was submitted on time!' : 'Proof submitted LATE!'
        );
        await refreshGames();
      } else {
        triggerHaptic('error');
        throw new Error(result.error?.message || 'Failed to submit proof');
      }
    },
    [activeGame, userHash, refreshGames]
  );

  const handleSendMessage = useCallback(
    async (chatMessage: string, setChatMessage: (msg: string) => void, setSendingMessage: (sending: boolean) => void) => {
      if (!activeGame || !userHash || !chatMessage.trim()) return;

      triggerHaptic('light');
      setSendingMessage(true);
      try {
        const result = await sendChatMessage(activeGame.id, userHash, chatMessage);
        if (result.ok) {
          setChatMessage('');
          await refreshGames();
        } else {
          triggerHaptic('error');
          Alert.alert('Error', 'Failed to send message');
        }
      } catch {
        Alert.alert('Error', 'Failed to send message');
      } finally {
        setSendingMessage(false);
      }
    },
    [activeGame, userHash, refreshGames]
  );

  return {
    handleJoinGame,
    handleLeaveGame,
    handleJoinRandomGame,
    handleProofSubmit,
    handleSendMessage,
  };
};
