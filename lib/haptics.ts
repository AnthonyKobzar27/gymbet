import * as Haptics from 'expo-haptics';
import { Platform, AppState } from 'react-native';

// Global flag to disable haptics if they fail repeatedly
let hapticsDisabled = false;
let hapticFailureCount = 0;
const MAX_FAILURES = 3;

/**
 * Ultra-safe haptic feedback utility that will NEVER crash the app
 * Multiple layers of error handling ensure complete safety
 */
export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') => {
  // Layer 1: Early exit if haptics are disabled
  if (hapticsDisabled) {
    return;
  }

  // Layer 2: Check if we're in a valid state
  try {
    if (!AppState || AppState.currentState !== 'active') {
      return;
    }
  } catch (e) {
    // If AppState check fails, just return
    return;
  }

  // Layer 3: Verify Platform is available
  try {
    if (!Platform || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
      return;
    }
  } catch (e) {
    return;
  }

  // Layer 4: Verify Haptics module is available
  try {
    if (!Haptics || typeof Haptics.impactAsync !== 'function' || typeof Haptics.notificationAsync !== 'function') {
      return;
    }
  } catch (e) {
    return;
  }

  // Layer 5: Wrap everything in a try-catch and use setTimeout to ensure it's async
  // This prevents any synchronous errors from propagating
  setTimeout(() => {
    try {
      // Layer 6: Double-check haptics aren't disabled (race condition protection)
      if (hapticsDisabled) {
        return;
      }

      // Layer 7: Execute haptic with multiple error handlers
      const executeHaptic = async () => {
        try {
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

          // Layer 8: If we got a promise, handle it with multiple catch handlers
          if (hapticPromise) {
            // First catch: handle promise rejection
            hapticPromise.catch(() => {
              // Silently handle - don't do anything
            });

            // Second catch: wrap in try-catch for any synchronous errors
            try {
              await hapticPromise;
              // Reset failure count on success
              hapticFailureCount = 0;
            } catch (e) {
              // Increment failure count
              hapticFailureCount++;
              if (hapticFailureCount >= MAX_FAILURES) {
                hapticsDisabled = true;
              }
            }
          }
        } catch (error) {
          // Layer 9: Catch any errors in the async function
          hapticFailureCount++;
          if (hapticFailureCount >= MAX_FAILURES) {
            hapticsDisabled = true;
          }
        }
      };

      // Execute the haptic function
      executeHaptic().catch(() => {
        // Layer 10: Final catch for the executeHaptic promise itself
        hapticFailureCount++;
        if (hapticFailureCount >= MAX_FAILURES) {
          hapticsDisabled = true;
        }
      });
    } catch (error) {
      // Layer 11: Catch any synchronous errors in the setTimeout callback
      hapticFailureCount++;
      if (hapticFailureCount >= MAX_FAILURES) {
        hapticsDisabled = true;
      }
    }
  }, 0); // Use setTimeout with 0 delay to ensure it's truly async and won't block
};

/**
 * Reset haptics (useful for testing or if you want to re-enable after disabling)
 */
export const resetHaptics = () => {
  hapticsDisabled = false;
  hapticFailureCount = 0;
};

