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

