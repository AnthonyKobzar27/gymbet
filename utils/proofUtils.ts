import { ActivityLog } from '@/lib/activity_log_utils';
import { ProofItem } from '@/types/proof';

export const formatTimestamp = (timestep: string): string => {
  const now = new Date();
  const then = new Date(timestep);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
};

export const calculateValidationStatus = (
  log: ActivityLog,
  counts: { approvals: number; rejections: number },
  hasValidatorsAssigned: boolean
): 'pending' | 'approved' | 'rejected' => {
  const MIN_VOTES_FOR_DECISION = 10;
  const totalVotes = counts.approvals + counts.rejections;
  const requiredApprovals = log.required_approvals || 0;
  const totalValidators = log.total_validators || 0;

  if (log.validation_status === 'approved' || log.validation_status === 'rejected') {
    return log.validation_status;
  }

  if (totalVotes < MIN_VOTES_FOR_DECISION) {
    return 'pending';
  }

  let hasReachedConsensus = false;
  if (hasValidatorsAssigned && totalValidators > 0) {
    hasReachedConsensus =
      (counts.approvals >= requiredApprovals) ||
      (counts.rejections > (totalValidators - requiredApprovals)) ||
      log.validation_status === 'approved' ||
      log.validation_status === 'rejected';
  } else {
    const approvalMajority = counts.approvals > counts.rejections;
    const rejectionMajority = counts.rejections > counts.approvals;
    hasReachedConsensus = approvalMajority || rejectionMajority;
  }

  if (!hasReachedConsensus) {
    return 'pending';
  }

  if (hasValidatorsAssigned && totalValidators > 0) {
    if (counts.approvals >= requiredApprovals) {
      return 'approved';
    } else if (counts.rejections > (totalValidators - requiredApprovals)) {
      return 'rejected';
    }
  } else {
    if (counts.approvals > counts.rejections) {
      return 'approved';
    } else if (counts.rejections > counts.approvals) {
      return 'rejected';
    }
  }

  return 'pending';
};

export const calculateTimeRemaining = (createdAt: Date): number => {
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return 48 - hoursSinceCreation;
};

