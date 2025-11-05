import { supabase } from '../lib/supabase';

// Simple interface matching the table exactly
export interface ActivityLog {
  id: number;
  user_hash: string;
  sender_hash: string;
  message: string;
  typeofmessage: string;
  image: string | null;
  timestep: string;
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
