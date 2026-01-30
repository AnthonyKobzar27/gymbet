import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Try to import expo-device, but it's optional
let Device: { isDevice: boolean } | null = null;
try {
  Device = require('expo-device');
} catch {
  // expo-device not available, will skip device check
}

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  // Must be a physical device (if expo-device is available)
  if (Device && !Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    if (!projectId) {
      console.log('Project ID not found for push notifications');
      return null;
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushTokenData.data;
    console.log('Push token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync('game-updates', {
      name: 'Game Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00FF00',
    });

    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: '#0000FF',
    });
  }

  return token;
}

/**
 * Save push token to database for a user
 */
export async function savePushToken(userHash: string, token: string): Promise<{ ok: boolean; error?: any }> {
  try {
    const platform = Platform.OS as 'ios' | 'android' | 'web';

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_hash: userHash,
          token: token,
          platform: platform,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_hash',
        }
      );

    if (error) {
      console.error('Error saving push token:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error saving push token:', error);
    return { ok: false, error };
  }
}

/**
 * Remove push token from database (on logout)
 */
export async function removePushToken(userHash: string): Promise<{ ok: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_hash', userHash);

    if (error) {
      console.error('Error removing push token:', error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error removing push token:', error);
    return { ok: false, error };
  }
}

/**
 * Get push token for a user
 */
export async function getPushToken(userHash: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_hash', userHash)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.token;
  } catch {
    return null;
  }
}

/**
 * Add notification listener for when app receives a notification
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener for when user taps a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: trigger || null, // null = immediate
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel specific notification by ID
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// ============================================================================
// DAILY PROOF REMINDER SYSTEM
// ============================================================================

const REMINDER_IDENTIFIERS = {
  MORNING: 'daily-proof-reminder-9am',
  NOON: 'daily-proof-reminder-12pm',
  AFTERNOON: 'daily-proof-reminder-4pm',
};

/**
 * Schedule daily proof reminders at 9am, 12pm, and 4pm
 * These remind users to submit their workout proofs
 */
export async function scheduleDailyProofReminders(): Promise<void> {
  // Cancel any existing reminders first to avoid duplicates
  await cancelDailyProofReminders();

  const androidChannelId = Platform.OS === 'android' ? 'daily-reminders' : undefined;

  // Schedule 9:00 AM reminder
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIERS.MORNING,
    content: {
      title: "Time to work out! 💪",
      body: "Don't forget to submit your workout proof today. Stay consistent to win!",
      data: { type: 'daily-reminder', time: '9am' },
      sound: true,
      ...(androidChannelId && { channelId: androidChannelId }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });

  // Schedule 12:00 PM reminder
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIERS.NOON,
    content: {
      title: "Midday check-in 🏋️",
      body: "Have you submitted your workout proof yet? Don't risk losing your stake!",
      data: { type: 'daily-reminder', time: '12pm' },
      sound: true,
      ...(androidChannelId && { channelId: androidChannelId }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 12,
      minute: 0,
    },
  });

  // Schedule 4:00 PM reminder
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIERS.AFTERNOON,
    content: {
      title: "Final reminder! ⚠️",
      body: "Last chance to submit your workout proof today. Your stake is on the line!",
      data: { type: 'daily-reminder', time: '4pm' },
      sound: true,
      ...(androidChannelId && { channelId: androidChannelId }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 16,
      minute: 0,
    },
  });

  console.log('✅ Daily proof reminders scheduled (9am, 12pm, 4pm)');
}

/**
 * Cancel all daily proof reminders
 * Call this when user leaves a game or game ends
 */
export async function cancelDailyProofReminders(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIERS.MORNING);
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIERS.NOON);
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIERS.AFTERNOON);
    console.log('✅ Daily proof reminders cancelled');
  } catch (error) {
    // Ignore errors if notifications weren't scheduled
    console.log('Note: Some reminders may not have been scheduled', error);
  }
}

/**
 * Cancel remaining reminders for today after user submits proof
 */
export async function cancelTodaysRemainingReminders(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();

  try {
    // Cancel reminders that haven't fired yet today
    if (currentHour < 12) {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIERS.NOON);
      await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIERS.AFTERNOON);
    } else if (currentHour < 16) {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIERS.AFTERNOON);
    }
    console.log('✅ Remaining reminders for today cancelled');
  } catch (error) {
    console.log('Note: Some reminders may not have been scheduled', error);
  }
}

/**
 * Re-schedule reminders after proof submission (for tomorrow)
 * This ensures reminders continue for the next day
 */
export async function rescheduleRemindersAfterProof(): Promise<void> {
  // Cancel today's remaining reminders
  await cancelTodaysRemainingReminders();
  
  // The daily triggers will automatically fire tomorrow
  // No need to reschedule as DAILY trigger repeats automatically
  console.log('✅ Reminders will continue tomorrow');
}

/**
 * Check if user has an active game and set up reminders accordingly
 */
export async function setupRemindersForActiveGame(hasActiveGame: boolean): Promise<void> {
  if (hasActiveGame) {
    await scheduleDailyProofReminders();
  } else {
    await cancelDailyProofReminders();
  }
}

/**
 * Get notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

