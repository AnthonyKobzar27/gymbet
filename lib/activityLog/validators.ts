import { supabase } from '../supabase';
import { ActivityLog } from '@/types/activityLog';

export async function getRandomValidators(
  excludeHash: string,
  excludeGameId?: string,
  count: number = 100
): Promise<string[]> {
  // Get exclude hashes for game players if gameId provided
  let excludeHashes = [excludeHash];
  
  if (excludeGameId) {
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select('user_hash')
      .eq('game_id', excludeGameId);
    
    if (gamePlayers && gamePlayers.length > 0) {
      excludeHashes = [...excludeHashes, ...gamePlayers.map(p => p.user_hash)];
    }
  }

  // Get more profiles than needed for randomization
  const { data, error } = await supabase
    .from('profiles')
    .select('hash')
    .limit(count * 3);

  if (error) {
    console.error('Failed to get random validators:', error);
    return [];
  }

  // Filter out excluded hashes and randomize
  const hashes = (data || [])
    .map(p => p.hash)
    .filter(hash => !excludeHashes.includes(hash))
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  return hashes;
}

export async function distributeProofToValidators(
  activityLogId: number,
  validatorHashes: string[]
): Promise<{ ok: boolean; error?: any }> {
  const { error: updateError } = await supabase
    .from('activity_log')
    .update({
      total_validators: validatorHashes.length,
      required_approvals: Math.ceil((validatorHashes.length * 2) / 3),
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

