import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/modals/LoginModal';
import ProofSubmissionModal from '@/components/modals/ProofSubmissionModal';
import { UserAvatar } from '@/components/Avatar';
import {
  getJoinableGames,
  getUserActiveGame,
  createGame,
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
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [userHash, setUserHash] = useState<string | null>(null);

  // Game data
  const [activeGame, setActiveGame] = useState<GameWithPlayers | null>(null);
  const [joinableGames, setJoinableGames] = useState<Game[]>([]);

  // Create game modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGameSchedule, setNewGameSchedule] = useState({
    monday: 'Push',
    tuesday: 'Pull',
    wednesday: 'Legs',
    thursday: 'Push',
    friday: 'Pull',
    saturday: 'Legs',
    sunday: 'Rest',
  });
  const [newGameStake, setNewGameStake] = useState('10');

  // Tab selection for active game view
  const [selectedTab, setSelectedTab] = useState<TabType>('players');

  // Track if user has submitted proof today
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  // Modal visibility states
  const [proofModalVisible, setProofModalVisible] = useState(false);

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

  const loadUserHash = async () => {
    console.log('=== loadUserHash ===');
    const profile = await getUserProfile();
    console.log('Profile:', profile);
    if (profile?.hash) {
      setUserHash(profile.hash);
      console.log('User hash set:', profile.hash);
    }
  };

  const loadGames = async () => {
    console.log('=== loadGames ===');
    console.log('Loading games for user:', userHash);

    if (!userHash) return;

    // Check for active game first
    const activeGameData = await getUserActiveGame(userHash);
    console.log('Active game check:', activeGameData ? activeGameData.id : 'none');

    if (activeGameData) {
      // User has an active game - load full details
      const gameDetails = await getGameDetails(activeGameData.id);
      console.log('Active game details loaded:', {
        id: gameDetails?.id,
        playerCount: gameDetails?.players.length,
        logsCount: gameDetails?.logs.length,
      });
      setActiveGame(gameDetails);
      setJoinableGames([]); // Clear joinable games

      // Check if user has submitted today
      const today = new Date().toISOString().split('T')[0];
      const submissions = await getGameSubmissions(activeGameData.id, today);
      const userSubmission = submissions.find(s => s.user_hash === userHash);
      setHasSubmittedToday(!!userSubmission);
      console.log('User submitted today:', !!userSubmission);
    } else {
      // No active game - load joinable games
      const joinable = await getJoinableGames();
      console.log('Joinable games loaded:', joinable.length);
      setJoinableGames(joinable);
      setActiveGame(null);
    }
  };

  const handleCreateGame = async () => {
    console.log('=== handleCreateGame ===');
    console.log('Weekly schedule:', newGameSchedule);
    console.log('Stake:', newGameStake);

    if (!newGameStake) {
      Alert.alert('Error', 'Please enter a stake amount');
      return;
    }

    const stake = parseFloat(newGameStake);
    if (isNaN(stake) || stake <= 0) {
      Alert.alert('Error', 'Please enter a valid stake amount');
      return;
    }

    console.log('Creating game...');
    const result = await createGame(newGameSchedule, stake);

    if (result.ok && result.game) {
      console.log('Game created successfully:', result.game.id);
      Alert.alert('Success', 'Game created! You can now join it.');
      setCreateModalVisible(false);
      setNewGameSchedule({
        monday: 'Push',
        tuesday: 'Pull',
        wednesday: 'Legs',
        thursday: 'Push',
        friday: 'Pull',
        saturday: 'Legs',
        sunday: 'Rest',
      });
      setNewGameStake('10');
      loadGames();
    } else {
      console.error('Failed to create game:', result.error);
      Alert.alert('Error', `Failed to create game: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    console.log('=== handleJoinGame ===');
    console.log('Game ID:', gameId);
    console.log('User hash:', userHash);

    if (!userHash) {
      console.error('No user hash!');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Get game details to get split type
    const gameDetails = await getGameDetails(gameId);
    if (!gameDetails) {
      Alert.alert('Error', 'Could not load game details');
      return;
    }

    console.log('Joining game...');
    const result = await joinGame(gameId, userHash);

    if (result.ok) {
      console.log('Successfully joined game:', gameId);

      // Set up notifications for this game
      console.log('Setting up notifications for split:', gameDetails.split_type);
      await setupGameNotifications(gameDetails.split_type);

      Alert.alert(
        'Success!',
        'Successfully joined the game! Your stake has been deducted.\n\n📱 Notifications enabled:\n• Daily workout reminder'
      );
      loadGames();
    } else {
      console.error('Failed to join game:', result.error);
      Alert.alert('Error', `Failed to join game: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const handleLeaveGame = async () => {
    if (!activeGame || !userHash) return;

    console.log('=== handleLeaveGame ===');

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

    console.log('=== handleProofSubmit ===');
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
      loadGames(); // Reload to update submission status
    } else {
      throw new Error(result.error?.message || 'Failed to submit proof');
    }
  };

  const handleSendMessage = async () => {
    if (!activeGame || !userHash || !chatMessage.trim()) return;

    console.log('=== handleSendMessage ===');
    setSendingMessage(true);
    try {
      const result = await sendChatMessage(activeGame.id, userHash, chatMessage);

      if (result.ok) {
        console.log('Chat message sent successfully');
        setChatMessage('');
        loadGames(); // Reload to update logs
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
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

  const renderActiveGameView = () => {
    if (!activeGame) return null;

    return (
      <>
        {/* Game Header */}
        <View style={styles.arcadeCard}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>MY CURRENT GAME</Text>
            <View style={styles.spacer} />

            {/* Weekly Schedule */}
            {activeGame.weekly_schedule && (
              <>
                <View style={styles.scheduleGrid}>
                  <View style={styles.scheduleRow}>
                    <Text style={styles.dayLabel}>M</Text>
                    <Text style={styles.dayValue}>{activeGame.weekly_schedule.monday}</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Text style={styles.dayLabel}>T</Text>
                    <Text style={styles.dayValue}>{activeGame.weekly_schedule.tuesday}</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Text style={styles.dayLabel}>W</Text>
                    <Text style={styles.dayValue}>{activeGame.weekly_schedule.wednesday}</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Text style={styles.dayLabel}>TH</Text>
                    <Text style={styles.dayValue}>{activeGame.weekly_schedule.thursday}</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Text style={styles.dayLabel}>F</Text>
                    <Text style={styles.dayValue}>{activeGame.weekly_schedule.friday}</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Text style={styles.dayLabel}>S</Text>
                    <Text style={styles.dayValue}>{activeGame.weekly_schedule.saturday}</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Text style={styles.dayLabel}>S</Text>
                    <Text style={styles.dayValue}>{activeGame.weekly_schedule.sunday}</Text>
                  </View>
                </View>
                <View style={styles.spacer} />
              </>
            )}

            <View style={styles.gameStatsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>STAKE</Text>
                <Text style={styles.statValue}>${activeGame.stake}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>POOL</Text>
                <Text style={styles.statValue}>${activeGame.stake * activeGame.player_count}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>PLAYERS</Text>
                <Text style={styles.statValue}>{activeGame.players.length}/8</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                {activeGame.status === 'active' ? 'GAME ACTIVE' : 'WAITING FOR PLAYERS'}
              </Text>
              <Text style={styles.playerCount}>
                {activeGame.players.length}/8 Players
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'players' && styles.tabActive]}
            onPress={() => setSelectedTab('players')}
          >
            <Text style={[styles.tabText, selectedTab === 'players' && styles.tabTextActive]}>
              PLAYERS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'log' && styles.tabActive]}
            onPress={() => setSelectedTab('log')}
          >
            <Text style={[styles.tabText, selectedTab === 'log' && styles.tabTextActive]}>
              LOG
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.arcadeCard}>
          <View style={styles.cardInner}>
            {selectedTab === 'players' && (
              <>
                <Text style={styles.cardTitle}>PLAYERS ({activeGame.players.length}/8)</Text>
                <View style={styles.spacer} />
                {activeGame.players.map((player, index) => (
                  <View key={player.id} style={styles.playerItem}>
                    <UserAvatar hash={player.user_hash} size={40} />
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerHash}>
                        0x{player.user_hash.substring(0, 12)}...
                      </Text>
                      <Text style={styles.playerWakeups}>
                        {player.total_workouts} workouts
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {selectedTab === 'log' && (
              <>
                <Text style={styles.cardTitle}>ACTIVITY LOG</Text>
                <View style={styles.spacer} />
                {activeGame.logs.length === 0 ? (
                  <Text style={styles.emptyText}>No activity yet</Text>
                ) : (
                  <ScrollView
                    style={styles.logScrollView}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {activeGame.logs.map((log) => (
                      <View key={log.id} style={styles.logItem}>
                        <View style={styles.logHeader}>
                          <Text style={styles.logType}>
                            {log.event_type.toUpperCase()}
                          </Text>
                          <Text style={styles.logTime}>
                            {formatDate(log.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.logMessage}>{log.message}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Chat Input */}
                <View style={styles.chatInputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    multiline
                    maxLength={500}
                    editable={!sendingMessage}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (sendingMessage || !chatMessage.trim()) && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={sendingMessage || !chatMessage.trim()}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.sendButtonText}>SEND</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Submit Proof Button */}
        <TouchableOpacity
          style={[
            styles.submitProofButton,
            (hasSubmittedToday || activeGame.status !== 'active') && styles.submitProofButtonDisabled
          ]}
          onPress={() => {
            if (!hasSubmittedToday && activeGame.status === 'active') {
              setProofModalVisible(true);
            }
          }}
          disabled={hasSubmittedToday || activeGame.status !== 'active'}
        >
          <Text style={styles.submitProofButtonText}>
            {activeGame.status !== 'active'
              ? `WAITING FOR PLAYERS... (${activeGame.players.length}/8)`
              : hasSubmittedToday
                ? 'PROOF SUBMITTED TODAY ✓'
                : 'SUBMIT WORKOUT PROOF'}
          </Text>
        </TouchableOpacity>

        {/* Leave Game Button - Only show if game hasn't started */}
        {activeGame.status === 'joinable' && (
          <TouchableOpacity
            style={styles.leaveGameButton}
            onPress={handleLeaveGame}
          >
            <Text style={styles.leaveGameButtonText}>
              LEAVE GAME
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderJoinableGamesView = () => {
    return (
      <>
        {/* Joinable Games */}
        <View style={styles.arcadeCard}>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>JOINABLE GAMES</Text>
            <View style={styles.spacer} />

            {joinableGames.length === 0 ? (
              <Text style={styles.emptyText}>No games available. Create one!</Text>
            ) : (
              joinableGames.map((game) => (
                <View key={game.id} style={styles.gameItem}>
                  <View style={styles.gameHeader}>
                    <Text style={styles.gameTitle}>Weekly Split</Text>
                    <Text style={styles.gameStake}>${game.stake}</Text>
                  </View>

                  {game.weekly_schedule && (
                    <View style={styles.scheduleGrid}>
                      <View style={styles.scheduleRow}>
                        <Text style={styles.dayLabel}>M</Text>
                        <Text style={styles.dayValue}>{game.weekly_schedule.monday}</Text>
                      </View>
                      <View style={styles.scheduleRow}>
                        <Text style={styles.dayLabel}>T</Text>
                        <Text style={styles.dayValue}>{game.weekly_schedule.tuesday}</Text>
                      </View>
                      <View style={styles.scheduleRow}>
                        <Text style={styles.dayLabel}>W</Text>
                        <Text style={styles.dayValue}>{game.weekly_schedule.wednesday}</Text>
                      </View>
                      <View style={styles.scheduleRow}>
                        <Text style={styles.dayLabel}>TH</Text>
                        <Text style={styles.dayValue}>{game.weekly_schedule.thursday}</Text>
                      </View>
                      <View style={styles.scheduleRow}>
                        <Text style={styles.dayLabel}>F</Text>
                        <Text style={styles.dayValue}>{game.weekly_schedule.friday}</Text>
                      </View>
                      <View style={styles.scheduleRow}>
                        <Text style={styles.dayLabel}>S</Text>
                        <Text style={styles.dayValue}>{game.weekly_schedule.saturday}</Text>
                      </View>
                      <View style={styles.scheduleRow}>
                        <Text style={styles.dayLabel}>S</Text>
                        <Text style={styles.dayValue}>{game.weekly_schedule.sunday}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.gameInfo}>
                    <Text style={styles.gamePlayers}>
                      {game.player_count}/8 Players
                    </Text>
                    <Text style={styles.gameCreated}>
                      {formatDate(game.created_at)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => handleJoinGame(game.id)}
                  >
                    <Text style={styles.joinButtonText}>JOIN GAME →</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Create Game Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Text style={styles.createButtonText}>+ CREATE NEW GAME</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <ImageBackground
      source={require('../../assets/images/AppBackground.jpg')}
      style={styles.background}
      imageStyle={{resizeMode: "cover"}}
    >
      {!user ? (
        <View style={styles.guestContainer}>
          <Text style={styles.guestTitle}>Bets</Text>
          <Text style={styles.guestSubtitle}>
            Please login to view and join games
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setLoginModalVisible(true)}
          >
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.scrollWrapper}>
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.content}>
                {activeGame ? renderActiveGameView() : renderJoinableGamesView()}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      )}

      {/* Login Modal */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
      />

      {/* Create Game Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>CREATE NEW GAME</Text>
            <Text style={styles.modalSubtitle}>Set your weekly workout split</Text>

            {/* Two Column Layout for Days */}
            <View style={styles.daysGrid}>
              {/* Left Column */}
              <View style={styles.daysColumn}>
                <View style={styles.dayInputGroup}>
                  <Text style={styles.dayInputLabel}>MON</Text>
                  <TextInput
                    style={styles.dayInput}
                    value={newGameSchedule.monday}
                    onChangeText={(text) => setNewGameSchedule({...newGameSchedule, monday: text})}
                    placeholder="Push"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.dayInputGroup}>
                  <Text style={styles.dayInputLabel}>TUE</Text>
                  <TextInput
                    style={styles.dayInput}
                    value={newGameSchedule.tuesday}
                    onChangeText={(text) => setNewGameSchedule({...newGameSchedule, tuesday: text})}
                    placeholder="Pull"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.dayInputGroup}>
                  <Text style={styles.dayInputLabel}>WED</Text>
                  <TextInput
                    style={styles.dayInput}
                    value={newGameSchedule.wednesday}
                    onChangeText={(text) => setNewGameSchedule({...newGameSchedule, wednesday: text})}
                    placeholder="Legs"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.dayInputGroup}>
                  <Text style={styles.dayInputLabel}>THU</Text>
                  <TextInput
                    style={styles.dayInput}
                    value={newGameSchedule.thursday}
                    onChangeText={(text) => setNewGameSchedule({...newGameSchedule, thursday: text})}
                    placeholder="Push"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Right Column */}
              <View style={styles.daysColumn}>
                <View style={styles.dayInputGroup}>
                  <Text style={styles.dayInputLabel}>FRI</Text>
                  <TextInput
                    style={styles.dayInput}
                    value={newGameSchedule.friday}
                    onChangeText={(text) => setNewGameSchedule({...newGameSchedule, friday: text})}
                    placeholder="Pull"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.dayInputGroup}>
                  <Text style={styles.dayInputLabel}>SAT</Text>
                  <TextInput
                    style={styles.dayInput}
                    value={newGameSchedule.saturday}
                    onChangeText={(text) => setNewGameSchedule({...newGameSchedule, saturday: text})}
                    placeholder="Legs"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.dayInputGroup}>
                  <Text style={styles.dayInputLabel}>SUN</Text>
                  <TextInput
                    style={styles.dayInput}
                    value={newGameSchedule.sunday}
                    onChangeText={(text) => setNewGameSchedule({...newGameSchedule, sunday: text})}
                    placeholder="Rest"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>

            {/* Stake Amount */}
            <Text style={styles.inputLabel}>STAKE AMOUNT ($)</Text>
            <TextInput
              style={styles.input}
              value={newGameStake}
              onChangeText={setNewGameStake}
              placeholder="10"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleCreateGame}
              >
                <Text style={styles.modalButtonPrimaryText}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Proof Submission Modal */}
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
  arcadeCard: {
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#FFF',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  cardInner: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 16,
  },
  gameStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  playerCount: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  tabActive: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#FFF',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  playerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  playerHash: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    marginBottom: 2,
  },
  playerWakeups: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  logScrollView: {
    maxHeight: 300,
  },
  logItem: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
    padding: 10,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logType: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    letterSpacing: 0.5,
  },
  logTime: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
  },
  logMessage: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  gameItem: {
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FAFAFA',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameWakeTime: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  gameStake: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: '#4CAF50',
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gamePlayers: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  gameCreated: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  joinButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  createButton: {
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
  createButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  guestTitle: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000000',
    marginBottom: 16,
  },
  guestSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: '#000',
    padding: 24,
    margin: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: '#000',
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  modalButtonPrimaryText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  modalButtonSecondaryText: {
    color: '#000',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  submitProofButton: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  submitProofButtonDisabled: {
    backgroundColor: '#CCC',
    borderColor: '#999',
  },
  submitProofButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  leaveGameButton: {
    backgroundColor: '#FF4444',
    borderWidth: 4,
    borderColor: '#000',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  leaveGameButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 13,
    letterSpacing: 1,
  },
  chatInputContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#000',
    borderWidth: 3,
    borderColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
    borderColor: '#999',
  },
  sendButtonText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 12,
  },
  scheduleRow: {
    alignItems: 'center',
    minWidth: 40,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  dayValue: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  gameTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  daysColumn: {
    flex: 1,
  },
  dayInputGroup: {
    marginBottom: 10,
  },
  dayInputLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    color: '#666',
    marginBottom: 4,
  },
  dayInput: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 10,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
