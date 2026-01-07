import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getActivityFeed,
  getVoteCounts,
  getUserVotes,
  getProofsForValidator,
  getProofsWithValidators,
  ActivityLog,
} from '@/lib/activity_log_utils';
import { getBlockedUsers } from '@/lib/flagging_utils';
import { ProofItem, ProofFilterMode } from '@/types/proof';
import { formatTimestamp, calculateValidationStatus, calculateTimeRemaining } from '@/utils/proofUtils';

export const useProofs = (userHash: string | null) => {
  const [allProofs, setAllProofs] = useState<ProofItem[]>([]);
  const [myProofs, setMyProofs] = useState<ProofItem[]>([]);
  const [myVotes, setMyVotes] = useState<ProofItem[]>([]);

  const transformLogToProofItem = (
    log: ActivityLog,
    voteCounts: Map<number, { approvals: number; rejections: number }>,
    userVotesMap: Map<number, 'approve' | 'reject'>,
    proofsWithValidators: Set<number>,
    assignedProofIds: Set<number>,
    canUserVote: boolean = true
  ): ProofItem => {
    const counts = voteCounts.get(log.id) || { approvals: 0, rejections: 0 };
    const userVote = userVotesMap.get(log.id) || null;
    const hasValidatorsAssigned = proofsWithValidators.has(log.id);
    const isAssignedForValidation = assignedProofIds.has(log.id);
    const createdAt = new Date(log.timestep);

    const validationStatus = calculateValidationStatus(log, counts, hasValidatorsAssigned);
    const isPending = validationStatus === 'pending';
    const timeRemaining = isPending ? calculateTimeRemaining(createdAt) : undefined;

    const canVote = canUserVote && validationStatus === 'pending' && (
      hasValidatorsAssigned ? isAssignedForValidation : true
    );

    const proofItem = {
      id: log.id.toString(),
      userHash: log.user_hash,
      message: log.message,
      timestamp: formatTimestamp(log.timestep),
      image: log.image,
      approvals: counts.approvals,
      rejections: counts.rejections,
      userVote,
      canVote,
      createdAt,
      isPending,
      timeRemaining,
      validationStatus,
    };

    // Debug logging for image
    if (log.id === 229 || log.image) {
      console.log('=== TRANSFORMING PROOF ITEM ===');
      console.log('Log ID:', log.id);
      console.log('Log image:', log.image);
      console.log('ProofItem image:', proofItem.image);
      console.log('===============================');
    }

    return proofItem;
  };

  const loadAllProofs = useCallback(async () => {
    if (!userHash) return;

    try {
      const allActivityLogs = await getActivityFeed();
      console.log('=== LOADED ACTIVITY LOGS ===');
      console.log('Total logs:', allActivityLogs.length);
      if (allActivityLogs.length > 0) {
        console.log('First log image:', allActivityLogs[0].image);
      }
      console.log('============================');
      const proofLogs = allActivityLogs.filter(
        log => log.typeofmessage === 'workout' || log.typeofmessage === 'proof'
      );

      const allProofIds = proofLogs.map(log => log.id);
      const assignedProofs = await getProofsForValidator(userHash);
      const assignedProofIds = new Set(assignedProofs.map(p => p.id));

      const [voteCounts, userVotesMap, proofsWithValidators] = await Promise.all([
        getVoteCounts(allProofIds),
        getUserVotes(allProofIds, userHash),
        getProofsWithValidators(allProofIds),
      ]);

      const blockedUsers = await getBlockedUsers(userHash);

      const proofItems: ProofItem[] = proofLogs
        .filter(log => !blockedUsers.includes(log.user_hash))
        .map(log =>
          transformLogToProofItem(
            log,
            voteCounts,
            userVotesMap,
            proofsWithValidators,
            assignedProofIds,
            true
          )
        );

      proofItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setAllProofs(proofItems);
    } catch (error) {
      console.error('Failed to load proofs:', error);
    }
  }, [userHash]);

  const loadMyProofs = useCallback(async () => {
    if (!userHash) return;

    try {
      const { data: myActivityLogs, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_hash', userHash)
        .in('typeofmessage', ['workout', 'proof'])
        .order('timestep', { ascending: false });

      if (error || !myActivityLogs || myActivityLogs.length === 0) {
        setMyProofs([]);
        return;
      }

      const allProofIds = myActivityLogs.map(log => log.id);
      const [voteCounts, userVotesMap, proofsWithValidators] = await Promise.all([
        getVoteCounts(allProofIds),
        getUserVotes(allProofIds, userHash),
        getProofsWithValidators(allProofIds),
      ]);

      const myProofItems: ProofItem[] = myActivityLogs.map(log =>
        transformLogToProofItem(
          log,
          voteCounts,
          userVotesMap,
          proofsWithValidators,
          new Set(),
          false
        )
      );

      myProofItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setMyProofs(myProofItems);
    } catch (error) {
      console.error('Failed to load my proofs:', error);
    }
  }, [userHash]);

  const loadMyVotes = useCallback(async () => {
    if (!userHash) return;

    try {
      const { data: votes, error: votesError } = await supabase
        .from('proof_votes')
        .select('activity_log_id')
        .eq('voter_hash', userHash);

      if (votesError || !votes || votes.length === 0) {
        setMyVotes([]);
        return;
      }

      const proofIds = votes.map(v => v.activity_log_id);
      const { data: votedProofs, error: proofsError } = await supabase
        .from('activity_log')
        .select('*')
        .in('id', proofIds)
        .in('typeofmessage', ['workout', 'proof'])
        .order('timestep', { ascending: false });

      if (proofsError || !votedProofs) {
        console.error('Failed to load voted proofs:', proofsError);
        setMyVotes([]);
        return;
      }

      const [voteCounts, userVotesMap, proofsWithValidators] = await Promise.all([
        getVoteCounts(proofIds),
        getUserVotes(proofIds, userHash),
        getProofsWithValidators(proofIds),
      ]);

      const votedProofItems: ProofItem[] = votedProofs.map(log =>
        transformLogToProofItem(
          log,
          voteCounts,
          userVotesMap,
          proofsWithValidators,
          new Set(),
          true
        )
      );

      votedProofItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setMyVotes(votedProofItems);
    } catch (error) {
      console.error('Failed to load my votes:', error);
      setMyVotes([]);
    }
  }, [userHash]);

  return {
    allProofs,
    myProofs,
    myVotes,
    loadAllProofs,
    loadMyProofs,
    loadMyVotes,
  };
};

