import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, RefreshControl, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/lib/haptics';
import AppHeader from '@/components/common/AppHeader';
import { 
  getActivityFeed, 
  voteOnProof, 
  removeVote, 
  getVoteCounts, 
  getUserVotes, 
  getProofsForValidator,
  getProofsWithValidators,
  checkPBFTValidation,
  ActivityLog 
} from '@/lib/activity_log_utils';
import { getBlockedUsers } from '@/lib/flagging_utils';
import { UserAvatar } from '@/components/Avatar';

interface ProofItem {
  id: string;
  userHash: string;
  message: string;
  timestamp: string;
  image: string | null;
  approvals: number;
  rejections: number;
  userVote: 'approve' | 'reject' | null;
  validationStatus: 'pending' | 'approved' | 'rejected';
  canVote: boolean;
  createdAt: Date;
  isPending: boolean;
  timeRemaining?: number;
}

export default function ProofsScreen() {
  const route = useRoute();
  const { user, getUserProfile } = useAuth();
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userHash, setUserHash] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/signin');
    }
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const profile = await getUserProfile();
        if (profile?.hash) {
          setUserHash(profile.hash);
        }
      }
    };
    loadProfile();
  }, [user]);

  const formatTimestamp = (timestep: string): string => {
    const now = new Date();
    const then = new Date(timestep);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  useFocusEffect(
    useCallback(() => {
      if (userHash) {
        loadProofs();
      }
    }, [userHash])
  );

  const loadProofs = useCallback(async () => {
    if (!userHash) return;

    try {
      const allActivityLogs = await getActivityFeed();

      // Filter to only proofs (workout or proof type)
      const proofLogs = allActivityLogs.filter(log => 
        log.typeofmessage === 'workout' || log.typeofmessage === 'proof'
      );

      const allProofIds = proofLogs.map(log => log.id);
      const assignedProofs = await getProofsForValidator(userHash);
      const assignedProofIds = new Set(assignedProofs.map(p => p.id));

      const [voteCounts, userVotesMap, proofsWithValidators] = await Promise.all([
        getVoteCounts(allProofIds),
        getUserVotes(allProofIds, userHash),
        getProofsWithValidators(allProofIds),
      ]);

      // Filter out blocked users
      const blockedUsers = await getBlockedUsers(userHash);

      const proofItems: ProofItem[] = proofLogs
        .filter(log => !blockedUsers.includes(log.user_hash))
        .map(log => {
          const counts = voteCounts.get(log.id) || { approvals: 0, rejections: 0 };
          const userVote = userVotesMap.get(log.id) || null;
          const isAssignedForValidation = assignedProofIds.has(log.id);
          const hasValidatorsAssigned = proofsWithValidators.has(log.id);
          const createdAt = new Date(log.timestep);
          const now = new Date();
          const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          
          const totalVotes = counts.approvals + counts.rejections;
          const requiredApprovals = log.required_approvals || 0;
          const totalValidators = log.total_validators || 0;
          
          const MIN_VOTES_FOR_DECISION = 10;
          
          let hasReachedConsensus = false;
          if (totalVotes < MIN_VOTES_FOR_DECISION) {
            hasReachedConsensus = false;
          } else if (hasValidatorsAssigned && totalValidators > 0) {
            hasReachedConsensus = 
              (counts.approvals >= requiredApprovals) ||
              (counts.rejections > (totalValidators - requiredApprovals)) ||
              log.validation_status === 'approved' ||
              log.validation_status === 'rejected';
          } else {
            const approvalMajority = counts.approvals > counts.rejections;
            const rejectionMajority = counts.rejections > counts.approvals;
            hasReachedConsensus = 
              approvalMajority ||
              rejectionMajority ||
              log.validation_status === 'approved' ||
              log.validation_status === 'rejected';
          }
          
          const timeRemaining = 48 - hoursSinceCreation;
          
          let validationStatus: 'pending' | 'approved' | 'rejected' = 'pending';
          
          if (log.validation_status === 'approved' || log.validation_status === 'rejected') {
            validationStatus = log.validation_status;
          } else if (totalVotes < MIN_VOTES_FOR_DECISION) {
            validationStatus = 'pending';
          } else if (hasReachedConsensus) {
            if (hasValidatorsAssigned && totalValidators > 0) {
              if (counts.approvals >= requiredApprovals) {
                validationStatus = 'approved';
              } else if (counts.rejections > (totalValidators - requiredApprovals)) {
                validationStatus = 'rejected';
              }
            } else {
              if (counts.approvals > counts.rejections) {
                validationStatus = 'approved';
              } else if (counts.rejections > counts.approvals) {
                validationStatus = 'rejected';
              }
            }
          }
          
          const isPending = validationStatus === 'pending';
          const canVote = validationStatus === 'pending' && (
            hasValidatorsAssigned ? isAssignedForValidation : true
          );

          return {
            id: log.id.toString(),
            userHash: log.user_hash,
            message: log.message,
            timestamp: formatTimestamp(log.timestep),
            image: log.image,
            approvals: counts.approvals,
            rejections: counts.rejections,
            userVote: userVote ?? null,
            canVote,
            createdAt,
            isPending,
            timeRemaining: isPending ? timeRemaining : undefined,
            validationStatus,
          };
        });

      // Sort by newest first
      proofItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setProofs(proofItems);
    } catch (error) {
      console.error('Failed to load proofs:', error);
    }
  }, [userHash]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProofs();
    setRefreshing(false);
  }, [loadProofs]);

  const handleVote = async (proofId: string, voteType: 'approve' | 'reject') => {
    if (!userHash) {
      triggerHaptic('error');
      Alert.alert('Error', 'Please log in to vote');
      return;
    }

    triggerHaptic('light');

    const proofIdNum = parseInt(proofId);
    const currentProof = proofs.find((p) => p.id === proofId);
    const isTogglingSameVote = currentProof?.userVote === voteType;

    setProofs((prev) =>
      prev.map((proof) => {
        if (proof.id === proofId) {
          const wasApproved = proof.userVote === 'approve';
          const wasRejected = proof.userVote === 'reject';
          const isApproving = voteType === 'approve';
          const isRejecting = voteType === 'reject';

          let newApprovals = proof.approvals || 0;
          let newRejections = proof.rejections || 0;

          if (wasApproved) newApprovals--;
          if (wasRejected) newRejections--;

          if (proof.userVote === voteType) {
            return {
              ...proof,
              userVote: null,
              approvals: newApprovals,
              rejections: newRejections,
            };
          } else {
            if (isApproving) newApprovals++;
            if (isRejecting) newRejections++;

            return {
              ...proof,
              userVote: voteType,
              approvals: newApprovals,
              rejections: newRejections,
            };
          }
        }
        return proof;
      })
    );

    try {
      if (isTogglingSameVote) {
        const result = await removeVote(proofIdNum, userHash);
        if (!result.ok) {
          throw new Error('Failed to remove vote');
        }
      } else {
        const result = await voteOnProof(proofIdNum, userHash, voteType);
        if (!result.ok) {
          throw new Error('Failed to submit vote');
        }
      }

      const validation = await checkPBFTValidation(proofIdNum);
      await loadProofs();

      if (validation.status === 'approved') {
        triggerHaptic('success');
        Alert.alert('Proof Approved!', 'This proof has been validated by 2/3 majority (PBFT consensus)');
      } else if (validation.status === 'rejected') {
        triggerHaptic('error');
        Alert.alert('Proof Rejected', 'This proof was rejected by the validators');
      }
    } catch {
      loadProofs();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <View style={styles.background}>
        <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
          <AppHeader />
          <ScrollView 
            style={styles.scrollContent} 
            contentContainerStyle={styles.scrollContentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {proofs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No proofs yet</Text>
                <Text style={styles.emptySubtext}>Workout proofs will appear here</Text>
              </View>
            ) : (
              proofs.map((proof) => (
                <View key={proof.id} style={styles.proofCard}>
                  {/* Header */}
                  <View style={styles.proofHeader}>
                    <View style={styles.proofUserInfo}>
                      <UserAvatar hash={proof.userHash} size={40} />
                      <View style={styles.proofUserDetails}>
                        <Text style={styles.proofUsername}>
                          0x{proof.userHash.substring(0, 8)}...
                        </Text>
                        <Text style={styles.proofTimestamp}>{proof.timestamp}</Text>
                      </View>
                    </View>
                    {proof.isPending && proof.timeRemaining !== undefined && (
                      <View style={styles.timerBadge}>
                        <Text style={styles.timerText}>
                          {Math.max(0, Math.floor(proof.timeRemaining))}h left
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Image */}
                  {proof.image && (
                    <Image 
                      source={{ uri: proof.image }} 
                      style={styles.proofImage}
                      resizeMode="cover"
                    />
                  )}

                  {/* Message */}
                  <View style={styles.proofMessageContainer}>
                    <Text style={styles.proofMessage}>{proof.message}</Text>
                    {proof.validationStatus !== 'pending' && (
                      <View style={[
                        styles.statusBadge,
                        proof.validationStatus === 'approved' && styles.statusBadgeApproved,
                        proof.validationStatus === 'rejected' && styles.statusBadgeRejected
                      ]}>
                        <Text style={[
                          styles.statusText,
                          proof.validationStatus === 'approved' && styles.statusTextApproved,
                          proof.validationStatus === 'rejected' && styles.statusTextRejected
                        ]}>
                          {proof.validationStatus === 'approved' ? '✓ APPROVED' : '✗ REJECTED'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Vote Buttons */}
                  {proof.canVote && (
                    <View style={styles.voteContainer}>
                      <TouchableOpacity
                        style={[
                          styles.voteButton,
                          styles.approveButton,
                          proof.userVote === 'approve' && styles.voteButtonActive
                        ]}
                        onPress={() => handleVote(proof.id, 'approve')}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.voteButtonText,
                          proof.userVote === 'approve' && styles.voteButtonTextActive
                        ]}>
                          ✓ ACCEPT {proof.approvals > 0 ? `(${proof.approvals})` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.voteButton,
                          styles.rejectButton,
                          proof.userVote === 'reject' && styles.voteButtonActive
                        ]}
                        onPress={() => handleVote(proof.id, 'reject')}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.voteButtonText,
                          proof.userVote === 'reject' && styles.voteButtonTextActive
                        ]}>
                          ✕ REJECT {proof.rejections > 0 ? `(${proof.rejections})` : ''}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Vote Counts (if not votable) */}
                  {!proof.canVote && (
                    <View style={styles.voteCountsContainer}>
                      <Text style={styles.voteCountsText}>
                        {proof.approvals} ✓ • {proof.rejections} ✕
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
  },
  proofCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#000',
    marginBottom: 16,
    overflow: 'hidden',
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 8,
  },
  proofUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  proofUserDetails: {
    marginLeft: 12,
    flex: 1,
  },
  proofUsername: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  proofTimestamp: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  timerBadge: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 10,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  proofImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#f0f0f0',
  },
  proofMessageContainer: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proofMessage: {
    fontSize: 13,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusBadgeApproved: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeRejected: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 10,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
  },
  statusTextApproved: {
    color: '#FFF',
  },
  statusTextRejected: {
    color: '#FFF',
  },
  voteContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingTop: 0,
  },
  voteButton: {
    flex: 1,
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
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
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  voteButtonTextActive: {
    color: '#FFF',
  },
  voteCountsContainer: {
    padding: 12,
    paddingTop: 0,
    alignItems: 'center',
  },
  voteCountsText: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
  },
});
