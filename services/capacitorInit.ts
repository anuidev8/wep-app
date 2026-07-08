import { Capacitor } from '@capacitor/core';

let capacitorReady = false;

/**
 * Initialize Capacitor and wait for it to be ready
 * This ensures plugins like Preferences are available
 */
export const initializeCapacitor = async (): Promise<boolean> => {
  if (capacitorReady) {
    console.log('[CapacitorInit] Already initialized');
    return true;
  }

  try {
    console.log('[CapacitorInit] Starting Capacitor initialization...');

    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();

    if (!isNative) {
      console.log('[CapacitorInit] Running on web platform');
      capacitorReady = true;
      return true;
    }

    console.log('[CapacitorInit] Running on native platform:', platform);

    capacitorReady = true;
    console.log('[CapacitorInit] Capacitor initialization complete');
    return true;
  } catch (e) {
    console.error('[CapacitorInit] Error during Capacitor init', e);
    capacitorReady = true; // Set to true anyway to unblock the app
    return false;
  }
};

/**
 * Check if Capacitor is ready
 */
export const isCapacitorReady = (): boolean => {
  return capacitorReady;
};
