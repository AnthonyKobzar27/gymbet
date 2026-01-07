import { supabase } from '../supabase';
import { GameSubmission } from '@/types/game';
import { addActivityLogWithId } from '../activityLog/feed';
import { getRandomValidators, distributeProofToValidators } from '../activityLog/validators';
import { addGameLog } from './logs';

export async function submitWakeupProof(
  gameId: string,
  userHash: string,
  photoUri: string,
  caption: string,
  splitType: string
): Promise<{ ok: boolean; isOnTime?: boolean; error?: any }> {
  const submissionDate = new Date().toISOString().split('T')[0];
  const submittedAt = new Date();

  const { data: existing } = await supabase
    .from('game_submissions')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_hash', userHash)
    .eq('submission_date', submissionDate)
    .maybeSingle();

  if (existing) {
    console.error('Already submitted today');
    return { ok: false, error: { message: 'Already submitted today' } };
  }

  const isOnTime = true;
  const fileName = `${gameId}/${userHash}/${submissionDate}-${Date.now()}.jpg`;

  const response = await fetch(photoUri);
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
    return { ok: false, error: { message: 'Image must be less than 10MB' } };
  }

  if (arrayBuffer.byteLength < 1000) {
    return { ok: false, error: { message: 'Invalid image file' } };
  }

  const { error: uploadError } = await supabase.storage
    .from('workout-proofs')
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Failed to upload photo:', uploadError);
    return { ok: false, error: uploadError };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('workout-proofs')
    .getPublicUrl(fileName);

  console.log('=== PROOF IMAGE URL ===');
  console.log('fileName:', fileName);
  console.log('publicUrl:', publicUrl);
  console.log('=====================');

  const { error: insertError } = await supabase
    .from('game_submissions')
    .insert({
      game_id: gameId,
      user_hash: userHash,
      submission_date: submissionDate,
      photo_url: publicUrl,
      submitted_at: submittedAt.toISOString(),
      is_on_time: isOnTime,
      verified: true,
    });

  if (insertError) {
    console.error('Failed to submit wakeup proof:', insertError);
    return { ok: false, error: insertError };
  }

  if (isOnTime) {
    const { data: player } = await supabase
      .from('game_players')
      .select('total_workouts')
      .eq('game_id', gameId)
      .eq('user_hash', userHash)
      .single();

    if (player) {
      await supabase
        .from('game_players')
        .update({
          total_workouts: player.total_workouts + 1,
          last_submission_date: submissionDate,
        })
        .eq('game_id', gameId)
        .eq('user_hash', userHash);
    }
  }

  const { data: homeStats } = await supabase
    .from('home_page_top')
    .select('workout_logged, workout_history')
    .eq('user_hash', userHash)
    .maybeSingle();

  if (homeStats) {
    const newWorkoutCount = (homeStats.workout_logged || 0) + 1;
    const newHistory = [...(homeStats.workout_history || []), 1].slice(-7);

    await supabase
      .from('home_page_top')
      .update({
        workout_logged: newWorkoutCount,
        workout_history: newHistory,
        current_split_day: caption || 'Workout',
      })
      .eq('user_hash', userHash);
  }

  const proofMessage = caption ? `"${caption}"` : 'submitted workout proof';
  await addGameLog(
    gameId,
    userHash,
    `0x${userHash.substring(0, 8)}: ${proofMessage}`,
    'proof'
  );

  const verificationEmoji = isOnTime ? '✓' : '✗';
  const timeString = submittedAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const activityMessage = `${verificationEmoji} Submitted workout proof at ${timeString} - "${caption}"`;

  console.log('=== ADDING TO ACTIVITY LOG ===');
  console.log('Image URL being saved:', publicUrl);
  console.log('============================');

  const activityResult = await addActivityLogWithId(
    userHash,
    userHash,
    activityMessage,
    'workout',
    publicUrl,
    gameId
  );

  console.log('=== ACTIVITY LOG RESULT ===');
  console.log('Success:', activityResult.ok);
  console.log('ID:', activityResult.id);
  console.log('===========================');

  if (!activityResult.ok || !activityResult.id) {
    console.error('⚠️ WARNING: Failed to add to activity feed! Check RLS on activity_log table');
  } else {
    const validators = await getRandomValidators(userHash, gameId, 100);

    if (validators.length > 0) {
      const distributionResult = await distributeProofToValidators(
        activityResult.id,
        validators
      );

      if (distributionResult.ok) {
        console.log(`✅ Successfully distributed proof ${activityResult.id} to ${validators.length} validators`);
      } else {
        console.error('⚠️ Failed to distribute proof:', distributionResult.error);
      }
    } else {
      console.error('⚠️ CRITICAL: No validators found! Proof will not be distributed. Check if profiles exist in database.');
    }
  }

  return { ok: true, isOnTime };
}

export async function getGameSubmissions(
  gameId: string,
  date?: string
): Promise<GameSubmission[]> {
  let query = supabase
    .from('game_submissions')
    .select('*')
    .eq('game_id', gameId);

  if (date) {
    query = query.eq('submission_date', date);
  }

  const { data, error } = await query.order('submitted_at', { ascending: false });

  if (error) {
    console.error('Failed to get game submissions:', error);
    return [];
  }

  return (data as GameSubmission[]) || [];
}

