import { supabase } from '../lib/supabase';
import { redistributeStake, addGameLog } from './game_utils';

export interface ActivityLog {
  id: number;
  user_hash: string;
  sender_hash: string;
  message: string;
  typeofmessage: string;
  image: string | null;
  timestep: string;
  game_id?: string | null;
  validation_status?: 'pending' | 'approved' | 'rejected';
  total_validators?: number;
  required_approvals?: number;
}

export async function getActivityFeed(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('timestep', { ascending: false })
    .limit(50);

  if (error) {
    console.error('failed to get activity feed', error);
    return [];
  }

  return data || [];
}

export async function addActivityLog(
  userHash: string,
  senderHash: string,
  message: string,
  typeofmessage: string,
  image?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('activity_log')
    .insert({
      user_hash: userHash,
      sender_hash: senderHash,
      message: message,
      typeofmessage: typeofmessage,
      image: image || null,
    });

  if (error) {
    console.error('failed to add activity log', error);
    return false;
  }

  return true;
}

export async function addActivityLogWithId(
  userHash: string,
  senderHash: string,
  message: string,
  typeofmessage: string,
  image?: string,
  gameId?: string | null
): Promise<{ ok: boolean; id?: number; error?: any }> {
  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      user_hash: userHash,
      sender_hash: senderHash,
      message: message,
      typeofmessage: typeofmessage,
      image: image || null,
      game_id: gameId || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('failed to add activity log', error);
    return { ok: false, error };
  }

  return { ok: true, id: data.id };
}

export function subscribeToActivityFeed(callback: (newLog: ActivityLog) => void) {
  const channel = supabase
    .channel('activity_log_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_log' },
      (payload) => {
        callback(payload.new as ActivityLog);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

export async function voteOnProof(
  activityLogId: number,
  voterHash: string,
  voteType: 'approve' | 'reject'
): Promise<{ ok: boolean; error?: any }> {
  const { error } = await supabase
    .from('proof_votes')
    .upsert(
      {
        activity_log_id: activityLogId,
        voter_hash: voterHash,
        vote_type: voteType,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'activity_log_id,voter_hash',
      }
    );

  if (error) {
    console.error('Failed to vote on proof:', error);
    return { ok: false, error };
  }

  return { ok: true };
}

export async function removeVote(
  activityLogId: number,
  voterHash: string
): Promise<{ ok: boolean; error?: any }> {
  const { error } = await supabase
    .from('proof_votes')
    .delete()
    .eq('activity_log_id', activityLogId)
    .eq('voter_hash', voterHash);

  if (error) {
    console.error('Failed to remove vote:', error);
    return { ok: false, error };
  }

  return { ok: true };
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
  voterHash: string
): Promise<Map<number, 'approve' | 'reject'>> {
  const { data, error } = await supabase
    .from('proof_votes')
    .select('activity_log_id, vote_type')
    .in('activity_log_id', activityLogIds)
    .eq('voter_hash', voterHash);

  if (error) {
    console.error('Failed to get user votes:', error);
    return new Map();
  }

  const votes = new Map<number, 'approve' | 'reject'>();
  data?.forEach((vote) => {
    votes.set(vote.activity_log_id, vote.vote_type as 'approve' | 'reject');
  });

  return votes;
}

export async function getRandomValidators(
  submitterHash: string,
  gameId: string | null,
  maxValidators: number = 100
): Promise<string[]> {
  console.log('=== getRandomValidators ===');
  console.log('Submitter:', submitterHash);
  console.log('Game ID:', gameId);
  console.log('Max validators:', maxValidators);

  let cohortHashes: string[] = [];
  if (gameId) {
    const { data: participants, error: participantsError } = await supabase
      .from('game_players')
      .select('user_hash')
      .eq('game_id', gameId)
      .eq('status', 'active')
      .neq('user_hash', submitterHash);

    if (!participantsError && participants) {
      cohortHashes = participants.map(p => p.user_hash);
    }
  }

  const remainingSlots = maxValidators - cohortHashes.length;

  let randomValidators: string[] = [];
  if (remainingSlots > 0) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('hash')
      .neq('hash', submitterHash);

    if (error) {
      console.error('Failed to get profiles:', error);
    } else if (profiles && profiles.length > 0) {
      const availableValidators = profiles
        .map(p => p.hash)
        .filter(hash => !cohortHashes.includes(hash));

      const shuffled = availableValidators.sort(() => 0.5 - Math.random());
      randomValidators = shuffled.slice(0, Math.min(remainingSlots, shuffled.length));
    }
  }

  const allValidators = [...cohortHashes, ...randomValidators];

  return allValidators;
}

export async function distributeProofToValidators(
  activityLogId: number,
  validatorHashes: string[]
): Promise<{ ok: boolean; error?: any }> {
  const requiredApprovals = Math.ceil((validatorHashes.length * 2) / 3);

  const { error: updateError } = await supabase
    .from('activity_log')
    .update({
      total_validators: validatorHashes.length,
      required_approvals: requiredApprovals,
    })
    .eq('id', activityLogId);

  if (updateError) {
    console.error('Failed to update activity log:', updateError);
    return { ok: false, error: updateError };
  }

  const distributions = validatorHashes.map(hash => ({
    activity_log_id: activityLogId,
    validator_hash: hash,
  }));

  const { error: insertError } = await supabase
    .from('proof_distribution')
    .insert(distributions);

  if (insertError) {
    console.error('Failed to insert distributions:', insertError);
    return { ok: false, error: insertError };
  }

  return { ok: true };
}

export async function getProofsForValidator(validatorHash: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('proof_distribution')
    .select(`
      activity_log_id,
      activity_log (*)
    `)
    .eq('validator_hash', validatorHash)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get proofs for validator:', error);
    return await getFallbackProofs(validatorHash);
  }

  if (!data || data.length === 0) {
    return await getFallbackProofs(validatorHash);
  }

  const activityLogs = data
    .filter(d => d.activity_log)
    .map(d => d.activity_log as any as ActivityLog);

  return activityLogs;
}

async function getFallbackProofs(validatorHash: string): Promise<ActivityLog[]> { 
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('typeofmessage', 'wakeup')
    .neq('user_hash', validatorHash)
    .order('timestep', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to get fallback proofs:', error);
    return [];
  }

  return data || [];
}

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

  const MIN_VOTES_FOR_DECISION = 10;

  // CRITICAL: Match frontend logic - proofs need at least 10 votes to reach consensus
  // If < 10 votes, stay PENDING (do NOT auto-approve)
  if (totalVotes < MIN_VOTES_FOR_DECISION) {
    newStatus = 'pending'; // Stay pending if < 10 votes (matches frontend)
  } else if (approvals >= required) {
    newStatus = 'approved';
  } else if (rejections > (activityLog.total_validators || 0) - required) {
    newStatus = 'rejected';
  } else {
    newStatus = 'pending';
  }

  if (newStatus !== activityLog.validation_status) {
    const { error: updateError } = await supabase
      .from('activity_log')
      .update({ validation_status: newStatus })
      .eq('id', activityLogId);

    if (updateError) {
      console.error(`❌ Failed to update proof ${activityLogId} status from '${activityLog.validation_status}' to '${newStatus}':`, updateError);
      return { ok: false, status: activityLog.validation_status || 'pending', approvals, rejections, required };
    }

    console.log(`✅ Successfully updated proof ${activityLogId} status from '${activityLog.validation_status}' to '${newStatus}' (${approvals} approvals, ${rejections} rejections, required: ${required})`);

    await supabase
      .from('proof_distribution')
      .update({ has_voted: true })
      .eq('activity_log_id', activityLogId);

    if (newStatus === 'rejected') {
      const { data: fullLog, error: logErr } = await supabase
        .from('activity_log')
        .select('user_hash, game_id')
        .eq('id', activityLogId)
        .single();

      if (logErr || !fullLog) {
        console.error('Failed to get activity log for stake slashing:', logErr);
      } else if (fullLog.game_id) {
        const { data: playerStatus } = await supabase
          .from('game_players')
          .select('status')
          .eq('game_id', fullLog.game_id)
          .eq('user_hash', fullLog.user_hash)
          .maybeSingle();

        if (playerStatus && playerStatus.status === 'active') {
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
        } else {
          console.log('Player is not active in game, skipping stake slashing');
        }
      } else {
        console.log('No game_id found in activity log, cannot slash stake');
      }
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

export async function challengeProof(
  activityLogId: number,
  userHash: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    // Get the proof details
    const { data: proof, error: proofError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('id', activityLogId)
      .single();

    if (proofError || !proof) {
      console.error('Failed to get proof:', proofError);
      return { ok: false, error: proofError || { message: 'Proof not found' } };
    }

    // Verify this is the user's own proof
    if (proof.user_hash !== userHash) {
      return { ok: false, error: { message: 'You can only challenge your own proofs' } };
    }

    // Check if proof is already approved or rejected (not pending)
    if (proof.validation_status === 'pending') {
      return { ok: false, error: { message: 'Cannot challenge pending proofs' } };
    }

    // Check if already challenged
    const { data: existingChallenge } = await supabase
      .from('challenges')
      .select('id')
      .eq('activity_log_id', activityLogId)
      .eq('user_hash', userHash)
      .maybeSingle();

    if (existingChallenge) {
      return { ok: false, error: { message: 'You have already challenged this proof' } };
    }

    // Insert challenge into challenges table
    const { error: challengeError } = await supabase
      .from('challenges')
      .insert({
        activity_log_id: activityLogId,
        user_hash: userHash,
        proof_status: proof.validation_status as 'approved' | 'rejected',
        proof_message: proof.message,
        proof_image: proof.image,
        status: 'pending',
      });

    if (challengeError) {
      console.error('Failed to create challenge:', challengeError);
      return { ok: false, error: challengeError };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error challenging proof:', error);
    return { ok: false, error };
  }
}

export interface Challenge {
  id: number;
  activity_log_id: number;
  user_hash: string;
  proof_status: 'approved' | 'rejected';
  proof_message: string | null;
  proof_image: string | null;
  created_at: string;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_notes: string | null;
  resolved_at: string | null;
}

export async function getChallenges(): Promise<Challenge[]> {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get challenges:', error);
      return [];
    }

    return (data || []) as Challenge[];
  } catch (error) {
    console.error('Error getting challenges:', error);
    return [];
  }
}

export async function updateChallengeStatus(
  challengeId: number,
  status: 'pending' | 'reviewed' | 'resolved',
  adminNotes?: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    const updateData: any = {
      status,
    };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    const { error } = await supabase
      .from('challenges')
      .update(updateData)
      .eq('id', challengeId);

    if (error) {
      console.error('Failed to update challenge status:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error updating challenge status:', error);
    return { ok: false, error };
  }
}

export async function getProofsWithValidators(proofIds: number[]): Promise<Set<number>> {
  if (proofIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('proof_distribution')
    .select('activity_log_id')
    .in('activity_log_id', proofIds);

  if (error) {
    console.error('Failed to get proofs with validators:', error);
    return new Set();
  }

  if (!data || data.length === 0) {
    return new Set();
  }

  return new Set(data.map(d => d.activity_log_id));
}