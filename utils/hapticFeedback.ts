/**
 * Haptic Feedback Utility for Web
 * Uses Web Vibration API for mobile device feedback
 * Falls back gracefully on unsupported devices
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback (light, medium, heavy, success, warning, error)
 */
export const triggerHaptic = (type: HapticType = 'light'): void => {
  // Check if Vibration API is supported
  if (!('vibrate' in navigator)) {
    return; // Silently fail on unsupported devices
  }

  try {
    switch (type) {
      case 'light':
        // Short, light vibration (10ms)
        navigator.vibrate(10);
        break;
      
      case 'medium':
        // Medium vibration (20ms)
        navigator.vibrate(20);
        break;
      
      case 'heavy':
        // Strong vibration (30ms)
        navigator.vibrate(30);
        break;
      
      case 'success':
        // Success pattern: short-short (10ms, pause, 10ms)
        navigator.vibrate([10, 50, 10]);
        break;
      
      case 'warning':
        // Warning pattern: medium-short (20ms, pause, 10ms)
        navigator.vibrate([20, 50, 10]);
        break;
      
      case 'error':
        // Error pattern: long-short-long (30ms, pause, 10ms, pause, 30ms)
        navigator.vibrate([30, 50, 10, 50, 30]);
        break;
      
      default:
        navigator.vibrate(10);
    }
  } catch (error) {
    // Silently fail if vibration fails (e.g., permission denied)
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Hook for haptic feedback in React components
 */
export const useHaptic = () => {
  return {
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
  };
};

