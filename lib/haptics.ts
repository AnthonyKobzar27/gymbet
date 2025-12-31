import * as Haptics from 'expo-haptics';
import { Platform, AppState } from 'react-native';

let hapticsDisabled = false;
let hapticFailureCount = 0;
const MAX_FAILURES = 3;

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'swipe' = 'medium') => {
  if (hapticsDisabled) return;

  try {
    if (!AppState || AppState.currentState !== 'active') return;
  } catch {
    return;
  }

  try {
    if (!Platform || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  } catch {
    return;
  }

  try {
    if (!Haptics || typeof Haptics.impactAsync !== 'function') return;
  } catch {
    return;
  }

  setTimeout(() => {
    try {
      if (hapticsDisabled) return;

      const executeHaptic = async () => {
        try {
          if (style === 'swipe') {
            // Unique swipe pattern: quick double tap like Polymarket
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await new Promise(resolve => setTimeout(resolve, 40));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            hapticFailureCount = 0;
            return;
          }

          let hapticPromise: Promise<void> | null = null;

          switch (style) {
            case 'light':
              hapticPromise = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              break;
            case 'medium':
              hapticPromise = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              break;
            case 'heavy':
              hapticPromise = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              break;
            case 'success':
              hapticPromise = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              break;
            case 'warning':
              hapticPromise = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              break;
            case 'error':
              hapticPromise = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              break;
            default:
              return;
          }

          if (hapticPromise) {
            hapticPromise.catch(() => {});
            try {
              await hapticPromise;
              hapticFailureCount = 0;
            } catch {
              hapticFailureCount++;
              if (hapticFailureCount >= MAX_FAILURES) hapticsDisabled = true;
            }
          }
        } catch {
          hapticFailureCount++;
          if (hapticFailureCount >= MAX_FAILURES) hapticsDisabled = true;
        }
      };

      executeHaptic().catch(() => {
        hapticFailureCount++;
        if (hapticFailureCount >= MAX_FAILURES) hapticsDisabled = true;
      });
    } catch {
      hapticFailureCount++;
      if (hapticFailureCount >= MAX_FAILURES) hapticsDisabled = true;
    }
  }, 0);
};

export const resetHaptics = () => {
  hapticsDisabled = false;
  hapticFailureCount = 0;
};
