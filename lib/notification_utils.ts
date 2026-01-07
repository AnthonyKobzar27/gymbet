import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_hash: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  created_at: string;
}

export async function getNotifications(userHash: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_hash', userHash)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function getUnreadCount(userHash: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_hash', userHash)
      .eq('read', false);

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<{ ok: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { ok: false, error };
  }
}

export async function markAllNotificationsAsRead(userHash: string): Promise<{ ok: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_hash', userHash)
      .eq('read', false);

    if (error) {
      console.error('Failed to mark all notifications as read:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { ok: false, error };
  }
}

export async function createNotification(
  userHash: string,
  title: string,
  message: string,
  type?: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_hash: userHash,
        title,
        message,
        type,
        read: false,
      });

    if (error) {
      console.error('Failed to create notification:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { ok: false, error };
  }
}
