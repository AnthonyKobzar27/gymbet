import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';
import { 
  registerForPushNotifications, 
  savePushToken,
  removePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  setupRemindersForActiveGame,
} from '@/lib/push_notifications';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

export function usePushNotifications() {
  const { user, getUserProfile } = useAuth();
  const { cache } = useDataCache();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupPushNotifications = async () => {
      if (!user) {
        // User logged out - clean up token from state and cancel reminders
        setExpoPushToken(null);
        setupRemindersForActiveGame(false);
        return;
      }

      try {
        // Register for push notifications
        const token = await registerForPushNotifications();
        if (token && isMounted) {
          setExpoPushToken(token);
          
          // Save token to database
          const profile = await getUserProfile();
          if (profile?.hash) {
            await savePushToken(profile.hash, token);
          }
        }
      } catch (error) {
        console.log('Push notification setup error:', error);
      }
    };

    setupPushNotifications();

    // Only set up listeners if we have a user
    if (user) {
      try {
        // Listen for incoming notifications while app is in foreground
        notificationListener.current = addNotificationReceivedListener((notification) => {
          if (isMounted) {
            setNotification(notification);
            console.log('Notification received:', notification);
          }
        });

        // Listen for notification taps
        responseListener.current = addNotificationResponseListener((response) => {
          const data = response.notification.request.content.data;
          console.log('Notification tapped:', data);

          // Navigate based on notification type
          if (data?.type) {
            switch (data.type) {
              case 'daily-reminder':
              case 'game_started':
              case 'player_joined':
              case 'player_eliminated':
              case 'game_won':
              case 'game_ended':
                router.push('/(tabs)/bets');
                break;
              case 'proof_approved':
              case 'proof_rejected':
                router.push('/(tabs)/proofs');
                break;
              default:
                router.push('/(tabs)');
            }
          }
        });
      } catch (error) {
        console.log('Notification listener setup error:', error);
      }
    }

    return () => {
      isMounted = false;
      // Clean up subscriptions using the subscription's remove method
      try {
        if (notificationListener.current?.remove) {
          notificationListener.current.remove();
        }
        if (responseListener.current?.remove) {
          responseListener.current.remove();
        }
      } catch (error) {
        // Silently ignore cleanup errors
      }
      notificationListener.current = null;
      responseListener.current = null;
    };
  }, [user]);

  // Set up daily reminders based on active game status
  useEffect(() => {
    if (user && cache.isPreloaded) {
      const hasActiveGame = cache.activeGame !== null;
      setupRemindersForActiveGame(hasActiveGame).catch(err =>
        console.log('Non-critical: Failed to setup daily reminders', err)
      );
    }
  }, [user, cache.isPreloaded, cache.activeGame]);

  return {
    expoPushToken,
    notification,
  };
}

