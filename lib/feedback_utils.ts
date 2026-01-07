import { supabase } from './supabase';

export async function submitFeedback(
  userHash: string,
  feedbackText: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    // Using upsert since hash is the primary key - allows updating existing feedback
    const { error } = await supabase
      .from('feedback')
      .upsert({
        hash: userHash,
        feedback: feedbackText,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'hash'
      });

    if (error) {
      console.error('Failed to submit feedback:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return { ok: false, error };
  }
}

