// Utility function to insert a test proof
// You can call this from your app or run it in a script

import { supabase } from './supabase';
import { addActivityLogWithId } from './activity_log_utils';

/**
 * Insert a test proof into the activity log
 * @param userHash - Your user hash (get it from getUserProfile())
 * @param imageUrl - URL of the image to use for the proof
 * @param message - Optional message (defaults to a workout message)
 */
export async function insertTestProof(
  userHash: string,
  imageUrl: string,
  message?: string
): Promise<{ ok: boolean; id?: number; error?: any }> {
  const proofMessage = message || 'Just crushed leg day! 💪';
  
  const result = await addActivityLogWithId(
    userHash,
    userHash,
    proofMessage,
    'workout', // or 'proof'
    imageUrl,
    null // game_id is optional
  );

  return result;
}

// Example usage:
// import { insertTestProof } from '@/lib/insert_test_proof';
// const result = await insertTestProof(
//   'your-user-hash-here',
//   'https://your-image-url.com/image.jpg',
//   'Custom message here'
// );

