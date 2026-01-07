import { supabase } from '../supabase';
import { Challenge } from '@/types/activityLog';

export async function challengeProof(
  activityLogId: number,
  userHash: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    const { data: proof, error: proofError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('id', activityLogId)
      .single();

    if (proofError || !proof) {
      console.error('Failed to get proof:', proofError);
      return { ok: false, error: proofError || { message: 'Proof not found' } };
    }

    if (proof.user_hash !== userHash) {
      return { ok: false, error: { message: 'You can only challenge your own proofs' } };
    }

    if (proof.validation_status === 'pending') {
      return { ok: false, error: { message: 'Cannot challenge pending proofs' } };
    }

    const { data: existingChallenge } = await supabase
      .from('challenges')
      .select('id')
      .eq('activity_log_id', activityLogId)
      .eq('user_hash', userHash)
      .maybeSingle();

    if (existingChallenge) {
      return { ok: false, error: { message: 'You have already challenged this proof' } };
    }

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

