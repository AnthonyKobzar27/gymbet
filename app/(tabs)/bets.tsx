import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Text, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});
import { useFocusEffect, router } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import ProofSubmissionModal from '@/components/modals/ProofSubmissionModal';
import CreateGameModal from '@/components/bets/CreateGameModal';
import ActiveGameView from '@/components/bets/ActiveGameView';
import JoinableGamesView from '@/components/bets/JoinableGamesView';
import HowToPlayModal from '@/components/modals/HowToPlayModal';
import { triggerHaptic } from '@/lib/haptics';
import AppHeader from '@/components/common/AppHeader';
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

type TabType = 'players' | 'log';

export default function BetsScreen() {
  const { user, getUserProfile } = useAuth();
  const route = useRoute();
  const [userHash, setUserHash] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<GameWithPlayers | null>(null);
  const [joinableGames, setJoinableGames] = useState<Game[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('players');
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [howToPlayModalVisible, setHowToPlayModalVisible] = useState(false);

  useEffect(() => {
    loadUserHash();
  }, [user]);

  const handleHowToPlayPress = () => {
    triggerHaptic('medium');
    setHowToPlayModalVisible(true);
  };

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
      // await setupGameNotifications();
      Alert.alert('Success!', 'Successfully joined the game!');
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
              // await clearGameNotifications();
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

  const handleJoinRandomGame = async () => {
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
      // await setupGameNotifications();
      Alert.alert('Success!', 'Joined free game!');
      loadGames();
    } else {
      triggerHaptic('error');
      Alert.alert('Error', result.error?.message || 'Failed to join game');
    }
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
        result.isOnTime ? 'Your workout proof was submitted on time!' : 'Proof submitted LATE!'
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
    } catch {
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

  useEffect(() => {
    if (!user) {
      router.replace('/signin');
    }
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <View style={styles.background}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
          <AppHeader />
            <ScrollView 
              style={styles.scrollContent} 
              showsVerticalScrollIndicator 
              contentContainerStyle={styles.scrollContentContainer}
            >
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
                <>
                  {/* Action Buttons */}
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={styles.actionButtonSecondary}
                      onPress={handleJoinRandomGame}
                    >
                      <Text style={styles.actionButtonSecondaryText}>JOIN RANDOM</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.actionButtonPrimary}
                      onPress={() => {
                        triggerHaptic('medium');
                        setCreateModalVisible(true);
                      }}
                    >
                      <Text style={styles.actionButtonPrimaryText}>CREATE GAME</Text>
                    </TouchableOpacity>
                  </View>

                  <JoinableGamesView
                    joinableGames={joinableGames}
                    onJoinGame={handleJoinGame}
                    onCreateGame={() => {
                      triggerHaptic('medium');
                      setCreateModalVisible(true);
                    }}
                    formatDate={formatDate}
                  />
                </>
              )}
            </ScrollView>
          </SafeAreaView>

        <CreateGameModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} onGameCreated={loadGames} />
        {activeGame && userHash && (
          <ProofSubmissionModal
            visible={proofModalVisible}
            onClose={() => setProofModalVisible(false)}
            onSubmit={handleProofSubmit}
            gameId={activeGame.id}
            splitType={activeGame.split_type}
          />
        )}
        <HowToPlayModal visible={howToPlayModalVisible} onClose={() => setHowToPlayModalVisible(false)} />
      </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f7f7f7',
  },
  safeArea: {
    flex: 1,
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f7f7f7',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    zIndex: 100,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButtonPrimaryText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: fontFamily,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionButtonSecondaryText: {
    color: '#000',
    textAlign: 'center',
    fontFamily: fontFamily,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  bellButton: {
    padding: 4,
    marginLeft: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fontFamily,
    fontWeight: '800',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tokenImage: {
    width: 20,
    height: 20,
  },
  tokenBalanceText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000000',
  },
  headerProfileBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfileBubbleGuest: {
    backgroundColor: '#E0E0E0',
    borderColor: '#999999',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 18,
  },
});
