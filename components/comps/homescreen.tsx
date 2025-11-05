import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert, Image } from 'react-native';
import { ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { getStats, addSleep } from '@/lib/homepage_utils';
import { getActivityFeed, subscribeToActivityFeed, voteOnProof, removeVote, getVoteCounts, getUserVotes } from '@/lib/activity_log_utils';
import { getUserActiveGame } from '@/lib/game_utils';
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
  type: 'wakeup' | 'comment' | 'bet' | 'win';
  image?: string | null;
  approvals?: number;
  rejections?: number;
  userVote?: 'approve' | 'reject' | null;
}

// Purely presentational home screen – no navigation/auth logic, just UI
export default function HomeScreen() {
  const { getUserProfile } = useAuth();
  const [sleepAverage, setSleepAverage] = useState(0);
  const [profitMade, setProfitMade] = useState(0);
  const [sleepData, setSleepData] = useState([0]);
  const [profitData, setProfitData] = useState([0]);
  const [userHash, setUserHash] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [hasActiveGame, setHasActiveGame] = useState(false);

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
        type: newLog.typeofmessage as 'wakeup' | 'comment' | 'bet' | 'win',
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
      setSleepAverage(stats.sleepAverage);
      setProfitMade(stats.profitMade);
      setSleepData(stats.sleepHistory.length > 0 ? stats.sleepHistory : [0]);
      setProfitData(stats.profitHistory.length > 0 ? stats.profitHistory : [0]);
    }
  };

  const checkActiveGame = async () => {
    const profile = await getUserProfile();
    if (profile?.hash) {
      console.log('=== Checking for active game ===');
      const activeGame = await getUserActiveGame(profile.hash);
      console.log('Active game:', activeGame ? activeGame.id : 'none');
      setHasActiveGame(!!activeGame);
    }
  };

  const loadFeed = async () => {
    const logs = await getActivityFeed();

    // Get activity IDs for fetching votes
    const activityIds = logs.map(log => log.id);

    // Load vote counts and user votes in parallel
    const [voteCounts, userVotesMap] = await Promise.all([
      getVoteCounts(activityIds),
      userHash ? getUserVotes(activityIds, userHash) : Promise.resolve(new Map()),
    ]);

    const items: FeedItem[] = logs.map(log => {
      const counts = voteCounts.get(log.id) || { approvals: 0, rejections: 0 };
      const userVote = userVotesMap.get(log.id) || null;

      return {
        id: log.id.toString(),
        userHash: log.user_hash,
        action: log.message,
        timestamp: formatTimestamp(log.timestep),
        type: log.typeofmessage as 'wakeup' | 'comment' | 'bet' | 'win',
        image: log.image,
        approvals: counts.approvals,
        rejections: counts.rejections,
        userVote: userVote,
      };
    });

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

  const handleAddSleep = async () => {
    if (!userHash) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const result = await addSleep(userHash, 8);
    if (result.ok) {
      Alert.alert('Success', 'Added 8 hours of sleep!');
      loadUserData();
    } else {
      console.error('Failed to add sleep:', result.error);
      Alert.alert('Error', `Failed to add sleep: ${result.error?.message || 'Unknown error'}`);
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
      <View style = {[styles.scrollWrapper, {height: Dimensions.get("window").height - 50}]}>
      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>

          {/* Average Sleep with Chart */}
          <TouchableOpacity
            style={styles.arcadeCard}
            onPress={handleAddSleep}
          >
            <View style={styles.cardInner}>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Text style={styles.statLabel}>AVG SLEEP / DAY</Text>
                  <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{sleepAverage}h</Text>
                </View>
                <View style={styles.chartContainer}>
                  <MiniLineChart data={sleepData} color="#000" height={60} />
                </View>
              </View>
              <View style={styles.dividerLight} />
              <View style={styles.linkRow}>
                <Text style={styles.linkText}>TAP TO ADD 8H →</Text>
              </View>
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
                feedItems.map((item) => (
                  <View key={item.id} style={styles.feedItem}>
                    <View style={styles.feedHeader}>
                      <View style={styles.feedUserRow}>
                        <UserAvatar hash={item.userHash} size={32} />
                        <View style={styles.feedUserInfo}>
                          <Text style={styles.feedUser}>
                            {item.userHash.substring(0, 8)}...
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
                    {item.type === 'wakeup' && (
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
                ))
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
    overflow: 'hidden' 
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    overflow: 'hidden',
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
});