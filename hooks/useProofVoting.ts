import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ProofItem } from '@/types/proof';
import { voteOnProof, removeVote, checkPBFTValidation } from '@/lib/activity_log_utils';
import { triggerHaptic } from '@/lib/haptics';
import { useDataCache } from '@/contexts/DataCacheContext';

export const useProofVoting = (
  proofs: ProofItem[],
  setProofs: React.Dispatch<React.SetStateAction<ProofItem[]>>,
  userHash: string | null,
  reloadProofs?: () => Promise<void> | void
) => {
  const { refreshBalance } = useDataCache();
  const [votingProofId, setVotingProofId] = useState<string | null>(null);

  const handleVote = useCallback(
    async (proofId: string, voteType: 'approve' | 'reject') => {
      if (!userHash) {
        triggerHaptic('error');
        Alert.alert('Error', 'Please log in to vote');
        return;
      }

      // Prevent spam clicking - disable if already voting on this proof
      if (votingProofId === proofId) {
        return;
      }

      setVotingProofId(proofId);
      triggerHaptic('light');

      const proofIdNum = parseInt(proofId);
      const currentProof = proofs.find(p => p.id === proofId);
      const isTogglingSameVote = currentProof?.userVote === voteType;

      setProofs(prev =>
        prev.map(proof => {
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

        // Refresh balance after voting (stakes money) or removing vote (refunds money)
        await refreshBalance();

        const validation = await checkPBFTValidation(proofIdNum);
        if (reloadProofs) await reloadProofs();

        if (validation.status === 'approved') {
          triggerHaptic('success');
          Alert.alert('Proof Approved!', 'This proof has been validated by 2/3 majority (PBFT consensus)');
        } else if (validation.status === 'rejected') {
          triggerHaptic('error');
          Alert.alert('Proof Rejected', 'This proof was rejected by the validators');
        }
      } catch {
        // Refresh balance even on error to ensure UI is accurate
        await refreshBalance();
        if (reloadProofs) await reloadProofs();
      } finally {
        setVotingProofId(null);
      }
    },
    [proofs, setProofs, userHash, reloadProofs, refreshBalance, votingProofId]
  );

  return { handleVote, votingProofId };
};

