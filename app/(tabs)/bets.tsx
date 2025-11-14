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
import { setupGameNotifications } from '@/lib/notification_utils';
import GuestView from '@/components/common/GuestView';

type TabType = 'players' | 'log';

export default function BetsScreen() {
  const { user, getUserProfile } = useAuth();
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [userHash, setUserHash] = useState<string | null>(null);

  // Game data
  const [activeGame, setActiveGame] = useState<GameWithPlayers | null>(null);
  const [joinableGames, setJoinableGames] = useState<Game[]>([]);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [proofModalVisible, setProofModalVisible] = useState(false);

  // Tab selection for active game view
  const [selectedTab, setSelectedTab] = useState<TabType>('players');

  // Track if user has submitted proof today
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  // Chat state
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

  // Reload games whenever the screen comes into focus
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

    // Check for active game first
    const activeGameData = await getUserActiveGame(userHash);

    if (activeGameData) {
      // User has an active game - load full details
      const gameDetails = await getGameDetails(activeGameData.id);
      setActiveGame(gameDetails);
      setJoinableGames([]);

      // Check if user has submitted today
      const today = new Date().toISOString().split('T')[0];
      const submissions = await getGameSubmissions(activeGameData.id, today);
      const userSubmission = submissions.find(s => s.user_hash === userHash);
      setHasSubmittedToday(!!userSubmission);
    } else {
      // No active game - load joinable games
      const joinable = await getJoinableGames();
      setJoinableGames(joinable);
      setActiveGame(null);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!userHash) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Get game details to get split type
    const gameDetails = await getGameDetails(gameId);
    if (!gameDetails) {
      Alert.alert('Error', 'Could not load game details');
      return;
    }

    const result = await joinGame(gameId, userHash);

    if (result.ok) {
      // Set up notifications for this game
      await setupGameNotifications(gameDetails.split_type);

      Alert.alert(
        'Success!',
        'Successfully joined the game! Your stake has been deducted.\n\n📱 Notifications enabled:\n• Daily workout reminder'
      );
      loadGames();
    } else {
      Alert.alert('Error', `Failed to join game: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const handleLeaveGame = async () => {
    if (!activeGame || !userHash) return;

    Alert.alert(
      'Leave Game?',
      `Are you sure you want to leave? You will get your $${activeGame.stake} stake refunded.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const result = await leaveGame(activeGame.id, userHash);

            if (result.ok) {
              Alert.alert('Success', `You left the game and received a $${result.refunded} refund!`);
              loadGames();
            } else {
              Alert.alert('Error', `Failed to leave game: ${result.error?.message || 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  const handleProofSubmit = async (photoUri: string, caption: string) => {
    if (!activeGame || !userHash) return;

    const result = await submitWakeupProof(
      activeGame.id,
      userHash,
      photoUri,
      caption,
      activeGame.split_type
    );

    if (result.ok) {
      Alert.alert(
        'Success!',
        result.isOnTime
          ? 'Your workout proof was submitted on time!'
          : 'Your workout proof was submitted, but it was late.'
      );
      loadGames();
    } else {
      throw new Error(result.error?.message || 'Failed to submit proof');
    }
  };

  const handleSendMessage = async () => {
    if (!activeGame || !userHash || !chatMessage.trim()) return;

    setSendingMessage(true);
    try {
      const result = await sendChatMessage(activeGame.id, userHash, chatMessage);

      if (result.ok) {
        setChatMessage('');
        loadGames();
      } else {
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
          onLoginPress={() => setLoginModalVisible(true)}
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
                    onSubmitProof={() => setProofModalVisible(true)}
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
                    onCreateGame={() => setCreateModalVisible(true)}
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
