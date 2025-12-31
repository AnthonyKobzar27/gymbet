import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Text, Image, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import SwipeableTabScreen from '@/components/SwipeableTabScreen';
import LoginModal from '@/components/modals/LoginModal';
import ProofSubmissionModal from '@/components/modals/ProofSubmissionModal';
import CreateGameModal from '@/components/bets/CreateGameModal';
import ActiveGameView from '@/components/bets/ActiveGameView';
import JoinableGamesView from '@/components/bets/JoinableGamesView';
import HowToPlayModal from '@/components/modals/HowToPlayModal';
import GuestView from '@/components/common/GuestView';
import { UserAvatar } from '@/components/Avatar';
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

type TabType = 'players' | 'log';

export default function BetsScreen() {
  const { user, getUserProfile } = useAuth();
  const route = useRoute();
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
  const [howToPlayModalVisible, setHowToPlayModalVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string; balance: number } | null>(null);

  useEffect(() => {
    loadUserHash();
    if (user) {
      loadUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (user) {
      const profile = await getUserProfile();
      setUserProfile(profile);
    }
  };

  const handleProfilePress = () => {
    triggerHaptic('light');
    router.push('/profile');
  };

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
      await setupGameNotifications();
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
      await setupGameNotifications();
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

  return (
    <SwipeableTabScreen currentTab={route.name}>
      <ImageBackground 
        source={require('@/assets/images/AppBackground.jpg')} 
        style={styles.background}
        resizeMode="cover"
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
          <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
            <View style={styles.scrollWrapper}>
              <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator>
                <View style={styles.content}>
                  <View style={styles.scrollableHeader}>
                    <Text style={styles.headerTitle}>GAMES</Text>
                    <View style={styles.headerRightContainer}>
                      <TouchableOpacity style={styles.headerHowToPlayButton} onPress={handleHowToPlayPress}>
                        <Text style={styles.headerHowToPlayText}>How to Play</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.headerProfileBubble, !user && styles.headerProfileBubbleGuest]}
                        onPress={handleProfilePress}
                      >
                        {user && userProfile?.hash ? (
                          <UserAvatar hash={userProfile.hash} size={36} />
                        ) : (
                          <Image source={require('@/assets/images/noprofile.png')} style={styles.profileImage} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

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
                      <JoinableGamesView
                        joinableGames={joinableGames}
                        onJoinGame={handleJoinGame}
                        onCreateGame={() => {
                          triggerHaptic('medium');
                          setCreateModalVisible(true);
                        }}
                        formatDate={formatDate}
                      />
                      
                      <TouchableOpacity
                        style={styles.buttonSecondary}
                        onPress={handleJoinRandomGame}
                      >
                        <Text style={styles.buttonSecondaryText}>JOIN RANDOM GAME</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.buttonPrimary}
                        onPress={() => {
                          triggerHaptic('medium');
                          setCreateModalVisible(true);
                        }}
                      >
                        <Text style={styles.buttonPrimaryText}>CREATE GAME</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        )}

        <LoginModal visible={loginModalVisible} onClose={() => setLoginModalVisible(false)} />
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
      </ImageBackground>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 10,
  },
  content: {
    padding: 5,
    paddingBottom: 100,
  },
  scrollableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    marginBottom: 16,
    marginHorizontal: -5,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerHowToPlayButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  headerHowToPlayText: {
    color: '#000000',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textAlign: 'center',
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
  buttonPrimary: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  buttonPrimaryText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  buttonSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  buttonSecondaryText: {
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
});
