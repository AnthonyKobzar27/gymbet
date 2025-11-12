import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Modal, TextInput } from 'react-native';
import { ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { getStats, addWorkout, canLogWorkoutToday as checkCanLogWorkout } from '@/lib/homepage_utils';
import { subscribeToActivityFeed, voteOnProof, removeVote, getVoteCounts, getUserVotes, getProofsForValidator, checkPBFTValidation } from '@/lib/activity_log_utils';
import { getUserActiveGame, getGameDetails } from '@/lib/game_utils';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { UserAvatar } from '@/components/Avatar';

const MiniLineChart = ({ data, color = '#000', height = 60 }: { data: number[], color?: string, height?: number }) => {
  const width = 180;
  const padding = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#E0E0E0" strokeWidth="1" />
      {/* Line */}
      <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth="3" />
      {/* Points */}
      {data.map((value, index) => {
        const x = data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((value - min) / range) * (height - 2 * padding);
        return <Circle key={index} cx={x} cy={y} r="3" fill={color} />;
      })}
    </Svg>
  );
};

const MiniLineChart2 = ({ data, color = '#000', height = 60 }: { data: number[], color?: string, height?: number }) => {
  const width = 180;
  const padding = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#E0E0E0" strokeWidth="1" />
      {/* Line */}
      <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth="3" />
      {/* Points */}
      {data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((value - min) / range) * (height - 2 * padding);
        return <Circle key={index} cx={x} cy={y} r="3" fill={color} />;
      })}
    </Svg>
  );
};



interface FeedItem {
  id: string;
  userHash: string;
  action: string;
  timestamp: string;
  type: 'workout' | 'comment' | 'bet' | 'win';
  image?: string | null;
  approvals?: number;
  rejections?: number;
  userVote?: 'approve' | 'reject' | null;
}

// Purely presentational home screen – no navigation/auth logic, just UI
export default function HomeScreen() {
  const { getUserProfile } = useAuth();
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [profitMade, setProfitMade] = useState(0);
  const [workoutData, setWorkoutData] = useState([0]);
  const [profitData, setProfitData] = useState([0]);
  const [userHash, setUserHash] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitInput, setSplitInput] = useState('');
  const [currentSplitDay, setCurrentSplitDay] = useState('');
  const [canLogWorkoutToday, setCanLogWorkoutToday] = useState(true);

  useEffect(() => {
    loadUserData();
    loadFeed();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToActivityFeed((newLog) => {
      const newItem: FeedItem = {
        id: newLog.id.toString(),
        userHash: newLog.user_hash,
        action: newLog.message,
        timestamp: formatTimestamp(newLog.timestep),
        type: newLog.typeofmessage as 'workout' | 'comment' | 'bet' | 'win',
        image: newLog.image,
      };
      setFeedItems((prev) => [newItem, ...prev]);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Check for active game every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkActiveGame();
    }, [])
  );

  const loadUserData = async () => {
    const profile = await getUserProfile();
    if (profile?.hash) {
      setUserHash(profile.hash);
      const stats = await getStats(profile.hash);
      setTotalWorkouts(stats.workoutLogged); // Show total workouts instead of average
      setProfitMade(stats.profitMade);
      setWorkoutData(stats.workoutHistory.length > 0 ? stats.workoutHistory : [0]);
      setProfitData(stats.profitHistory.length > 0 ? stats.profitHistory : [0]);
      setCurrentSplitDay(stats.currentSplitDay || 'No split set');

      // Check if user can log workout today
      const canLog = await checkCanLogWorkout(profile.hash);
      setCanLogWorkoutToday(canLog);
    }
  };

  const checkActiveGame = async () => {
    const profile = await getUserProfile();
    if (profile?.hash) {
      console.log('=== Checking for active game ===');
      const game = await getUserActiveGame(profile.hash);
      console.log('Active game:', game ? game.id : 'none');

      if (game) {
        // Load full game details with weekly schedule
        const gameDetails = await getGameDetails(game.id);
        setHasActiveGame(true);
        setActiveGame(gameDetails);

        // Update current split day based on the game schedule
        if (gameDetails?.weekly_schedule) {
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
          const today = days[new Date().getDay()];
          setCurrentSplitDay(gameDetails.weekly_schedule[today as keyof typeof gameDetails.weekly_schedule] || 'Rest');
        } else {
          setCurrentSplitDay('No game joined');
        }
      } else {
        setHasActiveGame(false);
        setActiveGame(null);
        setCurrentSplitDay('No game joined');
      }
    }
  };

  const loadFeed = async () => {
    if (!userHash) {
      console.log('No user hash, skipping feed load');
      return;
    }

    console.log('=== Loading feed for validator ===');
    console.log('User hash:', userHash);

    // Get proofs assigned to this user for validation (PBFT system)
    const logs = await getProofsForValidator(userHash);
    console.log('Proofs assigned for validation:', logs.length);

    // Get activity IDs for fetching votes
    const activityIds = logs.map(log => log.id);

    // Load vote counts and user votes in parallel
    const [voteCounts, userVotesMap] = await Promise.all([
      getVoteCounts(activityIds),
      getUserVotes(activityIds, userHash),
    ]);

    const items: FeedItem[] = logs.map(log => {
      const counts = voteCounts.get(log.id) || { approvals: 0, rejections: 0 };
      const userVote = userVotesMap.get(log.id) || null;

      return {
        id: log.id.toString(),
        userHash: log.user_hash,
        action: log.message,
        timestamp: formatTimestamp(log.timestep),
        type: log.typeofmessage as 'workout' | 'comment' | 'bet' | 'win',
        image: log.image,
        approvals: counts.approvals,
        rejections: counts.rejections,
        userVote: userVote,
      };
    });

    console.log('Feed items loaded:', items.length);
    setFeedItems(items);
  };

  const formatTimestamp = (timestep: string): string => {
    const now = new Date();
    const then = new Date(timestep);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffMins / 1440)} day${Math.floor(diffMins / 1440) > 1 ? 's' : ''} ago`;
  };

  const handleOpenSplitModal = () => {
    setSplitInput('');
    setSplitModalVisible(true);
  };

  const handleSubmitWorkout = async () => {
    if (!userHash) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!splitInput.trim()) {
      Alert.alert('Invalid Input', 'Please enter the workout for today (e.g., Push, Pull, Legs)');
      return;
    }

    setSplitModalVisible(false);
    const result = await addWorkout(userHash, splitInput.trim());
    if (result.ok) {
      Alert.alert('Success', `Logged ${splitInput} workout!`);
      setCanLogWorkoutToday(false); // Disable workout logging immediately
      loadUserData();
    } else {
      console.error('Failed to add workout:', result.error);
      const errorMessage = result.error?.message || 'Unknown error';

      // Show special message if already logged today
      if (errorMessage.includes('already logged workout today')) {
        Alert.alert('Already Logged', 'You have already logged your workout for today. Come back tomorrow!');
      } else {
        Alert.alert('Error', `Failed to log workout: ${errorMessage}`);
      }
    }
  };

  const handleVote = async (activityId: string, voteType: 'approve' | 'reject') => {
    if (!userHash) {
      Alert.alert('Error', 'Please log in to vote');
      return;
    }

    const activityIdNum = parseInt(activityId);
    const currentItem = feedItems.find((item) => item.id === activityId);
    const isTogglingSameVote = currentItem?.userVote === voteType;

    // Update the feed item locally for immediate feedback
    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.id === activityId) {
          const wasApproved = item.userVote === 'approve';
          const wasRejected = item.userVote === 'reject';
          const isApproving = voteType === 'approve';
          const isRejecting = voteType === 'reject';

          let newApprovals = item.approvals || 0;
          let newRejections = item.rejections || 0;

          // Remove previous vote if exists
          if (wasApproved) newApprovals--;
          if (wasRejected) newRejections--;

          // Add new vote if different from previous
          if (item.userVote === voteType) {
            // Toggling off the same vote
            return {
              ...item,
              userVote: null,
              approvals: newApprovals,
              rejections: newRejections,
            };
          } else {
            // Switching to new vote
            if (isApproving) newApprovals++;
            if (isRejecting) newRejections++;

            return {
              ...item,
              userVote: voteType,
              approvals: newApprovals,
              rejections: newRejections,
            };
          }
        }
        return item;
      })
    );

    // Persist vote to database
    try {
      if (isTogglingSameVote) {
        // Remove the vote
        const result = await removeVote(activityIdNum, userHash);
        if (!result.ok) {
          throw new Error('Failed to remove vote');
        }
      } else {
        // Add or update the vote
        const result = await voteOnProof(activityIdNum, userHash, voteType);
        if (!result.ok) {
          throw new Error('Failed to submit vote');
        }
      }

      // Check PBFT validation status after vote
      console.log('Checking PBFT validation status...');
      const validation = await checkPBFTValidation(activityIdNum);
      console.log('PBFT Status:', validation.status, 'Approvals:', validation.approvals, '/', validation.required);

      if (validation.status === 'approved') {
        Alert.alert('Proof Approved!', 'This proof has been validated by 2/3 majority (PBFT consensus)');
      } else if (validation.status === 'rejected') {
        Alert.alert('Proof Rejected', 'This proof was rejected by the validators');
      }
    } catch (error) {
      console.error('Error voting:', error);
      // Revert the optimistic update on error
      loadFeed();
    }
  };
  
  return (
    <ImageBackground
      source={require('../../assets/images/AppBackground.jpg')}
      style={styles.background}
      imageStyle={{resizeMode: "cover"}}
    >
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.scrollWrapper}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>

          {/* Training Split Tracker */}
          <TouchableOpacity
            style={styles.arcadeCard}
            onPress={canLogWorkoutToday && hasActiveGame ? handleOpenSplitModal : undefined}
            disabled={!canLogWorkoutToday || !hasActiveGame}
          >
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>WEEKLY SPLIT</Text>
              <View style={styles.spacer} />

              {!hasActiveGame ? (
                <Text style={styles.noGameText}>
                  Join a game to see your weekly split!
                </Text>
              ) : activeGame?.weekly_schedule ? (
                <>
                  {/* Weekly Schedule Grid */}
                  <View style={styles.weeklyGrid}>
                    {['M', 'T', 'W', 'TH', 'F', 'S', 'S'].map((dayLabel, index) => {
                      const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                      const dayName = dayNames[index];
                      const workout = activeGame.weekly_schedule[dayName];
                      const todayIndex = (new Date().getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
                      const isToday = index === todayIndex;

                      return (
                        <View key={index} style={[styles.dayBox, isToday && styles.dayBoxActive]}>
                          <Text style={[styles.dayBoxLabel, isToday && styles.dayBoxLabelActive]}>{dayLabel}</Text>
                          <Text style={[styles.dayBoxValue, isToday && styles.dayBoxValueActive]}>{workout}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.dividerLight} />
                  <View style={styles.metricRow}>
                    <View style={styles.metricLeft}>
                      <Text style={styles.statLabel}>TODAY</Text>
                      <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{currentSplitDay}</Text>
                      <Text style={styles.statSubtext}>{totalWorkouts} total workouts</Text>
                    </View>
                    <View style={styles.chartContainer}>
                      <MiniLineChart data={workoutData} color="#000" height={60} />
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.noGameText}>Loading schedule...</Text>
              )}

              {hasActiveGame && canLogWorkoutToday && (
                <>
                  <View style={styles.dividerLight} />
                  <View style={styles.linkRow}>
                    <Text style={styles.linkText}>LOG WORKOUT →</Text>
                  </View>
                </>
              )}
              {hasActiveGame && !canLogWorkoutToday && (
                <>
                  <View style={styles.dividerLight} />
                  <View style={styles.linkRow}>
                    <Text style={styles.linkTextDisabled}>✓ LOGGED TODAY</Text>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Profit with Chart */}
          <View style={styles.arcadeCard}>
            <View style={styles.cardInner}>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Text style={styles.statLabel}>TOTAL PROFIT</Text>
                  <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>${profitMade}</Text>
                </View>
                <View style={styles.chartContainer}>
                <MiniLineChart2 data={profitData} color="#000" height={60} />
                </View>
              </View>
            </View>
          </View>

          {/* Feed Section */}
          <View style={styles.arcadeCard}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>ACTIVITY FEED</Text>
              <View style={styles.spacer} />

              {feedItems.length === 0 ? (
                <Text style={styles.feedAction}>No activity yet. Be the first to join a game!</Text>
              ) : (
                <ScrollView
                  style={styles.feedScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {feedItems.map((item) => (
                    <View key={item.id} style={styles.feedItem}>
                      <View style={styles.feedHeader}>
                        <View style={styles.feedUserRow}>
                          <UserAvatar hash={item.userHash} size={32} />
                          <View style={styles.feedUserInfo}>
                            <Text style={styles.feedUser}>
                              0x{item.userHash.substring(0, 8)}...
                            </Text>
                            <Text style={styles.feedTimestamp}>{item.timestamp}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.feedAction}>{item.action}</Text>
                      {item.image && (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.feedImage}
                          resizeMode="cover"
                        />
                      )}
                      {item.type === 'workout' && (
                        <View style={styles.voteContainer}>
                          <TouchableOpacity
                            style={[
                              styles.voteButton,
                              styles.approveButton,
                              item.userVote === 'approve' && styles.voteButtonActive
                            ]}
                            onPress={() => handleVote(item.id, 'approve')}
                          >
                            <Text style={[
                              styles.voteButtonText,
                              item.userVote === 'approve' && styles.voteButtonTextActive
                            ]}>
                              ✓ ACCEPT {item.approvals ? `(${item.approvals})` : ''}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.voteButton,
                              styles.rejectButton,
                              item.userVote === 'reject' && styles.voteButtonActive
                            ]}
                            onPress={() => handleVote(item.id, 'reject')}
                          >
                            <Text style={[
                              styles.voteButtonText,
                              item.userVote === 'reject' && styles.voteButtonTextActive
                            ]}>
                              ✕ REJECT {item.rejections ? `(${item.rejections})` : ''}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity style={styles.viewMoreButton} onPress={loadFeed}>
                <Text style={styles.viewMoreText}>REFRESH ACTIVITY →</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Action Buttons - Only show if user doesn't have an active game */}
          {!hasActiveGame && (
            <>
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={() => router.push('/bets')}
              >
                <Text style={styles.buttonPrimaryText}>CREATE NEW GAME</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => router.push('/bets')}
              >
                <Text style={styles.buttonSecondaryText}>JOIN RANDOM GAME</Text>
              </TouchableOpacity>
            </>
          )}
          
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>

    {/* Workout Split Log Modal */}
    <Modal
      animationType="fade"
      transparent={true}
      visible={splitModalVisible}
      onRequestClose={() => setSplitModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sleepModalContent}>
          <Text style={styles.sleepModalTitle}>LOG WORKOUT</Text>
          <Text style={styles.sleepModalSubtitle}>What's your split today?</Text>

          <TextInput
            style={styles.sleepInput}
            value={splitInput}
            onChangeText={setSplitInput}
            placeholder="e.g., Push, Pull, Legs"
            placeholderTextColor="#999"
            maxLength={50}
          />

          <View style={styles.sleepModalButtons}>
            <TouchableOpacity
              style={styles.sleepModalButtonSecondary}
              onPress={() => setSplitModalVisible(false)}
            >
              <Text style={styles.sleepModalButtonSecondaryText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sleepModalButtonPrimary}
              onPress={handleSubmitWorkout}
            >
              <Text style={styles.sleepModalButtonPrimaryText}>LOG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 50,
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricLeft: {
    flex: 1,
    minWidth: 100,
    maxWidth: 150,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 36,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 4,
    minHeight: 45,
  },
  statSubtext: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#4CAF50',
  },
  chartContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: 0,
    maxWidth: 180,
    overflow: 'hidden',
  },
  chartLabel: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginTop: 4,
    color: '#666',
  },
  dividerLight: {
    height: 2,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  linkRow: {
    alignItems: 'flex-end',
  },
  linkText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  linkTextDisabled: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    color: '#999',
  },
  feedScrollView: {
    maxHeight: 600,
  },
  feedItem: {
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
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feedUserInfo: {
    marginLeft: 10,
    flex: 1,
  },
  feedEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  feedUser: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  feedTimestamp: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#999',
    letterSpacing: 0.3,
  },
  feedAction: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    lineHeight: 18,
  },
  feedImage: {
    width: '100%',
    height: 200,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#000',
  },
  voteContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  voteButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  approveButton: {
    backgroundColor: '#FFF',
  },
  rejectButton: {
    backgroundColor: '#FFF',
  },
  voteButtonActive: {
    backgroundColor: '#000',
  },
  voteButtonText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 0.5,
  },
  voteButtonTextActive: {
    color: '#FFF',
  },
  viewMoreButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  viewMoreText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 10,
    paddingTop: 50,
  },
  buttonPrimary: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: '#000',
    padding: 18,
    marginBottom: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepModalContent: {
    backgroundColor: '#FFF',
    borderWidth: 4,
    borderColor: '#000',
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  sleepModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  sleepModalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sleepInput: {
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 16,
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sleepModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sleepModalButtonPrimary: {
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
  sleepModalButtonPrimaryText: {
    color: '#FFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sleepModalButtonSecondary: {
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
  sleepModalButtonSecondaryText: {
    color: '#000',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    marginHorizontal: 2,
  },
  dayBoxActive: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  dayBoxLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#666',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dayBoxLabelActive: {
    color: '#FFF',
  },
  dayBoxValue: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    textAlign: 'center',
  },
  dayBoxValueActive: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
  noGameText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    textAlign: 'center',
    paddingVertical: 24,
  },
});