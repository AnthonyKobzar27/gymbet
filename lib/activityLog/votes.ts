import { supabase } from '../supabase';

export const VOTE_STAKE_AMOUNT = 0.05;

export async function voteOnProof(
  activityLogId: number,
  voterHash: string,
  voteType: 'approve' | 'reject'
): Promise<{ ok: boolean; error?: any }> {
  try {
    const { data: proof, error: proofError } = await supabase
      .from('activity_log')
      .select('validation_status')
      .eq('id', activityLogId)
      .single();

    if (proofError || !proof) {
      return { ok: false, error: { message: 'Proof not found' } };
    }

    if (proof.validation_status !== 'pending') {
      return { ok: false, error: { message: 'Cannot vote on finalized proof' } };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('hash', voterHash)
      .single();

    if (profileError || !profile?.user_id) {
      return { ok: false, error: { message: 'User profile not found' } };
    }

    // ATOMIC: Try to insert vote first, then check if it was inserted
    // Use INSERT with ON CONFLICT to make it atomic
    const { data: insertResult, error: insertError } = await supabase
      .from('proof_votes')
      .insert({
        activity_log_id: activityLogId,
        voter_hash: voterHash,
        vote_type: voteType,
        staked_amount: VOTE_STAKE_AMOUNT,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    let isNewVote = false;
    let existingVote = null;

    if (insertError) {
      // Check if error is due to duplicate (unique constraint violation)
      if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
        // Vote already exists - get it and update it
        const { data: existing } = await supabase
          .from('proof_votes')
          .select('staked_amount')
          .eq('activity_log_id', activityLogId)
          .eq('voter_hash', voterHash)
          .single();
        
        existingVote = existing;
        
        // Update existing vote
        const { error: updateError } = await supabase
          .from('proof_votes')
          .update({
            vote_type: voteType,
            updated_at: new Date().toISOString(),
          })
          .eq('activity_log_id', activityLogId)
          .eq('voter_hash', voterHash);

        if (updateError) {
          console.error('Failed to update vote:', updateError);
          return { ok: false, error: updateError };
        }
      } else {
        console.error('Failed to insert vote:', insertError);
        return { ok: false, error: insertError };
      }
    } else {
      // Successfully inserted - this is a new vote, need to deduct balance
      isNewVote = true;
    }

    // Only deduct balance if this was a NEW vote (not an update)
    if (isNewVote) {
      const { data: balanceData } = await supabase
        .from('hash_to_value')
        .select('value')
        .eq('hash', voterHash)
        .maybeSingle();

      const currentBalance = balanceData?.value || 0;
      if (currentBalance < VOTE_STAKE_AMOUNT) {
        // Rollback the vote insertion
        await supabase
          .from('proof_votes')
          .delete()
          .eq('activity_log_id', activityLogId)
          .eq('voter_hash', voterHash);
        return { ok: false, error: { message: `Insufficient balance. Need ${VOTE_STAKE_AMOUNT.toFixed(2)} GYMBET tokens to vote.` } };
      }

      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_balance_atomic', {
          p_user_id: profile.user_id,
          p_user_hash: voterHash,
          p_delta: -VOTE_STAKE_AMOUNT,
          p_transaction_type: 'stake',
          p_description: `Staked ${VOTE_STAKE_AMOUNT.toFixed(2)} GYMBET tokens to vote on proof ${activityLogId}`
        });

      if (updateError || !updateResult?.success) {
        console.error('Failed to deduct vote stake:', updateError || updateResult?.error);
        // Rollback the vote insertion
        await supabase
          .from('proof_votes')
          .delete()
          .eq('activity_log_id', activityLogId)
          .eq('voter_hash', voterHash);
        return { ok: false, error: { message: 'Failed to process vote stake: ' + (updateError?.message || updateResult?.error || 'Unknown error') } };
      }
    }

    return { ok: true };
  } catch (error) {
    console.error('Error voting on proof:', error);
    return { ok: false, error };
  }
}

export async function removeVote(
  activityLogId: number,
  voterHash: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    const { data: proof, error: proofError } = await supabase
      .from('activity_log')
      .select('validation_status')
      .eq('id', activityLogId)
      .single();

    if (proofError || !proof) {
      return { ok: false, error: { message: 'Proof not found' } };
    }

    if (proof.validation_status !== 'pending') {
      return { ok: false, error: { message: 'Cannot remove vote from finalized proof' } };
    }

    const { data: vote, error: voteError } = await supabase
      .from('proof_votes')
      .select('staked_amount')
      .eq('activity_log_id', activityLogId)
      .eq('voter_hash', voterHash)
      .maybeSingle();

    if (voteError) {
      return { ok: false, error: voteError };
    }

    const { error: deleteError } = await supabase
      .from('proof_votes')
      .delete()
      .eq('activity_log_id', activityLogId)
      .eq('voter_hash', voterHash);

    if (deleteError) {
      console.error('Failed to remove vote:', deleteError);
      return { ok: false, error: deleteError };
    }

    if (vote && vote.staked_amount > 0) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('hash', voterHash)
        .single();

      if (!profileError && profile?.user_id) {
        await supabase.rpc('update_balance_atomic', {
          p_user_id: profile.user_id,
          p_user_hash: voterHash,
          p_delta: vote.staked_amount,
          p_transaction_type: 'deposit',
          p_description: `Refund: Removed vote on proof ${activityLogId}`
        });
      }
    }

    return { ok: true };
  } catch (error) {
    console.error('Error removing vote:', error);
    return { ok: false, error };
  }
}

export async function getVoteCounts(
  activityLogIds: number[]
): Promise<Map<number, { approvals: number; rejections: number }>> {
  const { data, error } = await supabase
    .from('proof_votes')
    .select('activity_log_id, vote_type')
    .in('activity_log_id', activityLogIds);

  if (error) {
    console.error('Failed to get vote counts:', error);
    return new Map();
  }

  const counts = new Map<number, { approvals: number; rejections: number }>();

  data?.forEach((vote) => {
    const current = counts.get(vote.activity_log_id) || { approvals: 0, rejections: 0 };
    if (vote.vote_type === 'approve') {
      current.approvals++;
    } else if (vote.vote_type === 'reject') {
      current.rejections++;
    }
    counts.set(vote.activity_log_id, current);
  });

  return counts;
}

export async function getUserVotes(
  activityLogIds: number[],
  userHash: string
): Promise<Map<number, 'approve' | 'reject'>> {
  const { data, error } = await supabase
    .from('proof_votes')
    .select('activity_log_id, vote_type')
    .in('activity_log_id', activityLogIds)
    .eq('voter_hash', userHash);

  if (error) {
    console.error('Failed to get user votes:', error);
    return new Map();
  }

  const votesMap = new Map<number, 'approve' | 'reject'>();
  data?.forEach((vote) => {
    votesMap.set(vote.activity_log_id, vote.vote_type as 'approve' | 'reject');
  });

  return votesMap;
}

