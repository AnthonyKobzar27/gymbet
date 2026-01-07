export interface ProofItem {
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

export type ProofFilterMode = 'all' | 'myProofs' | 'myVotes';

