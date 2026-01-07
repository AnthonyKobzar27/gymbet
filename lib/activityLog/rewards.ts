import { supabase } from '../supabase';

const VOTE_STAKE_AMOUNT = 0.05;

export async function distributeVoteRewards(
  activityLogId: number,
  finalStatus: 'approved' | 'rejected'
): Promise<void> {
  try {
    const { data: proof, error: proofCheckError } = await supabase
      .from('activity_log')
      .select('validation_status')
      .eq('id', activityLogId)
      .single();

    if (proofCheckError || !proof) {
      console.error('Failed to check proof status before distribution:', proofCheckError);
      return;
    }

    if (proof.validation_status !== 'pending') {
      console.log(`Proof ${activityLogId} already finalized (${proof.validation_status}), skipping reward distribution`);
      return;
    }

    const { data: votes, error: votesError } = await supabase
      .from('proof_votes')
      .select('voter_hash, vote_type, staked_amount')
      .eq('activity_log_id', activityLogId)
      .gt('staked_amount', 0);

    if (votesError || !votes || votes.length === 0) {
      console.log(`No votes with stakes found for proof ${activityLogId}`);
      return;
    }

    const correctVoteType = finalStatus === 'approved' ? 'approve' : 'reject';
    const correctVoters: Array<{ hash: string; stake: number }> = [];
    const incorrectVoters: Array<{ hash: string; stake: number }> = [];

    for (const vote of votes) {
      if (vote.vote_type === correctVoteType) {
        correctVoters.push({ hash: vote.voter_hash, stake: vote.staked_amount });
      } else {
        incorrectVoters.push({ hash: vote.voter_hash, stake: vote.staked_amount });
      }
    }

    const totalSlashed = incorrectVoters.reduce((sum, v) => sum + v.stake, 0);

    if (totalSlashed === 0 || correctVoters.length === 0) {
      console.log(`No rewards to distribute for proof ${activityLogId} (total slashed: ${totalSlashed}, correct voters: ${correctVoters.length})`);
      return;
    }

    const stakeRefund = VOTE_STAKE_AMOUNT;
    const slashedRewardPerVoter = totalSlashed / correctVoters.length;
    const totalRewardPerVoter = stakeRefund + slashedRewardPerVoter;

    console.log(`Distributing rewards: ${correctVoters.length} correct voters get $${totalRewardPerVoter.toFixed(4)} each (stake refund: $${stakeRefund.toFixed(2)} + slashed reward: $${slashedRewardPerVoter.toFixed(4)})`);

    const allHashes = [...correctVoters.map(v => v.hash), ...incorrectVoters.map(v => v.hash)];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('hash, user_id')
      .in('hash', allHashes);

    if (profilesError || !profiles) {
      console.error('Failed to get profiles for reward distribution:', profilesError);
      return;
    }

    const hashToUserId = new Map<string, string>();
    profiles.forEach(p => hashToUserId.set(p.hash, p.user_id));

    for (const voter of incorrectVoters) {
      const userId = hashToUserId.get(voter.hash);
      if (userId) {
        await supabase.from('transactions').insert({
          user_id: userId,
          user_hash: voter.hash,
          type: 'vote_slash',
          amount: voter.stake,
          description: `Vote stake slashed: Voted incorrectly on proof ${activityLogId} (${finalStatus})`
        });
      }
    }

    for (const voter of correctVoters) {
      const userId = hashToUserId.get(voter.hash);
      if (userId) {
        const { error: rewardError } = await supabase.rpc('update_balance_atomic', {
          p_user_id: userId,
          p_user_hash: voter.hash,
          p_delta: totalRewardPerVoter,
          p_transaction_type: 'vote_reward',
          p_description: `Vote reward: Voted correctly on proof ${activityLogId} (${finalStatus}). Received $${totalRewardPerVoter.toFixed(4)} (stake refund + slashed rewards)`
        });

        if (rewardError) {
          console.error(`Failed to reward voter ${voter.hash}:`, rewardError);
        }
      }
    }

    console.log(`✅ Successfully distributed vote rewards for proof ${activityLogId}`);
  } catch (error) {
    console.error(`Error distributing vote rewards for proof ${activityLogId}:`, error);
  }
}

