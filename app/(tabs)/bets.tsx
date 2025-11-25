import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import LoginModal from '@/components/modals/LoginModal';
import ProofSubmissionModal from '@/components/modals/ProofSubmissionModal';
import CreateGameModal from '@/components/bets/CreateGameModal';
import ActiveGameView from '@/components/bets/ActiveGameView';
import JoinableGamesView from '@/components/bets/JoinableGamesView';
import { triggerHaptic } from '@/lib/haptics';
import {
  getJoinableGames,
  getUserActiveGame,
  joinGame,
  leaveGame,
  getGameDetails,
  submitWakeupProof,
  sendChatMessage,
  getGameSubmissions,
  Game,
  GameWithPlayers,
} from '@/lib/game_utils';
import { setupGameNotifications, clearGameNotifications } from '@/lib/notification_utils';
import GuestView from '@/components/common/GuestView';

type TabType = 'players' | 'log';

export default function BetsScreen() {
  const { user, getUserProfile } = useAuth();
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [userHash, setUserHash] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<GameWithPlayers | null>(null);
  const [joinableGames, setJoinableGames] = useState<Game[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('players');
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadUserHash();
  }, [user]);

  useEffect(() => {
    if (userHash) {
      loadGames();
    }
  }, [userHash]);

  useFocusEffect(
    useCallback(() => {
      if (userHash) {
        loadGames();
      }
    }, [userHash])
  );

  const loadUserHash = async () => {
    const profile = await getUserProfile();
    if (profile?.hash) {
      setUserHash(profile.hash);
    }
  };

  const loadGames = async () => {
    if (!userHash) return;
    const activeGameData = await getUserActiveGame(userHash);

    if (activeGameData) {
      const gameDetails = await getGameDetails(activeGameData.id);
      setActiveGame(gameDetails);
      setJoinableGames([]);

      const today = new Date().toISOString().split('T')[0];
      const submissions = await getGameSubmissions(activeGameData.id, today);
      const userSubmission = submissions.find(s => s.user_hash === userHash);
      setHasSubmittedToday(!!userSubmission);
    } else {
      // If user is not in a game, only show free games (stake = 0)
      const joinable = await getJoinableGames(true);
      setJoinableGames(joinable);
      setActiveGame(null);
    }
  };

  const handleJoinGame = async (gameId: string) => {
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
      await setupGameNotifications();

      Alert.alert(
        'Success!',
        'Successfully joined the game!'
      );
      loadGames();
    } else {
      triggerHaptic('error');
      Alert.alert('Error', `Failed to join game: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const handleLeaveGame = async () => {
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
              await clearGameNotifications();
              Alert.alert('Success', `You left the game and received a $${result.refunded} refund!`);
              loadGames();
            } else {
              triggerHaptic('error');
              Alert.alert('Error', `Failed to leave game: ${result.error?.message || 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  const handleProofSubmit = async (photoUri: string, caption: string) => {
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
        result.isOnTime
          ? 'Your workout proof was submitted on time!'
          : 'Proof submitted LATE!'
      );
      loadGames();
    } else {
      triggerHaptic('error');
      throw new Error(result.error?.message || 'Failed to submit proof');
    }
  };

  const handleSendMessage = async () => {
    if (!activeGame || !userHash || !chatMessage.trim()) return;

    triggerHaptic('light');
    setSendingMessage(true);
    try {
      const result = await sendChatMessage(activeGame.id, userHash, chatMessage);

      if (result.ok) {
        setChatMessage('');
        loadGames();
      } else {
        triggerHaptic('error');
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <ImageBackground
      source={require('../../assets/images/AppBackground.jpg')}
      style={styles.background}
      imageStyle={{resizeMode: "cover"}}
    >
      {!user ? (
        <GuestView
          title="Bets"
          subtitle="Please login to view and join games"
          onLoginPress={() => {
            triggerHaptic('medium');
            setLoginModalVisible(true);
          }}
        />
      ) : (
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.scrollWrapper}>
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.content}>
                {activeGame ? (
                  <ActiveGameView
                    activeGame={activeGame}
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    hasSubmittedToday={hasSubmittedToday}
                    onSubmitProof={() => {
                      triggerHaptic('medium');
                      setProofModalVisible(true);
                    }}
                    onLeaveGame={handleLeaveGame}
                    chatMessage={chatMessage}
                    onChatMessageChange={setChatMessage}
                    onSendMessage={handleSendMessage}
                    sendingMessage={sendingMessage}
                    formatDate={formatDate}
                  />
                ) : (
                  <JoinableGamesView
                    joinableGames={joinableGames}
                    onJoinGame={handleJoinGame}
                    onCreateGame={() => {
                      triggerHaptic('medium');
                      setCreateModalVisible(true);
                    }}
                    formatDate={formatDate}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      )}

      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
      />

      <CreateGameModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onGameCreated={loadGames}
      />

      {activeGame && userHash && (
        <ProofSubmissionModal
          visible={proofModalVisible}
          onClose={() => setProofModalVisible(false)}
          onSubmit={handleProofSubmit}
          gameId={activeGame.id}
          splitType={activeGame.split_type}
        />
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 10,
    paddingTop: 50,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
});
