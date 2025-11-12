import { supabase } from '../lib/supabase';
import { redistributeStake, addGameLog } from './game_utils';

// Simple interface matching the table exactly
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

// Get the activity feed - just fetch and return
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

// Add a new activity log entry - just insert
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

// Add a new activity log entry and return the created record ID
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

// Subscribe to new activity logs - real-time updates
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

  // Return cleanup function
  return () => {
    channel.unsubscribe();
  };
}

// Vote on a proof (activity log entry)
export async function voteOnProof(
  activityLogId: number,
  voterHash: string,
  voteType: 'approve' | 'reject'
): Promise<{ ok: boolean; error?: any }> {
  console.log('=== voteOnProof ===');
  console.log('Activity ID:', activityLogId);
  console.log('Voter hash:', voterHash);
  console.log('Vote type:', voteType);

  // Check if vote table exists, if not create it
  // For now, we'll use upsert which will work if the table exists
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

// Remove vote from a proof
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

// Get vote counts for multiple activity logs
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

// Get user's votes for multiple activity logs
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

// ========== PBFT Proof Distribution System ==========

// Get validators for proof validation (ALL cohort members + random users up to 100 total)
export async function getRandomValidators(
  submitterHash: string,
  gameId: string | null,
  maxValidators: number = 100
): Promise<string[]> {
  console.log('=== getRandomValidators ===');
  console.log('Submitter:', submitterHash);
  console.log('Game ID:', gameId);
  console.log('Max validators:', maxValidators);

  // Start with cohort members (excluding submitter) - they MUST validate
  let cohortHashes: string[] = [];
  if (gameId) {
    const { data: participants, error: participantsError } = await supabase
      .from('game_participants')
      .select('user_hash')
      .eq('game_id', gameId)
      .neq('user_hash', submitterHash);

    if (!participantsError && participants) {
      cohortHashes = participants.map(p => p.user_hash);
      console.log('Cohort members (competitors):', cohortHashes.length);
    }
  }

  // Calculate how many additional random validators we need
  const remainingSlots = maxValidators - cohortHashes.length;
  console.log('Remaining slots for random validators:', remainingSlots);

  let randomValidators: string[] = [];
  if (remainingSlots > 0) {
    // Get all other users (excluding submitter and cohort members)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('hash')
      .neq('hash', submitterHash);

    if (error) {
      console.error('Failed to get profiles:', error);
    } else if (profiles && profiles.length > 0) {
      // Filter out cohort members
      const availableValidators = profiles
        .map(p => p.hash)
        .filter(hash => !cohortHashes.includes(hash));

      console.log('Available random validators:', availableValidators.length);

      // Shuffle and select up to remainingSlots
      const shuffled = availableValidators.sort(() => 0.5 - Math.random());
      randomValidators = shuffled.slice(0, Math.min(remainingSlots, shuffled.length));
      console.log('Selected random validators:', randomValidators.length);
    }
  }

  // Combine cohort members + random validators
  const allValidators = [...cohortHashes, ...randomValidators];
  console.log('Total validators:', allValidators.length, '(Cohort:', cohortHashes.length, '+ Random:', randomValidators.length, ')');

  return allValidators;
}

// Distribute proof to validators
export async function distributeProofToValidators(
  activityLogId: number,
  validatorHashes: string[]
): Promise<{ ok: boolean; error?: any }> {
  console.log('=== distributeProofToValidators ===');
  console.log('Activity Log ID:', activityLogId);
  console.log('Validators count:', validatorHashes.length);

  // Calculate required approvals (2/3 of total validators, rounded up)
  const requiredApprovals = Math.ceil((validatorHashes.length * 2) / 3);
  console.log('Required approvals:', requiredApprovals);

  // Update activity log with validation metadata
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

  // Insert distribution records
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

  console.log('Proof distributed successfully');
  return { ok: true };
}

// Get proofs assigned to a specific user for validation
export async function getProofsForValidator(validatorHash: string): Promise<ActivityLog[]> {
  console.log('=== getProofsForValidator ===');
  console.log('Validator:', validatorHash);

  // Try to get assigned proofs from distribution system
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
    // Fallback to recent proofs if distribution table doesn't exist or error
    return await getFallbackProofs(validatorHash);
  }

  if (!data || data.length === 0) {
    console.log('No assigned proofs found, using fallback');
    return await getFallbackProofs(validatorHash);
  }

  // Extract activity logs
  const activityLogs = data
    .filter(d => d.activity_log)
    .map(d => d.activity_log as any as ActivityLog);

  console.log('Found assigned proofs for validation:', activityLogs.length);
  return activityLogs;
}

// Fallback: Get recent proofs from activity feed (for users not in distribution system yet)
async function getFallbackProofs(validatorHash: string): Promise<ActivityLog[]> {
  console.log('=== getFallbackProofs ===');

  // Get recent wakeup proofs (not from the validator themselves)
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

  console.log('Fallback proofs loaded:', data?.length || 0);
  return data || [];
}

// Check and update PBFT validation status
export async function checkPBFTValidation(activityLogId: number): Promise<{
  ok: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approvals: number;
  rejections: number;
  required: number;
}> {
  console.log('=== checkPBFTValidation ===');
  console.log('Activity Log ID:', activityLogId);

  // Get activity log metadata
  const { data: activityLog, error: logError } = await supabase
    .from('activity_log')
    .select('total_validators, required_approvals, validation_status')
    .eq('id', activityLogId)
    .single();

  if (logError || !activityLog) {
    console.error('Failed to get activity log:', logError);
    return { ok: false, status: 'pending', approvals: 0, rejections: 0, required: 0 };
  }

  // Get vote counts
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

  console.log('Approvals:', approvals, 'Rejections:', rejections, 'Required:', required);

  // Determine status based on PBFT (2/3 majority)
  let newStatus: 'pending' | 'approved' | 'rejected' = activityLog.validation_status || 'pending';

  if (approvals >= required) {
    newStatus = 'approved';
  } else if (rejections > (activityLog.total_validators || 0) - required) {
    // If rejections exceed the threshold where approval is impossible
    newStatus = 'rejected';
  }

  // Update status if changed
  if (newStatus !== activityLog.validation_status) {
    console.log('Updating validation status to:', newStatus);
    await supabase
      .from('activity_log')
      .update({ validation_status: newStatus })
      .eq('id', activityLogId);

    // Mark all distributions as voted
    await supabase
      .from('proof_distribution')
      .update({ has_voted: true })
      .eq('activity_log_id', activityLogId);

    // ========== STAKE SLASHING FOR PBFT REJECTION ==========
    if (newStatus === 'rejected') {
      console.log('🔥 PROOF REJECTED BY PBFT! Starting stake slashing...');

      // Get the full activity log to extract user_hash and game_id
      const { data: fullLog, error: logErr } = await supabase
        .from('activity_log')
        .select('user_hash, game_id')
        .eq('id', activityLogId)
        .single();

      if (logErr || !fullLog) {
        console.error('Failed to get activity log for stake slashing:', logErr);
      } else if (fullLog.game_id) {
        console.log(`Slashing stake for user ${fullLog.user_hash} in game ${fullLog.game_id}`);

        // Check if player is still active in the game
        const { data: playerStatus } = await supabase
          .from('game_players')
          .select('status')
          .eq('game_id', fullLog.game_id)
          .eq('user_hash', fullLog.user_hash)
          .maybeSingle();

        if (playerStatus && playerStatus.status === 'active') {
          // Add game log for rejection
          await addGameLog(
            fullLog.game_id,
            fullLog.user_hash,
            `❌ 0x${fullLog.user_hash.substring(0, 8)}'s proof was REJECTED by PBFT consensus (${rejections} reject votes). Stake slashed!`,
            'elimination'
          );

          // Redistribute stake to remaining players
          const redistributeResult = await redistributeStake(
            fullLog.game_id,
            fullLog.user_hash
          );

          if (redistributeResult.ok) {
            console.log('✅ Stake successfully slashed and redistributed to opponents');
          } else {
            console.error('❌ Failed to redistribute slashed stake:', redistributeResult.error);
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
