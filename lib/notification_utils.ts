import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  return true;
}

export async function scheduleMorningReminder(): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Workout proof reminder!',
        body: 'Submit your workout proof today!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
      } as any,
    });
    return notificationId;
  } catch (error) {
    console.error('Error scheduling morning reminder:', error);
    return null;
  }
}

export async function scheduleNightlyReminder(): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Workout proof reminder!',
        body: 'Make sure you submitted your workout proof!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: 21,
        minute: 0,
        repeats: true,
      } as any,
    });
    return notificationId;
  } catch (error) {
    console.error('Error scheduling nightly reminder:', error);
    return null;
  }
}

export async function notifyGameStart(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Game started!',
        body: 'Your game has begun! Submit your workout proofs to stay in the game.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error sending game start notification:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

export async function setupGameNotifications(): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await cancelAllNotifications();
  await scheduleMorningReminder();
  await scheduleNightlyReminder();
}

export async function clearGameNotifications(): Promise<void> {
  await cancelAllNotifications();
}
