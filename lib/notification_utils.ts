import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return false;
  }

  return true;
}

/**
 * Schedule notification 1 hour before wake-up time
 * @param wakeUpTime - Wake up time in format "HH:MM:SS" (e.g., "07:00:00")
 * @returns notification ID
 */
export async function scheduleWakeUpReminder(
  wakeUpTime: string
): Promise<string | null> {
  try {
    // Parse wake-up time
    const [hours, minutes] = wakeUpTime.split(':').map(Number);

    // Calculate 1 hour before
    let reminderHours = hours - 1;
    let reminderMinutes = minutes;

    // Handle edge case: if wake time is midnight or early morning
    if (reminderHours < 0) {
      reminderHours = 23;
    }

    console.log(`Scheduling wake-up reminder for ${reminderHours}:${reminderMinutes}`);

    // Schedule daily notification at reminder time
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Wake Up Reminder!',
        body: `Your wake-up time is in 1 hour! Get ready to submit your proof at ${hours}:${String(minutes).padStart(2, '0')}.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: reminderHours,
        minute: reminderMinutes,
        repeats: true,
      },
    });

    console.log('Wake-up reminder scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling wake-up reminder:', error);
    return null;
  }
}

/**
 * Schedule nightly 9 PM reminder
 * @returns notification ID
 */
export async function scheduleNightlyReminder(): Promise<string | null> {
  try {
    console.log('Scheduling nightly 9 PM reminder');

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 Bedtime Reminder',
        body: "Don't forget to get enough sleep tonight! Your wake-up challenge is tomorrow morning.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: 21, // 9 PM
        minute: 0,
        repeats: true,
      },
    });

    console.log('Nightly reminder scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling nightly reminder:', error);
    return null;
  }
}

/**
 * Cancel a specific notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('Notification canceled:', notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications canceled');
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Scheduled notifications:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Set up game notifications (call when user joins a game)
 */
export async function setupGameNotifications(
  wakeUpTime: string
): Promise<{ wakeUpReminderId: string | null; nightlyReminderId: string | null }> {
  console.log('=== Setting up game notifications ===');

  // Request permissions first
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('No notification permission, skipping setup');
    return { wakeUpReminderId: null, nightlyReminderId: null };
  }

  // Cancel any existing notifications
  await cancelAllNotifications();

  // Schedule new notifications
  const wakeUpReminderId = await scheduleWakeUpReminder(wakeUpTime);
  const nightlyReminderId = await scheduleNightlyReminder();

  console.log('Game notifications set up successfully');
  console.log('Wake-up reminder ID:', wakeUpReminderId);
  console.log('Nightly reminder ID:', nightlyReminderId);

  return { wakeUpReminderId, nightlyReminderId };
}

/**
 * Clear game notifications (call when user leaves a game)
 */
export async function clearGameNotifications(): Promise<void> {
  console.log('=== Clearing game notifications ===');
  await cancelAllNotifications();
  console.log('All game notifications cleared');
}
