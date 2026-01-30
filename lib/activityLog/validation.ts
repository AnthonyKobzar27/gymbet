import { supabase } from '../supabase';
import { distributeVoteRewards } from './rewards';
import { redistributeStake, addGameLog } from '../game_utils';
import { notifyProofApproved as pushNotifyProofApproved, notifyProofRejected as pushNotifyProofRejected } from '../game_notifications';
import { notifyProofApproved as inAppNotifyProofApproved, notifyProofRejected as inAppNotifyProofRejected } from '../notifications';

const MIN_VOTES_FOR_DECISION = 10;

export async function checkPBFTValidation(activityLogId: number): Promise<{
  ok: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approvals: number;
  rejections: number;
  required: number;
}> {
  const { data: activityLog, error: logError } = await supabase
    .from('activity_log')
    .select('total_validators, required_approvals, validation_status')
    .eq('id', activityLogId)
    .single();

  if (logError || !activityLog) {
    console.error('Failed to get activity log:', logError);
    return { ok: false, status: 'pending', approvals: 0, rejections: 0, required: 0 };
  }

  const { data: votes, error: votesError } = await supabase
    .from('proof_votes')
    .select('vote_type')
    .eq('activity_log_id', activityLogId);

  if (votesError) {
    console.error('Failed to get votes:', votesError);
    return { ok: false, status: 'pending', approvals: 0, rejections: 0, required: 0 };
  }

  const approvals = votes?.filter(v => v.vote_type === 'approve').length || 0;
  const rejections = votes?.filter(v => v.vote_type === 'reject').length || 0;
  const required = activityLog.required_approvals || 0;
  const totalVotes = approvals + rejections;

  let newStatus: 'pending' | 'approved' | 'rejected' = activityLog.validation_status || 'pending';

  if (totalVotes < MIN_VOTES_FOR_DECISION) {
    newStatus = 'pending';
  } else if (approvals >= required) {
    newStatus = 'approved';
  } else if (rejections > (activityLog.total_validators || 0) - required) {
    newStatus = 'rejected';
  } else {
    newStatus = 'pending';
  }

  if (newStatus !== activityLog.validation_status && newStatus !== 'pending') {
    await distributeVoteRewards(activityLogId, newStatus);

    const { error: updateError } = await supabase
      .from('activity_log')
      .update({ validation_status: newStatus })
      .eq('id', activityLogId)
      .eq('validation_status', 'pending');

    if (updateError) {
      console.error(`❌ Failed to update proof ${activityLogId} status from '${activityLog.validation_status}' to '${newStatus}':`, updateError);
      return { ok: false, status: activityLog.validation_status || 'pending', approvals, rejections, required };
    }

    console.log(`✅ Successfully updated proof ${activityLogId} status from '${activityLog.validation_status}' to '${newStatus}' (${approvals} approvals, ${rejections} rejections, required: ${required})`);

    await supabase
      .from('proof_distribution')
      .update({ has_voted: true })
      .eq('activity_log_id', activityLogId);

    // Get user hash for notification
    const { data: proofData } = await supabase
      .from('activity_log')
      .select('user_hash, game_id')
      .eq('id', activityLogId)
      .single();

    if (proofData) {
      if (newStatus === 'approved') {
        // In-app notification
        inAppNotifyProofApproved(proofData.user_hash).catch(err =>
          console.log('Non-critical: Failed to send proof approved in-app notification', err)
        );
        // Push notification
        pushNotifyProofApproved(proofData.game_id || '', proofData.user_hash).catch(err =>
          console.log('Non-critical: Failed to send proof approved push notification', err)
        );
      } else if (newStatus === 'rejected') {
        // In-app notification
        inAppNotifyProofRejected(proofData.user_hash).catch(err =>
          console.log('Non-critical: Failed to send proof rejected in-app notification', err)
        );
        // Push notification
        pushNotifyProofRejected(proofData.game_id || '', proofData.user_hash).catch(err =>
          console.log('Non-critical: Failed to send proof rejected push notification', err)
        );
      }
    }

    if (newStatus === 'rejected') {
      await handleRejectedProof(activityLogId, rejections);
    }
  }

  return {
    ok: true,
    status: newStatus,
    approvals,
    rejections,
    required,
  };
}

async function handleRejectedProof(activityLogId: number, rejections: number): Promise<void> {
  const { data: fullLog, error: logErr } = await supabase
    .from('activity_log')
    .select('user_hash, game_id')
    .eq('id', activityLogId)
    .single();

  if (logErr || !fullLog) {
    console.error('Failed to get activity log for stake slashing:', logErr);
    return;
  }

  if (!fullLog.game_id) {
    console.log('No game_id found in activity log, cannot slash stake');
    return;
  }

  const { data: playerStatus } = await supabase
    .from('game_players')
    .select('status')
    .eq('game_id', fullLog.game_id)
    .eq('user_hash', fullLog.user_hash)
    .maybeSingle();

  if (!playerStatus || playerStatus.status !== 'active') {
    console.log('Player is not active in game, skipping stake slashing');
    return;
  }

  await addGameLog(
    fullLog.game_id,
    fullLog.user_hash,
    `❌ 0x${fullLog.user_hash.substring(0, 8)}'s proof was REJECTED by PBFT consensus (${rejections} reject votes). Stake slashed!`,
    'elimination'
  );

  const redistributeResult = await redistributeStake(
    fullLog.game_id,
    fullLog.user_hash
  );

  if (redistributeResult.ok) {
    console.log('Stake successfully slashed and redistributed to opponents');
  } else {
    console.error(' ERROR : Failed to redistribute slashed stake:', redistributeResult.error);
  }

  const { data: eliminatedPlayers } = await supabase
    .from('game_players')
    .select('user_hash')
    .eq('game_id', fullLog.game_id)
    .eq('status', 'eliminated');

  const eliminatedCount = eliminatedPlayers?.length || 0;

  if (eliminatedCount >= 2) {
    const { data: activePlayers } = await supabase
      .from('game_players')
      .select('user_hash')
      .eq('game_id', fullLog.game_id)
      .eq('status', 'active');

    if (activePlayers && activePlayers.length > 0) {
      await supabase
        .from('game_players')
        .update({ status: 'winner' })
        .eq('game_id', fullLog.game_id)
        .eq('status', 'active');

      await addGameLog(
        fullLog.game_id,
        null,
        `Game ended! 2 players failed verification. Remaining ${activePlayers.length} players win!`,
        'game_end'
      );

      await supabase
        .from('games')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', fullLog.game_id);
    }
  }
}

