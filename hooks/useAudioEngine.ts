/**
 * useAudioEngine — NativeAudio only (iOS and Android)
 * Web audio path removed; uses @capgo/native-audio exclusively.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

import { MediaSession as NativeMediaSession } from '@capgo/capacitor-media-session';
import { AudioTrack, FavoriteCategory } from '../types';
import { useApp } from '../context/AppContext';
import { nativeAudioService, NativeAudioTrack } from '../services/nativeAudioService';

// Categories where NativeAudio loops natively — never kill isPlaying on completion
const LOOPING_CATEGORIES = ['SLEEP', 'MANTRA', 'SHIVA', 'CHAKRA', 'GUIDED'];

export interface AudioEngine {
  trackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  isCompleted: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>; // Unused; kept for API compatibility
  togglePlay: () => void;
  beginUserSeek: () => void;
  seekBy: (seconds: number) => void;
  seekTo: (time: number) => void;
  isFavorite: boolean;
  toggleFavorite: () => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  sleepTimer: {
    secondsRemaining: number | null;
    isActive: boolean;
    setTimer: (minutes: number | null) => void;
  };
}

export const useAudioEngine = (
  track: AudioTrack | null,
  type: string | null,
  options?: {
    onNextTrack?: () => void;
    onPreviousTrack?: () => void;
  }
): AudioEngine => {
  const { addCalmPoints, incrementStreak, favorites, toggleFavorite: appToggleFavorite } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  // Ref-tracked playing state — lets MediaSession handlers (registered once) read the current value
  // without stale closure captures. Updated every render (like seekByRef).
  const isPlayingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Sleep Timer State
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [isSleepTimerActive, setIsSleepTimerActive] = useState(false);
  const originalVolumeRef = useRef(1);
  // Wall-clock sleep timer refs — survive background throttling of JS timers
  const timerStartRef = useRef<number | null>(null);
  const timerDurationSecondsRef = useRef<number>(0);
  const fadeStartedRef = useRef(false);

  // Volume refs for immediate sync
  const volumeRef = useRef(1);
  const isMutedRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaMetadataReadyRef = useRef(false);
  const isNativePlatform = Capacitor.isNativePlatform();

  // Asset ID for NativeAudio — session-unique to avoid collisions when same track plays from different entry points
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
  );
  const assetIdRef = useRef<string>('');

  // Listener cleanup ref — allows sync unsubscribe on track change / unmount
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // AbortController — cancels in-flight async setup when track changes
  const abortControllerRef = useRef<AbortController | null>(null);

  // Refs for callbacks
  const onNextTrackRef = useRef(options?.onNextTrack);
  const onPreviousTrackRef = useRef(options?.onPreviousTrack);
  // Tracks whether current asset is set to loop — guards listener & handleComplete
  const shouldLoopRef = useRef(false);
  // Guards against re-triggering the async loop restart while fade-in is in progress
  const loopRestartInProgressRef = useRef(false);
  // While true, listener updates to currentTime are ignored so a seek can settle
  // before the 250ms polling overwrites the optimistic position (iOS + Android fix)
  const isSeekingRef = useRef(false);
  // Stored listener fn — re-registered after re-preload (preload() clears the listener map)
  const listenerCallbackRef = useRef<((track: NativeAudioTrack) => void) | null>(null);
  // Skip-log counter for listener (component-level so it survives across re-registrations)
  const skipLogCountRef = useRef(0);

  // Reset timing state when track changes; pre-fill duration from track metadata.
  // Guard on track?.id so this no-ops when track is null — prevents a spurious
  // state reset (and engine log) on the first render before the API track arrives.
  useEffect(() => {
    if (!track?.id) return;
    console.log('[useAudioEngine] Hook called for track:', track?.id);
    setCurrentTime(0);
    setDuration(track?.duration || 0);
    setIsCompleted(false);
  }, [track?.id]);

  // Update refs when props change
  useEffect(() => {
    onNextTrackRef.current = options?.onNextTrack;
    onPreviousTrackRef.current = options?.onPreviousTrack;
  }, [options?.onNextTrack, options?.onPreviousTrack]);

  const favoriteCategory = useMemo((): FavoriteCategory | null => {
    if (!track) return null;
    const cat = track.category;
    return (cat === 'GUIDED' || cat === 'MANTRA' || cat === 'SLEEP' || cat === 'CHAKRA' || cat === 'PODCAST' || cat === 'SHIVA') ? cat : null;
  }, [track]);

  const isFavorite = useMemo(() => {
    if (!track || !favoriteCategory) return false;
    return favorites[favoriteCategory] === track.id;
  }, [track, favoriteCategory, favorites]);

  const handleComplete = useCallback(() => {
    // Looping categories: native plugin restarts automatically.
    // Award points but keep isPlaying=true so the MediaSession widget stays alive.
    if (LOOPING_CATEGORIES.includes(track?.category ?? '')) {
      if (track) {
        addCalmPoints(track.pointsReward || 20);
        if (track.duration > 180) incrementStreak();
      }
      return;
    }
    setIsCompleted(true);
    setIsPlaying(false);
    if (track) {
      addCalmPoints(track.pointsReward || 20);
      if (track.duration > 180) incrementStreak();
    }
  }, [track, addCalmPoints, incrementStreak]);

  // Volume control methods (ref-driven for immediate sync)
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));

    if (assetIdRef.current) {
      nativeAudioService.setVolume(assetIdRef.current, clampedVolume);
    }

    volumeRef.current = clampedVolume;
    isMutedRef.current = clampedVolume === 0;
    originalVolumeRef.current = clampedVolume;

    setVolumeState(clampedVolume);
    setIsMuted(clampedVolume === 0);

    console.log('[useAudioEngine] setVolume', { newVolume: clampedVolume, isSleepTimerActive });
  }, [isSleepTimerActive]);

  const toggleMute = useCallback(() => {
    if (isMutedRef.current) {
      // Unmute
      const restoreVolume = originalVolumeRef.current > 0 ? originalVolumeRef.current : 0.7;
      setVolume(restoreVolume);
    } else {
      // Mute
      originalVolumeRef.current = volumeRef.current;
      setVolume(0);
    }
  }, [setVolume]);

  const togglePlay = useCallback(async () => {
    if (!assetIdRef.current) return;

    // Only restart from 0 when track has finished AND is currently paused (intentional replay)
    if (isCompleted && !isPlaying) {
      setIsCompleted(false);
      setCurrentTime(0);
      await nativeAudioService.setCurrentTime(assetIdRef.current, 0);
    }

    if (isPlaying) {
      await nativeAudioService.pause(assetIdRef.current);
      setIsPlaying(false);
    } else {
      await nativeAudioService.play(assetIdRef.current);
      setIsPlaying(true);
      // Immediately sync native track state — don't wait for the first 250ms polling tick.
      // This ensures currentTime and duration update right away rather than after a visible delay.
      const liveTrack = nativeAudioService.getTrack(assetIdRef.current);
      if (liveTrack) {
        if (!isSeekingRef.current) setCurrentTime(liveTrack.currentTime);
        if (liveTrack.duration > 0) setDuration((prev: number) => prev === liveTrack.duration ? prev : liveTrack.duration);
      }
    }
  }, [isPlaying, isCompleted]);

  // Called when user starts touching/dragging the slider — stops applying getCurrentTime to slider
  const beginUserSeek = useCallback(() => {
    isSeekingRef.current = true;
    console.log('[useAudioEngine] beginUserSeek — ignoring position updates');
  }, []);

  // Track last seek target so we can reject stale native position after iOS seek
  const lastSeekTargetRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef<number>(0);
  // Incremented on every user seek — lets concurrent async sequences self-abort
  const seekVersionRef = useRef(0);

  // iOS seek: AVPlayer.seek(to:toleranceBefore:toleranceAfter:) handles remote HTTP MP3s
  // correctly regardless of position (issues an HTTP range request for the target byte offset).
  // Critically, AVPlayer.seek() does NOT change play/pause state — the player keeps playing
  // if it was playing, and stays paused if it was paused. So we never call play() here:
  // doing so triggers Swift play(time:0) which resets position to 0 and breaks the seek.
  const performIOSSeek = useCallback(async (
    assetId: string,
    targetTime: number,
    version: number,
    _wasPlaying: boolean, // unused — AVPlayer maintains play state across seeks automatically
  ): Promise<void> => {
    await nativeAudioService.setCurrentTime(assetId, targetTime);
    if (seekVersionRef.current !== version) return;

    // Settle window: lets the native side fulfill the range request and the listener
    // polling pick up the new position before isSeekingRef is cleared.
    await new Promise<void>((r) => setTimeout(r, 400));

    console.log('[useAudioEngine] iOS seek dispatched', { target: targetTime });
  }, []);

  // Always-current ref to seekBy so MediaSession lock-screen handlers (set up once)
  // can call the latest version without stale duration/currentTime closures.
  const seekByRef = useRef<(seconds: number) => Promise<void>>(() => Promise.resolve());
  // Always-current ref to togglePlay — used by MediaSession handlers so play/pause
  // goes through the engine (which syncs layers) instead of raw plugin calls.
  const togglePlayRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const seekBy = useCallback(async (seconds: number) => {
    const assetId = assetIdRef.current;
    if (!assetId || duration <= 0) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    console.log('[useAudioEngine] seekBy', { from: currentTime, delta: seconds, to: newTime });

    isSeekingRef.current = true;
    lastSeekTargetRef.current = newTime;
    lastSeekAtRef.current = Date.now();
    const seekVersion = ++seekVersionRef.current;
    setCurrentTime(newTime);

    try {
      if (Capacitor.getPlatform() === 'ios') {
        const wasPlaying = nativeAudioService.getTrack(assetId)?.isPlaying ?? false;
        await performIOSSeek(assetId, newTime, seekVersion, wasPlaying);
      } else {
        await nativeAudioService.setCurrentTime(assetId, newTime);
        await new Promise<void>((r) => setTimeout(r, 100));
      }
    } catch (e) {
      console.error('[AUDIO] seekBy failed:', e);
    } finally {
      if (seekVersionRef.current === seekVersion) {
        isSeekingRef.current = false;
      }
    }
  }, [duration, currentTime, performIOSSeek]);
  // Keep refs in sync every render — no extra effect needed, refs don't cause re-renders
  seekByRef.current = seekBy;
  togglePlayRef.current = togglePlay;
  isPlayingRef.current = isPlaying;

  const seekTo = useCallback(async (time: number) => {
    const assetId = assetIdRef.current;
    if (!assetId || duration <= 0) return;
    const clampedTime = Math.max(0, Math.min(duration, time));
    console.log('[useAudioEngine] seekTo', { time, clampedTime, currentTime, duration });

    isSeekingRef.current = true;
    lastSeekTargetRef.current = clampedTime;
    lastSeekAtRef.current = Date.now();
    const seekVersion = ++seekVersionRef.current;
    setCurrentTime(clampedTime);

    try {
      if (Capacitor.getPlatform() === 'ios') {
        const wasPlaying = nativeAudioService.getTrack(assetId)?.isPlaying ?? false;
        await performIOSSeek(assetId, clampedTime, seekVersion, wasPlaying);
      } else {
        await nativeAudioService.setCurrentTime(assetId, clampedTime);
        await new Promise<void>((r) => setTimeout(r, 100));
      }
    } catch (e) {
      console.error('[AUDIO] seekTo failed:', e);
    } finally {
      if (seekVersionRef.current === seekVersion) {
        isSeekingRef.current = false;
      }
    }
  }, [duration, performIOSSeek]);

  // Sleep Timer Logic
  const handleSetTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      const wasInFade = sleepTimerSeconds !== null && sleepTimerSeconds <= 30;
      timerStartRef.current = null;
      fadeStartedRef.current = false;
      setIsSleepTimerActive(false);
      setSleepTimerSeconds(null);

      if (wasInFade) {
        const restoreVol = originalVolumeRef.current;
        setVolume(restoreVol);
        console.log('[useAudioEngine] Timer canceled during fade, restoring', { original: restoreVol });
      } else {
        console.log('[useAudioEngine] Timer done, keeping current volume', { currentVol: volumeRef.current });
      }
    } else {
      originalVolumeRef.current = volumeRef.current;
      timerStartRef.current = Date.now();
      timerDurationSecondsRef.current = minutes * 60;
      fadeStartedRef.current = false;
      setSleepTimerSeconds(minutes * 60);
      setIsSleepTimerActive(true);
      console.log('[useAudioEngine] Timer started', { savedVolume: originalVolumeRef.current });
    }
  }, [sleepTimerSeconds, setVolume]);

  // Sleep Timer countdown — wall-clock based so background throttling doesn't break it.
  // Each interval tick recomputes `remaining` from Date.now() rather than decrementing by 1.
  // If the app was backgrounded for N seconds, the next tick detects the full elapsed time
  // and immediately applies the correct fade level or stops the track.
  useEffect(() => {
    let interval: number;
    if (isSleepTimerActive && timerStartRef.current !== null) {
      interval = window.setInterval(() => {
        const start = timerStartRef.current;
        if (start === null) return;

        const elapsed = (Date.now() - start) / 1000;
        const remaining = Math.max(0, timerDurationSecondsRef.current - elapsed);

        // Enter fade window — capture volume once on first entry (in case user changed it during countdown)
        if (remaining <= 30 && !fadeStartedRef.current) {
          fadeStartedRef.current = true;
          originalVolumeRef.current = volumeRef.current;
          console.log('[useAudioEngine] Starting fade', { savedVolume: originalVolumeRef.current });
        }

        // Apply fade in last 30s (skip if already at 0 to avoid NaN)
        if (remaining <= 30 && remaining > 0 && assetIdRef.current) {
          const fadeVolume = (remaining / 30) * originalVolumeRef.current;
          nativeAudioService.setVolume(assetIdRef.current, fadeVolume);
          volumeRef.current = fadeVolume;
          isMutedRef.current = fadeVolume === 0;
        }

        // Update displayed remaining seconds
        setSleepTimerSeconds(Math.ceil(remaining));

        // Timer expired — stop playback
        if (remaining <= 0) {
          timerStartRef.current = null;
          fadeStartedRef.current = false;
          setIsSleepTimerActive(false);
          setSleepTimerSeconds(null);
          if (assetIdRef.current) {
            nativeAudioService.setVolume(assetIdRef.current, 0);
            nativeAudioService.pause(assetIdRef.current);
          }
          setIsPlaying(false);
          console.log('[useAudioEngine] Timer expired, pausing');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSleepTimerActive]);

  // Loop watcher with soft fade — manages restart entirely in JS.
  useEffect(() => {
    if (!track || !assetIdRef.current || duration <= 0) return;
    if (track.category === 'CHAKRA') return; // CHAKRA uses native loop only — no JS seek-to-0 restarts
    if (!shouldLoopRef.current) return;
    if (loopRestartInProgressRef.current) return;
    if (!isPlaying) return; // Don't loop while paused — prevents restart on resume

    const LOOP_THRESHOLD = 0.5;  // seconds before end to trigger restart
    const FADE_TIME      = 1.5;  // seconds for fade out / fade in

    // Near the end: fade volume down softly (skip if sleep timer is already fading or muted)
    if (currentTime > duration - FADE_TIME && currentTime < duration - LOOP_THRESHOLD) {
      if (!isMutedRef.current && !isSleepTimerActive) {
        const factor = (duration - currentTime) / FADE_TIME; // 1 → ~0
        const targetVolume = Math.max(0.3, factor) * volumeRef.current;
        nativeAudioService.setVolume(assetIdRef.current, targetVolume);
      }
      return;
    }

    // At the end window: sequential seek → play → fade in
    if (currentTime >= duration - LOOP_THRESHOLD) {
      loopRestartInProgressRef.current = true;
      const assetId    = assetIdRef.current;
      const baseVolume = volumeRef.current;

      (async () => {
        try {
          // Sequential: seek first, then play — avoids race where play fires before seek
          await nativeAudioService.setCurrentTime(assetId, 0);
          await nativeAudioService.play(assetId);
          setCurrentTime(0);
          setIsPlaying(true);

          console.log('[useAudioEngine] Loop restart', { currentTime, duration });

          // Fade in from 0.3 → full over FADE_TIME (skip if muted or sleep timer active)
          if (!isMutedRef.current && !isSleepTimerActive) {
            const steps = 10;
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const v = 0.3 + 0.7 * t;
              await nativeAudioService.setVolume(assetId, v * baseVolume);
              await new Promise<void>((res) => setTimeout(res, (FADE_TIME * 1000) / steps));
            }
            await nativeAudioService.setVolume(assetId, baseVolume);
          }
        } catch (e) {
          console.error('[useAudioEngine] Loop restart failed:', e);
        } finally {
          loopRestartInProgressRef.current = false;
        }
      })();
    }
  }, [currentTime, duration, track, isSleepTimerActive, isPlaying]);

  // Load and setup NativeAudio track
  useEffect(() => {
    if (!track?.audioUrl) return;

    // Cancel any in-flight setup from a previous track
    abortControllerRef.current?.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    // Immediately unsubscribe previous listener so no stale updates arrive
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const assetId = `track_${track.id}_${sessionIdRef.current}`;
    assetIdRef.current = assetId;

    const setupTrack = async () => {
      try {
        if (ac.signal.aborted) return;
        console.log('[useAudioEngine] Loading track:', assetId, { category: track.category, audioUrl: track.audioUrl });

        // Compute shouldLoop BEFORE preload so the service's internal loop flag is
        // correct from the start — the service uses it in time-tracking to restart native audio.
        // CHAKRA is excluded: it uses one-shot native play so the plugin never seeks to 0
        // on its own; pause/resume preserves position without any JS or native restart.
        const shouldLoop = LOOPING_CATEGORIES.includes(track.category) && !onNextTrackRef.current && track.category !== 'CHAKRA';
        shouldLoopRef.current = shouldLoop;

        await nativeAudioService.preload(assetId, track.audioUrl, {
          volume: volumeRef.current,
          loop: shouldLoop,
        });

        if (ac.signal.aborted) return;

        // Enable native loop — primary mechanism when screen is off.
        // JS intervals still run in the background (confirmed by MediaSession position updates)
        // but React effects are throttled; nativeAudioService's polling interval handles the
        // restart in that case. The JS watcher below adds the foreground fade effect on top.
        if (shouldLoop) {
          await nativeAudioService.loop(assetId);
        }

        if (ac.signal.aborted) return;

        // Get initial duration. Remote URLs on iOS often return 0 until buffered — retry before enabling seeks
        let trackDuration = await nativeAudioService.getDuration(assetId);
        const isRemote = (track.audioUrl || '').startsWith('http');
        if (trackDuration <= 0 && isRemote) {
          console.log('[useAudioEngine] duration 0 for remote URL, retrying...');
          for (let i = 0; i < 8 && !ac.signal.aborted; i++) {
            await new Promise((r) => setTimeout(r, 400));
            trackDuration = await nativeAudioService.getDuration(assetId);
            if (trackDuration > 0) {
              console.log('[useAudioEngine] duration ready after retry', { attempts: i + 1, duration: trackDuration });
              break;
            }
          }
        }
        const initialDuration = trackDuration || track.duration || 0;
        if (initialDuration > 0) setDuration(initialDuration);

        if (ac.signal.aborted) return;

        // Listen to track updates; also propagate duration once audio is buffered.
        // For looping tracks, suppress brief isPlaying=false pulses during loop restart
        // so the MediaSession widget never goes to "paused" between loops.
        // Extracted to a named fn so it can be re-registered after a re-preload seek
        // (preload() clears the listener map; listenerCallbackRef lets us restore it).
        skipLogCountRef.current = 0; // reset log-throttle counter for this track session
        const listenerFn = (nativeTrack: NativeAudioTrack) => {
          if (isSeekingRef.current) {
            if (++skipLogCountRef.current <= 2) {
              console.log('[useAudioEngine] listener SKIP position (isSeeking)', { nativeCurrentTime: nativeTrack.currentTime });
            }
            return;
          }
          skipLogCountRef.current = 0;
          // Reject stale native position after iOS seek — native may report old pos for a while
          const target = lastSeekTargetRef.current;
          const seekAge = Date.now() - lastSeekAtRef.current;
          if (target !== null && seekAge < 2500) {
            const drift = Math.abs(nativeTrack.currentTime - target);
            if (drift > 5) {
              if (++skipLogCountRef.current <= 2) {
                console.log('[useAudioEngine] listener SKIP stale (post-seek)', { native: nativeTrack.currentTime, target, drift });
              }
              return;
            }
            lastSeekTargetRef.current = null;
            skipLogCountRef.current = 0;
          } else if (target !== null && seekAge >= 2500) {
            lastSeekTargetRef.current = null;
          }
          setCurrentTime(nativeTrack.currentTime);
          // Always propagate isPlaying — the old guard suppressed false for looping tracks
          // but it also blocked lock-screen pause from reaching the UI. The nativeAudioService
          // never emits isPlaying=false during a loop restart (track.isPlaying stays true
          // throughout), so removing the guard causes no looping flicker.
          setIsPlaying(nativeTrack.isPlaying);
          if (nativeTrack.duration > 0) setDuration((prev: number) => prev === nativeTrack.duration ? prev : nativeTrack.duration);
        };
        listenerCallbackRef.current = listenerFn;
        const unsubscribe = nativeAudioService.addListener(assetId, listenerFn);
        unsubscribeRef.current = unsubscribe;

        if (ac.signal.aborted) {
          unsubscribe();
          unsubscribeRef.current = null;
          return;
        }

        const shouldAutoPlay = ['GUIDED', 'SLEEP', 'MANTRA', 'SHIVA', 'CHAKRA'].includes(track.category);
        if (shouldAutoPlay) {
          await nativeAudioService.play(assetId);
          if (!ac.signal.aborted) {
            setIsPlaying(true);
            // Immediately sync native track state — don't wait for the first 250ms polling tick.
            // On auto-play, this makes currentTime/duration visible right away in the UI.
            const liveTrack = nativeAudioService.getTrack(assetId);
            if (liveTrack) {
              if (!isSeekingRef.current) setCurrentTime(liveTrack.currentTime);
              if (liveTrack.duration > 0) setDuration((prev: number) => prev === liveTrack.duration ? prev : liveTrack.duration);
            }
            console.log('[useAudioEngine] Play called successfully:', assetId);
          }
        }
      } catch (error) {
        if (!ac.signal.aborted) {
          console.error('[useAudioEngine] Error loading track:', error);
        }
      }
    };

    setupTrack();

    return () => {
      ac.abort();
      shouldLoopRef.current = false;
      loopRestartInProgressRef.current = false;
      isSeekingRef.current = false;
      lastSeekTargetRef.current = null;

      // Synchronous listener cleanup — no more stale updates
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Async native cleanup
      if (track.category !== 'SLEEP') {
        nativeAudioService.stop(assetId).catch(console.warn);
      }
      nativeAudioService.unload(assetId).catch(console.warn);
    };
  }, [track?.audioUrl, track?.category, track?.id, track?.duration]);

  // Media Session Setup
  useEffect(() => {
    if (!track) return;

    const resolveArtworkUrl = (image?: string) => {
      if (!image) return null;
      if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
        return image;
      }
      if (track.category === 'SLEEP') {
        const base = 'https://storage.googleapis.com/sleepmusic';
        const normalized = image.replace(/^\/+/, '');
        const encoded = normalized.split('/').map((segment) => encodeURIComponent(segment)).join('/');
        return `${base}/${encoded}`;
      }
      return null;
    };

    const fallbackArtworkUrl = 'https://storage.googleapis.com/sleepmusic/images/Body%20Healing.png';
    const resolvedArtworkUrl = resolveArtworkUrl(track.image) || fallbackArtworkUrl;
    const artwork = [{ src: resolvedArtworkUrl, sizes: '512x512', type: 'image/jpeg' }];

    const metadata = {
      title: track.title || 'Sleep Music',
      artist: track.teacher || 'School of Breath',
      album: track.category || 'Sleep',
      artwork
    };

    if (isNativePlatform) {
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.metadata = new MediaMetadata(metadata); } catch {}
      }
      NativeMediaSession.setMetadata(metadata).catch(() => {
        NativeMediaSession.setMetadata({ ...metadata, artwork: [] });
      });
      mediaMetadataReadyRef.current = true;
    }
  }, [track, isNativePlatform]);

  // Media Session Playback State (native only)
  useEffect(() => {
    if (isNativePlatform) {
      void NativeMediaSession.setPlaybackState({ playbackState: isPlaying ? 'playing' : 'paused' });
    }
  }, [isPlaying, isNativePlatform]);

  // Media Session Position State (lock screen progress bar)
  useEffect(() => {
    if (!track || !isNativePlatform || duration <= 0) return;
    void NativeMediaSession.setPositionState({
      position: currentTime,
      duration,
      playbackRate: 1.0,
    });
  }, [currentTime, duration, isPlaying, track, isNativePlatform]);

  // Media Session Action Handlers
  // Registered once on mount. All callbacks use refs so they always read the latest state
  // without needing to re-register (which would reset the lock-screen widget).
  useEffect(() => {
    if (!isNativePlatform) return;

    const setupHandlers = async () => {
      // Play — delegate to engine's togglePlay (via always-current ref) so all layers stay in sync.
      // Guard: only call if not already playing to prevent double-toggle if lock screen fires twice.
      await NativeMediaSession.setActionHandler({ action: 'play' }, (async () => {
        if (assetIdRef.current && !isPlayingRef.current) {
          await togglePlayRef.current();
        }
      }) as any);

      // Pause — same pattern: delegate to engine so layers get paused atomically.
      await NativeMediaSession.setActionHandler({ action: 'pause' }, (async () => {
        if (assetIdRef.current && isPlayingRef.current) {
          await togglePlayRef.current();
        }
      }) as any);

      // Stop
      await NativeMediaSession.setActionHandler({ action: 'stop' }, (async () => {
        if (assetIdRef.current) {
          await nativeAudioService.stop(assetIdRef.current);
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }) as any);

      // Seek forward/backward ±15s — delegate to the always-current seekByRef
      // so duration/currentTime are never stale inside the handler closure.
      await NativeMediaSession.setActionHandler({ action: 'seekforward' }, (async () => {
        await seekByRef.current(15);
      }) as any);
      await NativeMediaSession.setActionHandler({ action: 'seekbackward' }, (async () => {
        await seekByRef.current(-15);
      }) as any);

      // Next / previous — wire to callbacks if the parent provided them; null hides the button.
      await NativeMediaSession.setActionHandler(
        { action: 'nexttrack' },
        onNextTrackRef.current
          ? ((() => { onNextTrackRef.current?.(); }) as any)
          : null
      );
      await NativeMediaSession.setActionHandler(
        { action: 'previoustrack' },
        onPreviousTrackRef.current
          ? ((() => { onPreviousTrackRef.current?.(); }) as any)
          : null
      );

      // seekto: not supported (we use seekforward/backward instead)
      await NativeMediaSession.setActionHandler({ action: 'seekto' }, null);
    };

    setupHandlers();

    return () => {
      const cleanup = async () => {
        await NativeMediaSession.setActionHandler({ action: 'play' }, null);
        await NativeMediaSession.setActionHandler({ action: 'pause' }, null);
        await NativeMediaSession.setActionHandler({ action: 'stop' }, null);
        await NativeMediaSession.setActionHandler({ action: 'seekforward' }, null);
        await NativeMediaSession.setActionHandler({ action: 'seekbackward' }, null);
        await NativeMediaSession.setActionHandler({ action: 'nexttrack' }, null);
        await NativeMediaSession.setActionHandler({ action: 'previoustrack' }, null);
        await NativeMediaSession.setPlaybackState({ playbackState: 'none' });
      };
      void cleanup();
    };
  }, [isNativePlatform]);

  const progress = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [currentTime, duration]);

  return {
    trackId: track?.id ?? null,
    isPlaying,
    currentTime,
    duration,
    progress,
    isCompleted,
    audioRef, // Kept for compatibility
    togglePlay,
    beginUserSeek,
    seekBy,
    seekTo,
    isFavorite,
    toggleFavorite: () => track && favoriteCategory && appToggleFavorite(track.id, favoriteCategory),
    volume,
    setVolume,
    isMuted,
    toggleMute,
    sleepTimer: {
      secondsRemaining: sleepTimerSeconds,
      isActive: isSleepTimerActive,
      setTimer: handleSetTimer
    }
  };
};
