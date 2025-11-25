import { supabase } from './supabase';

export interface FlaggedPost {
  id: number;
  post_id: string;
  post_user_hash: string;
  flagged_by_hash: string;
  image_url?: string;
  text_content?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export interface BlockedUser {
  id: number;
  blocker_hash: string;
  blocked_hash: string;
  created_at: string;
}

/**
 * Flag a post for review
 */
export async function flagPost(
  postId: string,
  postUserHash: string,
  flaggedByHash: string,
  imageUrl: string | null,
  textContent: string | null,
  reason: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    const { error } = await supabase.from('flagged_posts').insert({
      post_id: postId,
      post_user_hash: postUserHash,
      flagged_by_hash: flaggedByHash,
      image_url: imageUrl,
      text_content: textContent,
      reason: reason,
      status: 'pending',
    });

    if (error) {
      console.error('Failed to flag post:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error flagging post:', error);
    return { ok: false, error };
  }
}

/**
 * Block a user
 */
export async function blockUser(
  blockerHash: string,
  blockedHash: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_hash', blockerHash)
      .eq('blocked_hash', blockedHash)
      .maybeSingle();

    if (existing) {
      return { ok: true }; // Already blocked
    }

    const { error } = await supabase.from('blocked_users').insert({
      blocker_hash: blockerHash,
      blocked_hash: blockedHash,
    });

    if (error) {
      console.error('Failed to block user:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { ok: false, error };
  }
}

/**
 * Get list of blocked user hashes for a user
 */
export async function getBlockedUsers(
  userHash: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocked_hash')
      .eq('blocker_hash', userHash);

    if (error) {
      console.error('Failed to get blocked users:', error);
      return [];
    }

    return (data || []).map((item) => item.blocked_hash);
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return [];
  }
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(
  blockerHash: string,
  blockedHash: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_hash', blockerHash)
      .eq('blocked_hash', blockedHash)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return false;
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(
  blockerHash: string,
  blockedHash: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_hash', blockerHash)
      .eq('blocked_hash', blockedHash);

    if (error) {
      console.error('Failed to unblock user:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { ok: false, error };
  }
}

