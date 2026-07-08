/**
 * Native Audio Service
 * Wraps @capgo/native-audio with volume control and state management
 * Works on both iOS and Android
 */

import { NativeAudio } from '@capgo/native-audio';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { ensureAudioConfigured } from './audioInit';

const isNativePlatform = Capacitor.isNativePlatform();

export interface NativeAudioTrack {
  assetId: string;
  url: string;        // percent-encoded URL passed to the native plugin
  originalUrl: string; // raw URL before encodeURI — used for safe re-preloads (avoids double-encoding)
  isLoaded: boolean;
  isPlaying: boolean;
  isPaused: boolean; // true = paused mid-playback; use resume() not play()
  volume: number;
  loop: boolean;
  currentTime: number;
  duration: number;
}


class NativeAudioService {
  private tracks: Map<string, NativeAudioTrack> = new Map();
  private timeUpdateIntervals: Map<string, number> = new Map();
  private listeners: Map<string, Set<(track: NativeAudioTrack) => void>> = new Map();
  // Guards against triggering a second loop restart while one is already in flight
  private loopRestartingSet: Set<string> = new Set();
  // Version counter per assetId — incremented on each preload so in-flight unloads
  // from a previous play session don't clobber the new preload's track/listeners.
  private trackVersions: Map<string, number> = new Map();
  private pluginCurrentTimeHandle: PluginListenerHandle | null = null;
  // Native 'complete' event handles — survive screen-off where JS intervals can't
  private completionListeners: Map<string, PluginListenerHandle> = new Map();

  /**
   * Preload audio asset
   */
  async preload(assetId: string, url: string, options?: {
    volume?: number;
    loop?: boolean;
    ignoreSilent?: boolean;
  }): Promise<void> {
    if (!isNativePlatform) {
      console.warn('[NativeAudioService] Not on native platform, skipping preload');
      return;
    }

    // Ensure NativeAudio.configure() has completed before first preload — prevents first-load crash
    await ensureAudioConfigured();

    // Bump version SYNCHRONOUSLY at the very start, before any await.
    // This is the earliest possible point — guaranteeing that any in-flight
    // stop() / pause() / unload() from a previous session will see the version
    // change when their native call resolves and will skip touching our maps.
    this.trackVersions.set(assetId, (this.trackVersions.get(assetId) ?? 0) + 1);

    // Always start with a clean listener slate for this assetId so stale callbacks
    // from a previous session (which may still be in the Set even after unsubscribe)
    // can never receive events from the new session.
    this.listeners.delete(assetId);

    // Encode URL for GCS paths — decode existing percent-encoding first, then
    // re-encode each path segment with encodeURIComponent.  This is idempotent
    // (safe whether the incoming URL already has %20 or raw spaces) and avoids
    // the OSStatus 2003334207 / FigFilePlayer err=-12864 that AVFoundation throws
    // when it receives double-encoded or partially-encoded remote paths.
    const safeEncodeUrl = (rawUrl: string): string => {
      try {
        const parsed = new URL(rawUrl);
        parsed.pathname = parsed.pathname
          .split('/')
          .map(segment => {
            try { return encodeURIComponent(decodeURIComponent(segment)); }
            catch { return encodeURIComponent(segment); }
          })
          .join('/');
        return parsed.toString();
      } catch {
        return encodeURI(rawUrl);
      }
    };
    const encodedUrl = safeEncodeUrl(url);
    if (encodedUrl !== url) {
      console.log(`[NativeAudioService] URL encoded: ${encodedUrl}`);
    }

    // Fix 2: If native already has this asset (race condition on remount), unload first
    if (this.tracks.has(assetId)) {
      console.warn(`[NativeAudioService] Already tracked, unloading before re-preload: ${assetId}`);
      this.stopTimeTracking(assetId);
      try {
        await NativeAudio.unload({ assetId });
      } catch (e) {
        console.warn(`[NativeAudioService] Pre-unload failed (ok to ignore):`, e);
      }
      this.tracks.delete(assetId);
      this.listeners.delete(assetId);
    }

    const doPreload = async () => {
      await NativeAudio.preload({
        assetId,
        assetPath: encodedUrl,
        volume: options?.volume ?? 1.0,
        isUrl: true,
        ...(options?.ignoreSilent !== undefined && { ignoreSilent: options.ignoreSilent }),
      });
    };

    try {
      console.log(`[NativeAudioService] Preloading: ${assetId}`);
      await doPreload();
    } catch (error: any) {
      // Native may still have the asset from a previous session — unload and retry once
      if (error?.errorMessage?.includes('already loaded') || error?.message?.includes('already loaded')) {
        console.warn(`[NativeAudioService] Already loaded on native, unloading and retrying: ${assetId}`);
        try {
          await NativeAudio.unload({ assetId });
          await doPreload();
        } catch (retryError) {
          console.error(`[NativeAudioService] Retry preload failed for ${assetId}:`, retryError);
          throw retryError;
        }
      } else {
        console.error(`[NativeAudioService] Preload error for ${assetId}:`, error);
        throw error;
      }
    }

    this.tracks.set(assetId, {
      assetId,
      url: encodedUrl,
      originalUrl: url,  // preserve raw URL so re-preloads don't double-encode
      isLoaded: true,
      isPlaying: false,
      isPaused: false,
      volume: options?.volume ?? 1.0,
      loop: options?.loop ?? false,
      currentTime: 0,
      duration: 0,
    });

    console.log(`[NativeAudioService] Preloaded: ${assetId}`);
  }

  /**
   * Play audio
   */
  async play(assetId: string): Promise<void> {
    if (!isNativePlatform) return;

    await ensureAudioConfigured();

    try {
      const track = this.tracks.get(assetId);
      if (!track?.isLoaded) {
        console.warn(`[NativeAudioService] Track not loaded: ${assetId}`);
        return;
      }

      // Log full track state for layer assets so we can see volume at play-time
      if (assetId.startsWith('layer_')) {
        console.log(`[NativeAudioService] play() called for ${assetId}`, {
          volume: track.volume,
          isPaused: track.isPaused,
          isLoaded: track.isLoaded,
          loop: track.loop,
        });
      }

      // Use resume() when track was paused mid-playback — play() resets position to 0 on iOS
      if (track.isPaused) {
        await NativeAudio.resume({ assetId });
        console.log(`[NativeAudioService] Resumed: ${assetId}`);
      } else {
        await NativeAudio.play({ assetId });
        console.log(`[NativeAudioService] Playing: ${assetId}`);

        // Android MediaPlayer timing fix: setVolume() called before play() is ignored
        // when the player is still in PREPARING state. Re-apply the stored volume
        // immediately after play() so it lands while the player is in STARTED state.
        if (assetId.startsWith('layer_')) {
          try {
            await NativeAudio.setVolume({ assetId, volume: track.volume });
            console.log(`[NativeAudioService] Volume re-applied post-play: ${assetId} = ${track.volume}`);
          } catch (e) {
            console.warn(`[NativeAudioService] Post-play setVolume failed for ${assetId}:`, e);
          }
        }
      }

      track.isPlaying = true;
      track.isPaused = false;
      this.tracks.set(assetId, track);
      this.notifyListeners(assetId);

      // Start time tracking — on iOS, only after duration is ready to avoid getCurrentTime spam
      // and ensure seeking works. Will poll getDuration until non-zero if needed.
      this.startTimeTracking(assetId);

      // Register for plugin's currentTime push events — native fires every 100ms, we were not listening
      await this.ensurePluginCurrentTimeListener();

      // Register native complete listener for reliable loop restart — survives screen-off
      await this.ensureCompleteListener(assetId);
    } catch (error) {
      console.error(`[NativeAudioService] Play error for ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Register with the plugin's currentTime event so we receive push updates from native.
   * Fixes "No listeners found for event currentTime" — the plugin emits but we weren't subscribing.
   */
  private async ensurePluginCurrentTimeListener(): Promise<void> {
    if (!isNativePlatform || this.pluginCurrentTimeHandle) return;
    try {
      this.pluginCurrentTimeHandle = await NativeAudio.addListener(
        'currentTime',
        (event: { assetId: string; currentTime: number }) => {
          const track = this.tracks.get(event.assetId);
          if (!track?.isPlaying) return;
          track.currentTime = event.currentTime;
          this.tracks.set(event.assetId, track);
          this.notifyListeners(event.assetId);
        }
      );
    } catch (e) {
      console.warn('[NativeAudioService] Failed to add plugin currentTime listener:', e);
    }
  }

  /**
   * Register a native 'complete' event listener for reliable loop restart.
   * The native callback fires even when the screen is off, unlike JS intervals
   * which get throttled by Android's WebView when the display sleeps.
   */
  private async ensureCompleteListener(assetId: string): Promise<void> {
    if (!isNativePlatform) return;
    if (this.completionListeners.has(assetId)) return;

    try {
      const handle = await NativeAudio.addListener(
        'complete',
        async (event: { assetId: string }) => {
          if (event.assetId !== assetId) return;
          const track = this.tracks.get(assetId);
          if (!track?.loop) return;
          if (this.loopRestartingSet.has(assetId)) return;

          this.loopRestartingSet.add(assetId);
          console.log('[NativeAudioService] complete event — restarting loop:', assetId);
          try {
            track.isPaused = false;
            track.currentTime = 0;
            this.tracks.set(assetId, track);
            await NativeAudio.setCurrentTime({ assetId, time: 0 });
            await NativeAudio.play({ assetId });
            track.isPlaying = true;
            this.tracks.set(assetId, track);
            this.notifyListeners(assetId);
          } catch (e) {
            console.error('[NativeAudioService] complete-loop restart failed:', e);
          } finally {
            this.loopRestartingSet.delete(assetId);
          }
        }
      );
      this.completionListeners.set(assetId, handle);
    } catch (e) {
      console.warn('[NativeAudioService] Failed to add complete listener:', e);
    }
  }

  /**
   * Pause audio
   */
  async pause(assetId: string): Promise<void> {
    if (!isNativePlatform) return;

    // Capture session version so a stale fire-and-forget pause from a previous
    // session can't overwrite the new session's isPlaying / stop its tracking.
    const myVersion = this.trackVersions.get(assetId) ?? 0;

    try {
      const track = this.tracks.get(assetId);
      if (!track) return;

      await NativeAudio.pause({ assetId });

      // If a new preload() started while we were waiting, leave it alone.
      if ((this.trackVersions.get(assetId) ?? 0) !== myVersion) return;

      track.isPlaying = false;
      track.isPaused = true; // flag so next play() uses resume() to preserve position
      this.tracks.set(assetId, track);
      this.notifyListeners(assetId);

      // Stop time tracking
      this.stopTimeTracking(assetId);

      console.log(`[NativeAudioService] Paused: ${assetId}`);
    } catch (error) {
      console.error(`[NativeAudioService] Pause error for ${assetId}:`, error);
    }
  }

  /**
   * Stop audio and reset position
   */
  async stop(assetId: string): Promise<void> {
    if (!isNativePlatform) return;

    // Capture session version so a stale fire-and-forget stop from a previous
    // session can't call stopTimeTracking() on the new session's interval or
    // overwrite isPlaying=false on the new session's track.
    const myVersion = this.trackVersions.get(assetId) ?? 0;

    try {
      const track = this.tracks.get(assetId);
      if (!track) return;

      await NativeAudio.stop({ assetId });

      // If a new preload() started while we were waiting, leave its state alone.
      if ((this.trackVersions.get(assetId) ?? 0) !== myVersion) return;

      track.isPlaying = false;
      track.isPaused = false; // stopped = not paused; next play() starts fresh
      track.currentTime = 0;
      this.tracks.set(assetId, track);
      this.notifyListeners(assetId);

      this.stopTimeTracking(assetId);

      console.log(`[NativeAudioService] Stopped: ${assetId}`);
    } catch (error) {
      console.error(`[NativeAudioService] Stop error for ${assetId}:`, error);
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  async setVolume(assetId: string, volume: number): Promise<void> {
    if (!isNativePlatform) return;

    try {
      const track = this.tracks.get(assetId);
      if (!track?.isLoaded) return;

      const clampedVolume = Math.max(0, Math.min(1, volume));

      await NativeAudio.setVolume({
        assetId,
        volume: clampedVolume
      });

      track.volume = clampedVolume;
      this.tracks.set(assetId, track);
      this.notifyListeners(assetId);

      console.log(`[NativeAudioService] Set volume ${assetId}: ${clampedVolume}`);
    } catch (error) {
      console.error(`[NativeAudioService] SetVolume error for ${assetId}:`, error);
    }
  }

  /**
   * Loop audio
   */
  async loop(assetId: string): Promise<void> {
    if (!isNativePlatform) return;

    try {
      const track = this.tracks.get(assetId);
      if (!track?.isLoaded) return;

      await NativeAudio.loop({ assetId });

      track.loop = true;
      this.tracks.set(assetId, track);

      console.log(`[NativeAudioService] Looping enabled: ${assetId}`);
    } catch (error) {
      console.error(`[NativeAudioService] Loop error for ${assetId}:`, error);
    }
  }

  /**
   * Unload audio
   *
   * Race-safe: captures the current version at the start of the call.
   * If a new preload() runs while the async NativeAudio.unload is in-flight,
   * the version will have been bumped and we skip the tracks/listeners cleanup
   * so we don't clobber the new session's state.
   */
  async unload(assetId: string): Promise<void> {
    if (!isNativePlatform) return;

    // Capture version synchronously — no other JS can run until the first await,
    // so this is always the current version at the time of this call.
    const myVersion = this.trackVersions.get(assetId) ?? 0;

    try {
      this.stopTimeTracking(assetId);
      this.loopRestartingSet.delete(assetId);

      const completionHandle = this.completionListeners.get(assetId);
      if (completionHandle) {
        completionHandle.remove();
        this.completionListeners.delete(assetId);
      }

      await NativeAudio.unload({ assetId });

      // After the async native call, check if a new preload() has run in the meantime.
      // If the version changed, a new session owns this assetId — don't touch its maps.
      if ((this.trackVersions.get(assetId) ?? 0) === myVersion) {
        this.tracks.delete(assetId);
        this.listeners.delete(assetId);
        this.trackVersions.delete(assetId);
        if (this.pluginCurrentTimeHandle && this.tracks.size === 0) {
          this.pluginCurrentTimeHandle.remove();
          this.pluginCurrentTimeHandle = null;
        }
        console.log(`[NativeAudioService] Unloaded: ${assetId}`);
      } else {
        console.log(`[NativeAudioService] Unload skipped map cleanup (new preload in flight): ${assetId}`);
      }
    } catch (error) {
      console.error(`[NativeAudioService] Unload error for ${assetId}:`, error);
    }
  }

  /**
   * Get current playback position from native plugin
   */
  async getCurrentTime(assetId: string): Promise<number> {
    if (!isNativePlatform) return 0;
    try {
      const result = await NativeAudio.getCurrentTime({ assetId });
      return result.currentTime ?? 0;
    } catch {
      return this.tracks.get(assetId)?.currentTime ?? 0;
    }
  }

  /**
   * Get duration
   */
  async getDuration(assetId: string): Promise<number> {
    if (!isNativePlatform) return 0;

    try {
      const result = await NativeAudio.getDuration({ assetId });
      const track = this.tracks.get(assetId);

      if (track && result.duration) {
        track.duration = result.duration;
        this.tracks.set(assetId, track);
      }

      return result.duration ?? 0;
    } catch (error) {
      console.error(`[NativeAudioService] GetDuration error for ${assetId}:`, error);
      return 0;
    }
  }

  /**
   * Check if track is playing
   */
  isPlaying(assetId: string): boolean {
    return this.tracks.get(assetId)?.isPlaying ?? false;
  }

  /**
   * Get track info
   */
  getTrack(assetId: string): NativeAudioTrack | undefined {
    return this.tracks.get(assetId);
  }

  /**
   * Dump all layer_ tracks to console for debugging
   */
  debugDumpLayers(): void {
    const layerEntries = Array.from(this.tracks.entries()).filter(([id]) => id.startsWith('layer_'));
    if (layerEntries.length === 0) {
      console.log('[NativeAudioService] debugDump: no layer_ assets loaded');
      return;
    }
    console.log(`[NativeAudioService] debugDump: ${layerEntries.length} layer(s) loaded`);
    for (const [id, track] of layerEntries) {
      console.log(`  ${id}:`, {
        isLoaded: track.isLoaded,
        isPlaying: track.isPlaying,
        isPaused: track.isPaused,
        volume: track.volume,
        loop: track.loop,
        currentTime: track.currentTime,
        duration: track.duration,
      });
    }
  }

  /**
   * Listen to track changes
   */
  addListener(assetId: string, callback: (track: NativeAudioTrack) => void): () => void {
    if (!this.listeners.has(assetId)) {
      this.listeners.set(assetId, new Set());
    }

    this.listeners.get(assetId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(assetId)?.delete(callback);
    };
  }

  /**
   * Notify listeners of track changes
   */
  private notifyListeners(assetId: string): void {
    const track = this.tracks.get(assetId);
    if (!track) return;

    const listeners = this.listeners.get(assetId);
    if (listeners) {
      listeners.forEach(callback => callback(track));
    }
  }

  /**
   * Set current playback position
   */
  async setCurrentTime(assetId: string, time: number): Promise<void> {
    if (!isNativePlatform) return;

    console.log('[NativeAudioService] setCurrentTime', { assetId, time, platform: Capacitor.getPlatform() });

    try {
      await NativeAudio.setCurrentTime({ assetId, time });
    } catch (error) {
      console.warn(`[NativeAudioService] SetCurrentTime failed for ${assetId}:`, error);
    }

    // Update local state and notify regardless of plugin success
    const track = this.tracks.get(assetId);
    if (track) {
      track.currentTime = time;
      this.tracks.set(assetId, track);
      this.notifyListeners(assetId);
    }
  }

  /**
   * Start tracking playback time.
   *
   * NativeAudio.getCurrentTime() returns 0 on Android due to a threading bug in
   * the plugin (runOnUiThread posts the read after the bridge callback fires).
   * Real-time position updates arrive correctly via the push-based 'currentTime'
   * event registered in ensurePluginCurrentTimeListener(). This interval only
   * handles two things: (1) fetching duration until it becomes available, and
   * (2) loop restart detection as a JS-side fallback in case the native 'complete'
   * event fires late or not at all on some Android versions.
   */
  private startTimeTracking(assetId: string): void {
    this.stopTimeTracking(assetId);

    // Bind this interval to the current logical session (trackVersion counter).
    // If a new preload() starts for the same assetId, the version bumps and this
    // interval self-terminates on the next tick WITHOUT touching timeUpdateIntervals
    // (which by then points to the new session's interval).
    const mySession = this.trackVersions.get(assetId) ?? 0;

    const interval = window.setInterval(() => {
      (async () => {
        // Session guard — self-terminate without touching the new session's interval.
        if ((this.trackVersions.get(assetId) ?? 0) !== mySession) {
          clearInterval(interval);
          if (this.timeUpdateIntervals.get(assetId) === interval) {
            this.timeUpdateIntervals.delete(assetId);
          }
          return;
        }

        const track = this.tracks.get(assetId);
        if (!track) return;

        // Only stop the interval for non-looping tracks when not playing.
        // Looping tracks: keep alive so loop restart below can still trigger.
        if (!track.isPlaying) {
          if (!track.loop) this.stopTimeTracking(assetId);
          return;
        }

        // Fetch duration until it becomes available (remote URLs buffer slowly).
        if (track.duration <= 0) {
          try {
            const durResult = await NativeAudio.getDuration({ assetId });
            if (durResult.duration > 0) {
              track.duration = durResult.duration;
              this.tracks.set(assetId, track);
              this.notifyListeners(assetId);
            }
          } catch { /* ignore */ }
          return;
        }

        // JS-side loop restart fallback — triggers if the native 'complete' event
        // is delayed or missed. The 0.5s margin prevents a double-restart race with
        // the complete listener (which also checks loopRestartingSet).
        if (track.loop && track.currentTime >= track.duration - 0.5) {
          if (!this.loopRestartingSet.has(assetId)) {
            this.loopRestartingSet.add(assetId);
            track.currentTime = 0;
            track.isPaused = false;
            this.tracks.set(assetId, track);
            this.notifyListeners(assetId);
            try {
              await NativeAudio.setCurrentTime({ assetId, time: 0 });
              await NativeAudio.play({ assetId });
              console.log(`[NativeAudioService] Loop restart (JS fallback): ${assetId}`);
            } catch (e) {
              console.error(`[NativeAudioService] Loop restart failed: ${assetId}`, e);
            } finally {
              this.loopRestartingSet.delete(assetId);
            }
          }
        }
      })();
    }, 1000); // 1s — push events handle real-time UI; this interval is housekeeping only

    this.timeUpdateIntervals.set(assetId, interval);
  }

  /**
   * Stop tracking playback time
   */
  private stopTimeTracking(assetId: string): void {
    const interval = this.timeUpdateIntervals.get(assetId);
    if (interval) {
      clearInterval(interval);
      this.timeUpdateIntervals.delete(assetId);
    }
  }

  /**
   * Cleanup all tracks
   */
  async cleanup(): Promise<void> {
    const assetIds = Array.from(this.tracks.keys());

    for (const assetId of assetIds) {
      await this.unload(assetId);
    }

    this.trackVersions.clear();
  }
}

export const nativeAudioService = new NativeAudioService();
