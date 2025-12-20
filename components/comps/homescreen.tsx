import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, Modal, TextInput } from 'react-native';
import { ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/contexts/AuthContext';
import { getStats, addWorkout, canLogWorkoutToday as checkCanLogWorkout } from '@/lib/homepage_utils';
import { subscribeToActivityFeed, voteOnProof, removeVote, getVoteCounts, getUserVotes, getProofsForValidator, checkPBFTValidation } from '@/lib/activity_log_utils';
import { getUserActiveGame, getGameDetails, getJoinableGames, joinGame } from '@/lib/game_utils';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { UserAvatar } from '@/components/Avatar';
import { triggerHaptic } from '@/lib/haptics';
import FlagBlockModal from '@/components/modals/FlagBlockModal';
import { flagPost, blockUser, getBlockedUsers } from '@/lib/flagging_utils';
import HowToPlayModal from '@/components/modals/HowToPlayModal';

interface FeedItem {
  id: string;
  userHash: string;
  action: string;
  timestamp: string;
  type: 'workout' | 'proof' | 'comment' | 'bet' | 'win' | 'loss' | 'leave';
  image?: string | null;
  approvals?: number;
  rejections?: number;
  userVote?: 'approve' | 'reject' | null;
  createdAt?: Date;
  isPending?: boolean;
  timeRemaining?: number; // hours remaining
  validationStatus?: 'pending' | 'approved' | 'rejected';
  canVote?: boolean; // Whether user can vote on this proof
}

export default function HomeScreen() {
  const { user, getUserProfile } = useAuth();
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [profitMade, setProfitMade] = useState(0);
  const [workoutData, setWorkoutData] = useState([0]);
  const [userHash, setUserHash] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [activeGame, setActiveGame] = useState<any>(null);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitInput, setSplitInput] = useState('');
  const [currentSplitDay, setCurrentSplitDay] = useState('');
  const [canLogWorkoutToday, setCanLogWorkoutToday] = useState(true);
  const [flagBlockModalVisible, setFlagBlockModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [feedMode, setFeedMode] = useState<'proofs' | 'all'>('proofs');
  const [howToPlayModalVisible, setHowToPlayModalVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; email: string; hash: string, balance: number } | null>(null);

  useEffect(() => {
    loadUserData();
    loadFeed();
    loadBlockedUsers();
    if (user) {
      loadUserProfile();
    } else {
      setUserProfile(null);
    }

    const unsubscribe = subscribeToActivityFeed((newLog) => {
      const newItem: FeedItem = {
        id: newLog.id.toString(),
        userHash: newLog.user_hash,
        action: newLog.message,
        timestamp: formatTimestamp(newLog.timestep),
        type: newLog.typeofmessage as 'workout' | 'proof' | 'comment' | 'bet' | 'win' | 'loss' | 'leave',
        image: newLog.image,
      };
      setFeedItems((prev) => [newItem, ...prev]);
    });

    return () => {
      unsubscribe();
    };
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

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      checkActiveGame();
      if (userHash) {
        loadBlockedUsers().then(() => {
          loadFeed();
        });
      }
    }, [userHash])
  );

  const loadUserData = async () => {
    const profile = await getUserProfile();
    if (profile?.hash) {
      setUserHash(profile.hash);
      const stats = await getStats(profile.hash);
      setTotalWorkouts(stats.workoutLogged);
      setProfitMade(stats.profitMade);
      setWorkoutData(stats.workoutHistory.length > 0 ? stats.workoutHistory : [0]);
      setCurrentSplitDay(stats.currentSplitDay || 'No split set');

      const canLog = await checkCanLogWorkout(profile.hash);
      setCanLogWorkoutToday(canLog);
    }
  };

  const checkActiveGame = async () => {
    const profile = await getUserProfile();
    if (profile?.hash) {
      const game = await getUserActiveGame(profile.hash);

      if (game) {
        const gameDetails = await getGameDetails(game.id);
        setHasActiveGame(true);
        setActiveGame(gameDetails);

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
      return;
    }

    const { getActivityFeed, getProofsWithValidators } = await import('@/lib/activity_log_utils');
    const allActivityLogs = await getActivityFeed();

    const assignedProofs = await getProofsForValidator(userHash);
    const assignedProofIds = new Set(assignedProofs.map(p => p.id));

    const allProofIds = allActivityLogs
      .filter(log => log.typeofmessage === 'workout' || log.typeofmessage === 'proof')
      .map(log => log.id);

    const [voteCounts, userVotesMap, proofsWithValidators] = await Promise.all([
      getVoteCounts(allProofIds),
      getUserVotes(allProofIds, userHash),
      getProofsWithValidators(allProofIds),
    ]);

    // Separate proofs from other activity
    const proofLogs = allActivityLogs.filter(log => 
      log.typeofmessage === 'workout' || log.typeofmessage === 'proof'
    );
    const otherLogs = allActivityLogs.filter(log => 
      log.typeofmessage !== 'workout' && log.typeofmessage !== 'proof'
    );

    // Process proofs with pending status and timer
    const proofItems: FeedItem[] = proofLogs.map(log => {
      const counts = voteCounts.get(log.id) || { approvals: 0, rejections: 0 };
      const userVote = userVotesMap.get(log.id) || null;
      const isAssignedForValidation = assignedProofIds.has(log.id);
      const hasValidatorsAssigned = proofsWithValidators.has(log.id);
      const createdAt = new Date(log.timestep);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      // Check if proof has reached consensus (can't vote anymore)
      const totalVotes = counts.approvals + counts.rejections;
      const requiredApprovals = log.required_approvals || 0;
      const totalValidators = log.total_validators || 0;
      
      // If proof has validators assigned, use PBFT consensus
      // If proof has NO validators assigned (legacy), use simple majority with 10+ votes
      let hasReachedConsensus = false;
      
      const MIN_VOTES_FOR_DECISION = 10;
      
      // CRITICAL: Proofs need at least 10 votes to reach consensus - if < 10 votes, stay PENDING
      if (totalVotes < MIN_VOTES_FOR_DECISION) {
        hasReachedConsensus = false; // Stay pending, allow voting
      } else if (hasValidatorsAssigned && totalValidators > 0) {
        // PBFT consensus: requires 2/3 majority (only if >= 10 votes)
        hasReachedConsensus = 
          (counts.approvals >= requiredApprovals) ||
          (counts.rejections > (totalValidators - requiredApprovals)) ||
          log.validation_status === 'approved' ||
          log.validation_status === 'rejected';
      } else {
        // Legacy consensus: simple majority with 10+ votes
        // Approve if approvals > rejections AND total votes >= 10
        // Reject if rejections > approvals AND total votes >= 10
        const approvalMajority = counts.approvals > counts.rejections;
        const rejectionMajority = counts.rejections > counts.approvals;
        hasReachedConsensus = 
          approvalMajority ||
          rejectionMajority ||
          log.validation_status === 'approved' ||
          log.validation_status === 'rejected';
      }
      
      // Calculate time remaining first
      const timeRemaining = 48 - hoursSinceCreation;
      
      // Determine validation status FIRST
      // If proof has reached consensus, mark as approved/rejected
      // If proof is older than 48 hours and hasn't reached consensus, still mark as pending (but won't show at top)
      let validationStatus: 'pending' | 'approved' | 'rejected' = 'pending';
      
      // CRITICAL: Check database status first - if already approved/rejected, use that
      if (log.validation_status === 'approved' || log.validation_status === 'rejected') {
        validationStatus = log.validation_status;
      } else if (totalVotes < MIN_VOTES_FOR_DECISION) {
        // CRITICAL: If < 10 votes, always stay PENDING (allow voting)
        validationStatus = 'pending';
      } else if (hasReachedConsensus) {
        if (hasValidatorsAssigned && totalValidators > 0) {
          // PBFT consensus (only reached if >= 10 votes)
          if (counts.approvals >= requiredApprovals) {
            validationStatus = 'approved';
          } else if (counts.rejections > (totalValidators - requiredApprovals)) {
            validationStatus = 'rejected';
          }
        } else {
          // Legacy consensus: simple majority (only reached if >= 10 votes)
          if (counts.approvals > counts.rejections) {
            validationStatus = 'approved';
          } else if (counts.rejections > counts.approvals) {
            validationStatus = 'rejected';
          }
        }
      } else {
        // No consensus reached, stay pending
        validationStatus = 'pending';
      }
      
      // A proof is pending (yellow background, timer) ONLY if validationStatus is 'pending'
      // Approved/rejected proofs should NOT show yellow background or be votable
      const isPending = validationStatus === 'pending';

      // Determine if user can vote:
      // CRITICAL: Only allow voting if proof is actually pending (not approved/rejected)
      // - If proof has validators assigned: user must be assigned AND proof must be pending
      // - If proof has NO validators assigned (legacy): allow anyone to vote if pending (fallback)
      const canVote = validationStatus === 'pending' && (
        hasValidatorsAssigned ? isAssignedForValidation : true
      );

      return {
        id: log.id.toString(),
        userHash: log.user_hash,
        action: log.message,
        timestamp: formatTimestamp(log.timestep),
        type: log.typeofmessage as 'workout' | 'proof',
        image: log.image,
        approvals: counts.approvals,
        rejections: counts.rejections,
        userVote: userVote ?? null, // User's current vote (null if no vote yet)
        canVote, // Can vote if pending and no consensus
        createdAt,
        isPending,
        timeRemaining: isPending ? timeRemaining : undefined, // Always show timeRemaining if pending (even if negative)
        validationStatus,
      };
    });

    // Process other activity items
    const otherItems: FeedItem[] = otherLogs.map(log => {
      return {
        id: log.id.toString(),
        userHash: log.user_hash,
        action: log.message,
        timestamp: formatTimestamp(log.timestep),
        type: log.typeofmessage as 'comment' | 'bet' | 'win' | 'loss' | 'leave',
        createdAt: new Date(log.timestep),
      };
    });

    // Sort: pending proofs first (newest first), then other proofs, then other activity
    const pendingProofs = proofItems.filter(item => item.isPending);
    const finalizedProofs = proofItems.filter(item => !item.isPending);
    
    // Sort pending proofs by newest first (most recent submissions at top)
    pendingProofs.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());

    // Sort finalized proofs by newest first (chronological order)
    finalizedProofs.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
    
    // Sort other activity by newest first
    otherItems.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());

    // Combine: pending proofs at top (newest first), then finalized proofs, then other activity
    const items = [...pendingProofs, ...finalizedProofs, ...otherItems].slice(0, 50);

    // Filter out blocked users
    const currentBlocked = await getBlockedUsers(userHash);
    const filteredItems = items.filter(item => !currentBlocked.includes(item.userHash));
    setFeedItems(filteredItems);
  };

  const loadBlockedUsers = async () => {
    if (!userHash) return;
    const blocked = await getBlockedUsers(userHash);
    setBlockedUsers(blocked);
  };

  const handleFlagPost = async (reason: string) => {
    if (!selectedItem || !userHash) return;
    
    const result = await flagPost(
      selectedItem.id,
      selectedItem.userHash,
      userHash,
      selectedItem.image || null,
      selectedItem.action || null,
      reason
    );

    if (result.ok) {
      triggerHaptic('success');
      Alert.alert('Success', 'Post has been flagged. We will review it within 24 hours.');
      loadFeed();
    } else {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to flag post. Please try again.');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedItem || !userHash) return;
    
    const result = await blockUser(userHash, selectedItem.userHash);
    
    if (result.ok) {
      triggerHaptic('success');
      Alert.alert('Success', 'User has been blocked. You will no longer see their content.');
      await loadBlockedUsers();
      loadFeed();
    } else {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
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
    triggerHaptic('light');
    setSplitInput('');
    setSplitModalVisible(true);
  };

  const handleSubmitWorkout = async () => {
    if (!userHash) {
      triggerHaptic('error');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!splitInput.trim()) {
      triggerHaptic('error');
      Alert.alert('Invalid Input', 'Please enter the workout for today (e.g., Push, Pull, Legs)');
      return;
    }

    triggerHaptic('medium');
    setSplitModalVisible(false);
    const result = await addWorkout(userHash, splitInput.trim());
    if (result.ok) {
      triggerHaptic('success');
      Alert.alert('Success', `Logged ${splitInput} workout!`);
      setCanLogWorkoutToday(false);
      loadUserData();
    } else {
      console.error('Failed to add workout:', result.error);
      const errorMessage = result.error?.message || 'Unknown error';

      if (errorMessage.includes('already logged workout today')) {
        triggerHaptic('warning');
        Alert.alert('Already Logged', 'You have already logged your workout for today. Come back tomorrow!');
      } else {
        triggerHaptic('error');
        Alert.alert('Error', `Failed to log workout: ${errorMessage}`);
      }
    }
  };

  const handleVote = async (activityId: string, voteType: 'approve' | 'reject') => {
    if (!userHash) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please log in to vote');
      return;
    }

    triggerHaptic('light');

    const activityIdNum = parseInt(activityId);
    const currentItem = feedItems.find((item) => item.id === activityId);
    const isTogglingSameVote = currentItem?.userVote === voteType;

    setFeedItems((prev) =>
      prev.map((item) => {
        if (item.id === activityId) {
          const wasApproved = item.userVote === 'approve';
          const wasRejected = item.userVote === 'reject';
          const isApproving = voteType === 'approve';
          const isRejecting = voteType === 'reject';

          let newApprovals = item.approvals || 0;
          let newRejections = item.rejections || 0;

          if (wasApproved) newApprovals--;
          if (wasRejected) newRejections--;

          if (item.userVote === voteType) {
            return {
              ...item,
              userVote: null,
              approvals: newApprovals,
              rejections: newRejections,
            };
          } else {
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

    try {
      if (isTogglingSameVote) {
        const result = await removeVote(activityIdNum, userHash);
        if (!result.ok) {
          throw new Error('Failed to remove vote');
        }
      } else {
        const result = await voteOnProof(activityIdNum, userHash, voteType);
        if (!result.ok) {
          throw new Error('Failed to submit vote');
        }
      }

      const validation = await checkPBFTValidation(activityIdNum);

      // Reload feed to get updated status from database
      await loadFeed();

      if (validation.status === 'approved') {
        triggerHaptic('success');
        Alert.alert('Proof Approved!', 'This proof has been validated by 2/3 majority (PBFT consensus)');
      } else if (validation.status === 'rejected') {
        triggerHaptic('error');
        Alert.alert('Proof Rejected', 'This proof was rejected by the validators');
      }
    } catch (error) {
      console.error('Error voting:', error);
      loadFeed();
    }
  };

  const handleJoinRandomGame = async () => {
    if (!userHash) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please log in first');
      return;
    }

    triggerHaptic('medium');
    
    // Always only show free games (stake = $0) for random join
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
      Alert.alert('Success!', 'Joined free game!');

      await checkActiveGame();

      router.push('/bets');
    } else {
      triggerHaptic('error');
      console.error('Failed to join game:', result.error);
      Alert.alert('Error', result.error?.message || 'Failed to join game');
    }
  };
  
  return (
    <ImageBackground
      source={require('../../assets/images/AppBackground.jpg')}
      style={styles.background}
      imageStyle={{resizeMode: "cover"}}
    >
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <View style={styles.scrollWrapper}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.content}>
          {/* Scrollable Header */}
          <View style={styles.scrollableHeader}>
            <Text style={styles.headerTitle}>HOME</Text>
            <View style={styles.headerRightContainer}>
              <TouchableOpacity
                style={styles.headerHowToPlayButton}
                onPress={handleHowToPlayPress}
              >
                <Text style={styles.headerHowToPlayText}>
                  How to Play
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerProfileBubble, !user && styles.headerProfileBubbleGuest]}
                onPress={handleProfilePress}
              >
                {user && userProfile?.hash ? (
                  <UserAvatar hash={userProfile.hash} size={36} />
                ) : (
                  <Image 
                    source={require('@/assets/images/noprofile.png')} 
                    style={{ width: 40, height: 40, borderRadius: 18 }}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Training Split Tracker */}
          <View style={styles.arcadeCard}>
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
                          <Text style={[styles.dayBoxLabel, isToday && styles.dayBoxLabelActive]} numberOfLines={1}>{dayLabel}</Text>
                          <Text style={[styles.dayBoxValue, isToday && styles.dayBoxValueActive]} numberOfLines={1}>{workout}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.dividerLight} />
                  <View style={styles.metricRow}>
                    <View style={styles.metricLeft}>
                      <Text style={styles.statLabel}>TODAY</Text>
                      <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{currentSplitDay}</Text>
                    </View>

                  </View>
                </>
              ) : (
                <Text style={styles.noGameText}>Loading schedule...</Text>
              )}

            </View>
          </View>

          {/* Feed Section */}
          <View style={styles.arcadeCard}>
            <View style={styles.cardInner}>
              <View style={styles.feedHeaderRow}>
                <Text style={styles.cardTitle}>ACTIVITY FEED</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      feedMode === 'proofs' && styles.toggleButtonActive
                    ]}
                    onPress={() => {
                      triggerHaptic('light');
                      setFeedMode('proofs');
                    }}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      feedMode === 'proofs' && styles.toggleButtonTextActive
                    ]}>
                      PROOFS
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      feedMode === 'all' && styles.toggleButtonActive
                    ]}
                    onPress={() => {
                      triggerHaptic('light');
                      setFeedMode('all');
                    }}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      feedMode === 'all' && styles.toggleButtonTextActive
                    ]}>
                      ALL
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.spacer} />

              {(() => {
                const filteredItems = feedMode === 'proofs' 
                  ? feedItems.filter(item => item.type === 'workout' || item.type === 'proof')
                  : feedItems;
                
                return filteredItems.length === 0 ? (
                <Text style={styles.feedAction}>No activity yet. Be the first to join a game!</Text>
                ) : (
                  <ScrollView
                    style={styles.feedScrollView}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {filteredItems.map((item) => (
                    <View key={item.id} style={styles.feedItem}>
                      <View style={styles.feedHeader}>
                        <View style={styles.feedUserRow}>
                          <UserAvatar hash={item.userHash} size={32} />
                          <View style={styles.feedUserInfo}>
                            <View style={styles.feedUserRowTop}>
                              <Text style={styles.feedUser}>
                                0x{item.userHash.substring(0, 8)}...
                              </Text>
                              {item.isPending && item.timeRemaining !== undefined && (
                                <View style={styles.timerBadge}>
                                  <Text style={styles.timerText}>
                                    {Math.max(0, Math.floor(item.timeRemaining))}h left
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.feedTimestamp}>{item.timestamp}</Text>
                          </View>
                        </View>
                        {(item.type === 'workout' || item.type === 'proof') && item.image && (
                          <TouchableOpacity
                            style={styles.moreButton}
                            onPress={() => {
                              triggerHaptic('light');
                              setSelectedItem(item);
                              setFlagBlockModalVisible(true);
                            }}
                          >
                            <FontAwesome name="ellipsis-v" size={16} color="#000" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.feedActionContainer}>
                        <Text style={[
                          styles.feedAction,
                          item.type === 'win' && styles.feedActionWin,
                          item.type === 'loss' && styles.feedActionLoss
                        ]}>
                          {(() => {
                            // Add emoji prefix for proofs based on validation status
                            if (item.type === 'workout' || item.type === 'proof') {
                              let emoji = '';
                              let statusText = '';
                              
                              if (item.validationStatus === 'approved') {
                                emoji = '✓';
                                statusText = 'APPROVED: ';
                              } else if (item.validationStatus === 'rejected') {
                                emoji = '✗';
                                statusText = 'REJECTED: ';
                              } else if (item.isPending || item.validationStatus === 'pending') {
                                emoji = '-';
                                statusText = 'PENDING: ';
                              }
                              
                              return emoji ? `${emoji} ${statusText}${item.action}` : item.action;
                            }
                            return item.action;
                          })()}
                        </Text>
                        {(item.type === 'workout' || item.type === 'proof') && item.validationStatus && item.validationStatus !== 'pending' && (
                          <View style={[
                            styles.statusBadge,
                            item.validationStatus === 'approved' && styles.statusBadgeApproved,
                            item.validationStatus === 'rejected' && styles.statusBadgeRejected
                          ]}>
                            <Text style={[
                              styles.statusText,
                              item.validationStatus === 'approved' && styles.statusTextApproved,
                              item.validationStatus === 'rejected' && styles.statusTextRejected
                            ]}>
                              {item.validationStatus === 'approved' ? 'APPROVED' : 'REJECTED'}
                            </Text>
                            {item.approvals !== undefined && item.rejections !== undefined && (
                              <Text style={[
                                styles.statusPercentage,
                                item.validationStatus === 'approved' && styles.statusPercentageApproved,
                                item.validationStatus === 'rejected' && styles.statusPercentageRejected
                              ]}>
                                {(() => {
                                  const total = item.approvals + item.rejections;
                                  if (total === 0) return '0%';
                                  const approvalRate = (item.approvals / total) * 100;
                                  return `${Math.round(approvalRate)}%`;
                                })()}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                      {item.image && (
                        <>
                          {(item.type === 'workout' || item.type === 'proof') && item.canVote && (
                            <View style={styles.voteContainer}>
                              <TouchableOpacity
                                style={[
                                  styles.voteButton,
                                  styles.approveButton,
                                  item.userVote === 'approve' && styles.voteButtonActive
                                ]}
                                onPress={() => handleVote(item.id, 'approve')}
                                activeOpacity={0.7}
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
                                activeOpacity={0.7}
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
                          <View style={styles.imageContainer}>
                            <Image
                              source={{ uri: item.image }}
                              style={styles.feedImage}
                              resizeMode="cover"
                            />
                          </View>
                        </>
                      )}
                    </View>
                    ))}
                  </ScrollView>
                );
              })()}

              <TouchableOpacity 
                style={styles.viewMoreButton} 
                onPress={() => {
                  triggerHaptic('light');
                  loadFeed();
                }}
              >
                <Text style={styles.viewMoreText}>REFRESH ACTIVITY →</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Action Buttons - Only show if user doesn't have an active game */}
          {!hasActiveGame && (
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={handleJoinRandomGame}
            >
              <Text style={styles.buttonSecondaryText}>JOIN RANDOM GAME</Text>
            </TouchableOpacity>
          )}
          
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>

    {/* Flag/Block Modal */}
    {selectedItem && (
      <FlagBlockModal
        visible={flagBlockModalVisible}
        onClose={() => {
          setFlagBlockModalVisible(false);
          setSelectedItem(null);
        }}
        onFlag={handleFlagPost}
        onBlock={handleBlockUser}
        userHash={selectedItem.userHash}
      />
    )}

    {/* How to Play Modal */}
    <HowToPlayModal
      visible={howToPlayModalVisible}
      onClose={() => setHowToPlayModalVisible(false)}
    />

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
              onPress={() => {
                triggerHaptic('light');
                setSplitModalVisible(false);
              }}
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
    margin: 0,
    padding: 0,
  },
  scrollWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  scrollableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    marginBottom: 16,
    marginHorizontal: -20,
    marginTop: 30,
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
    borderRadius: 0,
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
    flex: 1,
    flexShrink: 1,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 1.5,
    gap: 0,
    flexShrink: 0,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
  },
  toggleButtonActive: {
    backgroundColor: '#000',
  },
  toggleButtonText: {
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.3,
    color: '#000',
  },
  toggleButtonTextActive: {
    color: '#FFF',
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
  feedItemPending: {
    borderColor: '#FFD700',
    backgroundColor: '#FFFEF0',
    borderWidth: 4,
  },
  feedItemApproved: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FFF4',
    borderWidth: 4,
  },
  feedItemRejected: {
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
    borderWidth: 4,
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
  moreButton: {
    padding: 8,
    marginLeft: 8,
  },
  feedUserInfo: {
    marginLeft: 10,
    flex: 1,
  },
  feedUserRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBadge: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timerText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
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
  feedActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feedAction: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    lineHeight: 18,
    flex: 1,
  },
  feedActionWin: {
    color: '#00AA00', // Green for wins
  },
  feedActionLoss: {
    color: '#FF0000', // Red for losses
  },
  statusBadge: {
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    alignItems: 'center',
  },
  statusBadgeApproved: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  statusBadgeRejected: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
    letterSpacing: 0.5,
  },
  statusTextApproved: {
    color: '#FFF',
  },
  statusTextRejected: {
    color: '#FFF',
  },
  statusPercentage: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    marginTop: 2,
  },
  statusPercentageApproved: {
    color: '#FFF',
  },
  statusPercentageRejected: {
    color: '#FFF',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    marginTop: 12,
    overflow: 'visible',
  },
  feedImage: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderColor: '#000',
  },
  voteContainerOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    zIndex: 1000,
    elevation: 10,
  },
  voteContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  voteButton: {
    flex: 1,
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    minHeight: 50, // Ensure minimum touch target size for mobile
    minWidth: 100,
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
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#000',
    letterSpacing: 0.5,
    textAlign: 'center',
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
    paddingHorizontal: 2,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    marginHorizontal: 2,
    minWidth: 0,
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
    textAlign: 'center',
    width: '100%',
  },
  dayBoxLabelActive: {
    color: '#FFF',
  },
  dayBoxValue: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    textAlign: 'center',
    width: '100%',
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