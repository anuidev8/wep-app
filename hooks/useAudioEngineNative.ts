/**
 * useAudioEngine with NativeAudio support
 * Works on both iOS and Android with proper volume control
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { MediaSession as NativeMediaSession } from '@capgo/capacitor-media-session';
import { AudioTrack, FavoriteCategory } from '../types';
import { useApp } from '../context/AppContext';
import { nativeAudioService } from '../services/nativeAudioService';

export interface AudioEngine {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  isCompleted: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>; // Kept for compatibility
  togglePlay: () => void;
  seekBy: (seconds: number) => void;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Sleep Timer State
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [isSleepTimerActive, setIsSleepTimerActive] = useState(false);
  const originalVolumeRef = useRef(1);

  // Volume refs for immediate sync
  const volumeRef = useRef(1);
  const isMutedRef = useRef(false);

  // Kept for compatibility (not used with NativeAudio)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaMetadataReadyRef = useRef(false);
  const isNativePlatform = Capacitor.isNativePlatform();

  // Asset ID for NativeAudio
  const assetIdRef = useRef<string>('');

  // Refs for callbacks
  const onNextTrackRef = useRef(options?.onNextTrack);
  const onPreviousTrackRef = useRef(options?.onPreviousTrack);

  useEffect(() => {
    console.log('[useAudioEngine] Hook called for track:', track?.id);
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

    // Update native audio volume
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

    if (isCompleted) {
      setIsCompleted(false);
      setCurrentTime(0);
    }

    if (isPlaying) {
      await nativeAudioService.pause(assetIdRef.current);
      setIsPlaying(false);
    } else {
      await nativeAudioService.play(assetIdRef.current);
      setIsPlaying(true);
    }
  }, [isPlaying, isCompleted]);

  const seekBy = useCallback(async (seconds: number) => {
    // Note: NativeAudio doesn't support seeking directly
    // We'll update our estimate
    setCurrentTime(prev => Math.max(0, Math.min(duration, prev + seconds)));
  }, [duration]);

  // Sleep Timer Logic
  const handleSetTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      const wasInFade = sleepTimerSeconds !== null && sleepTimerSeconds <= 30;
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
      setSleepTimerSeconds(minutes * 60);
      setIsSleepTimerActive(true);
      console.log('[useAudioEngine] Timer started', { savedVolume: originalVolumeRef.current });
    }
  }, [sleepTimerSeconds, setVolume]);

  // Sleep Timer countdown
  useEffect(() => {
    let interval: number;
    if (isSleepTimerActive && sleepTimerSeconds !== null && sleepTimerSeconds > 0) {
      interval = window.setInterval(() => {
        setSleepTimerSeconds((s) => {
          if (s === null || s <= 0) {
            setIsSleepTimerActive(false);
            if (assetIdRef.current) {
              nativeAudioService.pause(assetIdRef.current);
            }
            setIsPlaying(false);
            return null;
          }
          const next = s - 1;

          // Start fade at 30s
          if (next === 30) {
            originalVolumeRef.current = volumeRef.current;
            console.log('[useAudioEngine] Starting fade', { savedVolume: originalVolumeRef.current });
          }

          // Fade volume in last 30s
          if (next <= 30 && next > 0) {
            const fadeVolume = (next / 30) * originalVolumeRef.current;
            if (assetIdRef.current) {
              nativeAudioService.setVolume(assetIdRef.current, fadeVolume);
            }
            volumeRef.current = fadeVolume;
            isMutedRef.current = fadeVolume === 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSleepTimerActive]);

  // Load and setup NativeAudio track
  useEffect(() => {
    if (!track?.audioUrl) return;

    const assetId = `track_${track.id}`;
    assetIdRef.current = assetId;

    const setupTrack = async () => {
      try {
        console.log('[useAudioEngine] Loading track:', assetId);

        // Preload audio
        await nativeAudioService.preload(assetId, track.audioUrl, {
          volume: volumeRef.current,
          loop: false,
        });

        // Enable looping for sleep/mantra/chakra if no next track
        const shouldLoop = (['SLEEP', 'MANTRA', 'SHIVA', 'CHAKRA'].includes(track.category)) && !onNextTrackRef.current;
        if (shouldLoop) {
          await nativeAudioService.loop(assetId);
        }

        // Get duration
        const trackDuration = await nativeAudioService.getDuration(assetId);
        setDuration(trackDuration || track.duration || 0);

        // Listen to track updates
        const unsubscribe = nativeAudioService.addListener(assetId, (nativeTrack) => {
          setCurrentTime(nativeTrack.currentTime);
          setIsPlaying(nativeTrack.isPlaying);
        });

        // Auto-play for certain categories
        if (['GUIDED', 'SLEEP', 'MANTRA', 'SHIVA'].includes(track.category)) {
          await nativeAudioService.play(assetId);
          setIsPlaying(true);
        }

        return unsubscribe;
      } catch (error) {
        console.error('[useAudioEngine] Error loading track:', error);
      }
    };

    const cleanupPromise = setupTrack();

    return () => {
      cleanupPromise.then(async (unsubscribe) => {
        if (unsubscribe) unsubscribe();

        // For sleep music, don't stop on unmount (background playback)
        if (track.category !== 'SLEEP') {
          await nativeAudioService.stop(assetId);
        }

        await nativeAudioService.unload(assetId);
      });
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
    } else {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata(metadata);
        } catch {
          navigator.mediaSession.metadata = new MediaMetadata({ ...metadata, artwork: [] });
        }
        mediaMetadataReadyRef.current = true;
      }
    }
  }, [track, isNativePlatform]);

  // Media Session Playback State
  useEffect(() => {
    if (isNativePlatform) {
      void NativeMediaSession.setPlaybackState({ playbackState: isPlaying ? 'playing' : 'paused' });
    } else {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    }
  }, [isPlaying, isNativePlatform]);

  // Media Session Action Handlers
  useEffect(() => {
    if (!isNativePlatform) return;

    const setupHandlers = async () => {
      await NativeMediaSession.setActionHandler({ action: 'play' }, (async () => {
        if (assetIdRef.current) {
          await nativeAudioService.play(assetIdRef.current);
          setIsPlaying(true);
        }
      }) as any);

      await NativeMediaSession.setActionHandler({ action: 'pause' }, (async () => {
        if (assetIdRef.current) {
          await nativeAudioService.pause(assetIdRef.current);
          setIsPlaying(false);
        }
      }) as any);

      await NativeMediaSession.setActionHandler({ action: 'stop' }, (async () => {
        if (assetIdRef.current) {
          await nativeAudioService.stop(assetIdRef.current);
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }) as any);

      // Disable seek/skip
      await NativeMediaSession.setActionHandler({ action: 'seekto' }, null);
      await NativeMediaSession.setActionHandler({ action: 'seekforward' }, null);
      await NativeMediaSession.setActionHandler({ action: 'seekbackward' }, null);
      await NativeMediaSession.setActionHandler({ action: 'nexttrack' }, null);
      await NativeMediaSession.setActionHandler({ action: 'previoustrack' }, null);
    };

    setupHandlers();

    return () => {
      const cleanup = async () => {
        await NativeMediaSession.setActionHandler({ action: 'play' }, null);
        await NativeMediaSession.setActionHandler({ action: 'pause' }, null);
        await NativeMediaSession.setActionHandler({ action: 'stop' }, null);
        await NativeMediaSession.setPlaybackState({ playbackState: 'none' });
      };
      void cleanup();
    };
  }, [isNativePlatform]);

  const progress = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [currentTime, duration]);

  return {
    isPlaying,
    currentTime,
    duration,
    progress,
    isCompleted,
    audioRef, // Kept for compatibility
    togglePlay,
    seekBy,
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
