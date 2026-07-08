/**
 * Ensures NativeAudio is configured before any preload/play.
 * Prevents first-load crash when user navigates to player before configure completes.
 */

import { NativeAudio } from '@capgo/native-audio';
import { Capacitor } from '@capacitor/core';

let configurePromise: Promise<void> | null = null;

export async function ensureAudioConfigured(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!configurePromise) {
    configurePromise = NativeAudio.configure({
      background: true,
      backgroundPlayback: true, // Prevents handleOnPause() from auto-pausing tracks on Android screen-off
      showNotification: true,
      focus: true,
    }).catch((err: unknown) => {
      console.warn('[NativeAudio] configure error', err);
      // Reset so the next preload() call retries configure rather than
      // proceeding with an unconfigured audio session (which causes a native crash).
      configurePromise = null;
    });
  }
  await configurePromise;
}
