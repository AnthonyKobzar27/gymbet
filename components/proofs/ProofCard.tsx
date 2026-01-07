import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Modal, Alert } from 'react-native';
import { UserAvatar } from '@/components/Avatar';
import { ProofItem, ProofFilterMode } from '@/types/proof';
import { VOTE_STAKE_AMOUNT } from '@/lib/activityLog';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface ProofCardProps {
  proof: ProofItem;
  filterMode: ProofFilterMode;
  onVote: (proofId: string, voteType: 'approve' | 'reject') => void;
  onChallenge: (proofId: string) => void;
  onBlockUser?: (userHash: string) => void;
  isVoting?: boolean;
}

export default function ProofCard({ proof, filterMode, onVote, onChallenge, onBlockUser, isVoting = false }: ProofCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  // Debug logging
  useEffect(() => {
    if (proof.id === '229' || proof.image) {
      console.log('=== PROOF CARD RENDER ===');
      console.log('Proof ID:', proof.id);
      console.log('Proof image:', proof.image);
      console.log('Proof image type:', typeof proof.image);
      console.log('Proof image truthy?', !!proof.image);
      console.log('========================');
    }
  }, [proof.id, proof.image]);

  // Calculate potential reward based on current votes
  const calculateReward = (voteType: 'approve' | 'reject'): number => {
    const approvals = proof.approvals || 0;
    const rejections = proof.rejections || 0;
    const currentVoters = voteType === 'approve' ? approvals : rejections;
    const opposingVoters = voteType === 'approve' ? rejections : approvals;
    
    if (currentVoters === 0) {
      // You'd be the first voter, you get all opposing stakes if you win
      return VOTE_STAKE_AMOUNT + (opposingVoters * VOTE_STAKE_AMOUNT);
    }
    // Split opposing stakes among correct voters
    const potentialWinnings = (opposingVoters * VOTE_STAKE_AMOUNT) / (currentVoters + 1);
    return VOTE_STAKE_AMOUNT + potentialWinnings;
  };

  const handleBlockUser = () => {
    setMenuVisible(false);
    Alert.alert(
      'Block User',
      `Are you sure you want to block 0x${proof.userHash.substring(0, 8)}...? You won't see their proofs anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => onBlockUser?.(proof.userHash)
        },
      ]
    );
  };

  return (
    <View style={styles.proofCard}>
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
        <View style={styles.headerActions}>
          {proof.isPending && proof.timeRemaining !== undefined && (
            <View style={styles.timerBadge}>
              <Text style={styles.timerBadgeText}>
                {Math.max(0, Math.floor(proof.timeRemaining))}h left
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setHelpVisible(true)} style={styles.helpButton}>
            <Text style={styles.helpButtonText}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
            <Text style={styles.menuDots}>•••</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Three dots menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
              <Text style={styles.menuItemTextRed}>Block User</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <Text style={styles.menuItemText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Help modal */}
      <Modal visible={helpVisible} transparent animationType="fade" onRequestClose={() => setHelpVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setHelpVisible(false)}>
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>How Voting Works</Text>
            <View>
              <View style={styles.helpTextRow}>
                <Text style={styles.helpText}>
                  <Text style={styles.helpBold}>Stake:</Text> Each vote costs {VOTE_STAKE_AMOUNT.toFixed(2)}{' '}
                </Text>
                <Image source={require('@/assets/images/token.png')} style={styles.helpTokenImage} />
              </View>
              <Text style={styles.helpText}>
                {'\n\n'}
                <Text style={styles.helpBold}>Win:</Text> If you vote correctly, you get your stake back PLUS a share of the losing voters' stakes{'\n\n'}
                <Text style={styles.helpBold}>Lose:</Text> If you vote incorrectly, your stake is distributed to correct voters{'\n\n'}
                <Text style={styles.helpBold}>Finalization:</Text> Proofs are finalized after 48h or when validators reach consensus
              </Text>
            </View>
            <TouchableOpacity style={styles.helpClose} onPress={() => setHelpVisible(false)}>
              <Text style={styles.helpCloseText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {proof.image && (
        <Image source={{ uri: proof.image }} style={styles.proofImage} resizeMode="cover" />
      )}

      <View style={styles.proofMessageContainer}>
        <Text style={styles.proofMessage}>{proof.message}</Text>
        {proof.validationStatus !== 'pending' && (
          <View
            style={[
              styles.statusBadge,
              proof.validationStatus === 'approved' && styles.statusBadgeApproved,
              proof.validationStatus === 'rejected' && styles.statusBadgeRejected,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                proof.validationStatus === 'approved' && styles.statusTextApproved,
                proof.validationStatus === 'rejected' && styles.statusTextRejected,
              ]}
            >
              {proof.validationStatus === 'approved' ? '✓ APPROVED' : '✗ REJECTED'}
            </Text>
          </View>
        )}
        {filterMode === 'myProofs' && proof.validationStatus === 'pending' && (
          <View style={[styles.statusBadge, styles.statusBadgePending]}>
            <Text style={[styles.statusText, styles.statusTextPending]}>PENDING</Text>
          </View>
        )}
      </View>

      {proof.canVote && filterMode !== 'myProofs' && (
        <View style={styles.voteContainer}>
          {/* Stake info */}
          <View style={styles.stakeInfo}>
            <View style={styles.stakeInfoRow}>
              <Text style={styles.stakeInfoText}>
                Stake {VOTE_STAKE_AMOUNT.toFixed(2)}
              </Text>
              <Image source={require('@/assets/images/token.png')} style={styles.stakeTokenImage} />
              <Text style={styles.stakeInfoText}> to vote</Text>
            </View>
          </View>
          <View style={styles.voteButtonsRow}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                styles.approveButton,
                proof.userVote === 'approve' && styles.voteButtonActive,
                isVoting && styles.voteButtonDisabled,
              ]}
              onPress={() => onVote(proof.id, 'approve')}
              activeOpacity={0.7}
              disabled={isVoting}
            >
              <Text
                style={[
                  styles.voteButtonText,
                  proof.userVote === 'approve' && styles.voteButtonTextActive,
                ]}
              >
                ✓ ACCEPT ({proof.approvals || 0})
              </Text>
              <View style={styles.rewardRow}>
                <Text
                  style={[
                    styles.voteRewardText,
                    proof.userVote === 'approve' && styles.voteButtonTextActive,
                  ]}
                >
                  Win ~{calculateReward('approve').toFixed(2)}
                </Text>
                <Image source={require('@/assets/images/token.png')} style={styles.rewardTokenImage} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.voteButton,
                styles.rejectButton,
                proof.userVote === 'reject' && styles.voteButtonActive,
                isVoting && styles.voteButtonDisabled,
              ]}
              onPress={() => onVote(proof.id, 'reject')}
              activeOpacity={0.7}
              disabled={isVoting}
            >
              <Text
                style={[
                  styles.voteButtonText,
                  proof.userVote === 'reject' && styles.voteButtonTextActive,
                ]}
              >
                ✕ REJECT ({proof.rejections || 0})
              </Text>
              <View style={styles.rewardRow}>
                <Text
                  style={[
                    styles.voteRewardText,
                    proof.userVote === 'reject' && styles.voteButtonTextActive,
                  ]}
                >
                  Win ~{calculateReward('reject').toFixed(2)}
                </Text>
                <Image source={require('@/assets/images/token.png')} style={styles.rewardTokenImage} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {filterMode === 'myProofs' && proof.validationStatus !== 'pending' && (
        <View style={styles.challengeContainer}>
          <TouchableOpacity
            style={styles.challengeButton}
            onPress={() => onChallenge(proof.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.challengeButtonText}>Challenge for Review</Text>
          </TouchableOpacity>
        </View>
      )}

      {(!proof.canVote || filterMode === 'myProofs' || filterMode === 'myVotes') && (
        <View style={styles.voteCountsContainer}>
          <Text style={styles.voteCountsText}>
            {proof.approvals || 0} ✓ Approvals • {proof.rejections || 0} ✕ Rejections
          </Text>
          {proof.isPending && proof.timeRemaining !== undefined && (
            <Text style={styles.timerText}>
              {Math.max(0, Math.floor(proof.timeRemaining))}h remaining
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBadge: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#000',
  },
  helpButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#666',
  },
  menuButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDots: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -2,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    minWidth: 200,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  menuItemTextRed: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
  },
  helpContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    maxWidth: 340,
  },
  helpTitle: {
    fontSize: 20,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '500',
    color: '#333',
    lineHeight: 22,
  },
  helpBold: {
    fontWeight: '700',
  },
  helpClose: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  helpCloseText: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  timerText: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
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
  statusBadgePending: {
    backgroundColor: '#FFA500',
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
  statusTextPending: {
    color: '#FFF',
  },
  voteContainer: {
    padding: 12,
    paddingTop: 0,
  },
  stakeInfo: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  stakeInfoText: {
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#666',
  },
  stakeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stakeTokenImage: {
    width: 16,
    height: 16,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  rewardTokenImage: {
    width: 14,
    height: 14,
  },
  helpTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpTokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  helpTokenImage: {
    width: 16,
    height: 16,
  },
  voteButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flex: 1,
    borderWidth: 4,
    borderColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 8,
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
  voteButtonDisabled: {
    opacity: 0.5,
  },
  voteButtonText: {
    fontSize: 11,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.3,
  },
  voteRewardText: {
    fontSize: 10,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 2,
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
  challengeContainer: {
    padding: 12,
    paddingTop: 0,
  },
  challengeButton: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeButtonText: {
    fontSize: 13,
    fontFamily: fontFamily,
    fontWeight: '800',
    color: '#FF6B6B',
    letterSpacing: 0.5,
  },
});

