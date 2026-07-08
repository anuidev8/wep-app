
// Fix: Import React to provide namespace for RefObject
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { MediaSession as NativeMediaSession } from '@capgo/capacitor-media-session';
import { AudioTrack, FavoriteCategory } from '../types';
import { useApp } from '../context/AppContext';

export interface AudioEngine {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  isCompleted: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
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

  // Track the play promise to prevent interruptions
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Sleep Timer State
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [isSleepTimerActive, setIsSleepTimerActive] = useState(false);
  const originalVolumeRef = useRef(1);

  // New refs for immediate volume sync (eliminates sync loop)
  const volumeRef = useRef(1);
  const isMutedRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaMetadataReadyRef = useRef(false);
  const isNativePlatform = Capacitor.isNativePlatform();
  const previousTimeRef = useRef(0);
  const lastPositionUpdateRef = useRef(0);

  // Refs for callbacks to ensure we don't re-register listeners unnecessarily
  const onNextTrackRef = useRef(options?.onNextTrack);
  const onPreviousTrackRef = useRef(options?.onPreviousTrack);
  const allowSeekSkipRef = useRef(track?.category !== 'SLEEP');

  useEffect(() => {
    console.warn('[useAudioEngine] Hook called for track:', track?.id);
  }, [track?.id]);

  // Update refs when props change
  useEffect(() => {
    onNextTrackRef.current = options?.onNextTrack;
    onPreviousTrackRef.current = options?.onPreviousTrack;
    allowSeekSkipRef.current = track?.category !== 'SLEEP';
  }, [options?.onNextTrack, options?.onPreviousTrack, track?.category]);

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

  const safePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (playPromiseRef.current !== null) {
      playPromiseRef.current
        .then(() => {
          audio.pause();
        })
        .catch(() => {
          // Play was already rejected or interrupted, safe to pause
          audio.pause();
        });
    } else {
      audio.pause();
    }
  }, []);

  const safePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    playPromiseRef.current = audio.play();
    
    playPromiseRef.current
      .then(() => {
        playPromiseRef.current = null;
      })
      .catch((error) => {
        playPromiseRef.current = null;
        console.error("Playback failed:", error);
        setIsPlaying(false);
      });
  }, []);


  const seekBy = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const target = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = target;
  }, []);

  // Volume control methods (ref-driven for immediate sync)
  const setVolume = useCallback((newVolume: number) => {
    const audio = audioRef.current;

    if (!audio) {
      console.warn('[useAudioEngine] setVolume: no audio');
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, newVolume));

    // Immediate audio sync
    audio.volume = clampedVolume;
    volumeRef.current = clampedVolume;
    isMutedRef.current = clampedVolume === 0;

    // Always update original ref when user manually sets volume
    // This ensures user's explicit volume choices are always respected
    originalVolumeRef.current = clampedVolume;

    // Batch state after DOM update (for UI rendering)
    setVolumeState(clampedVolume);
    setIsMuted(clampedVolume === 0);

    console.log('[useAudioEngine] setVolume', { newVolume: clampedVolume, isSleepTimerActive });
  }, [isSleepTimerActive]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      console.warn('[useAudioEngine] toggleMute: no audio');
      return;
    }

    if (isMutedRef.current) {
      // Unmute: restore to previous volume or default to 0.7
      const restoreVolume = originalVolumeRef.current > 0 ? originalVolumeRef.current : 0.7;
      audio.volume = restoreVolume;
      volumeRef.current = restoreVolume;
      isMutedRef.current = false;
      originalVolumeRef.current = restoreVolume;
    } else {
      // Mute: save current volume and set to 0
      originalVolumeRef.current = audio.volume;
      audio.volume = 0;
      volumeRef.current = 0;
      isMutedRef.current = true;
    }

    // Update state for UI
    setVolumeState(volumeRef.current);
    setIsMuted(isMutedRef.current);
  }, []);

  // Volume change handler (moved to main audio useEffect to avoid sync loop)

  const updatePositionState = useCallback((position: number, durationValue: number) => {
    if (!Number.isFinite(durationValue) || durationValue <= 0) return;
    const playbackRate = audioRef.current?.playbackRate || 1;

    if (isNativePlatform) {
      if (!mediaMetadataReadyRef.current) return;
      try {
        void NativeMediaSession.setPositionState({
          duration: durationValue,
          position,
          playbackRate
        });
      } catch (error) {
        console.warn('Error updating native position state:', error);
      }
      return;
    }

    if ('mediaSession' in navigator && typeof navigator.mediaSession.setPositionState === 'function') {
      try {
        navigator.mediaSession.setPositionState({
          duration: durationValue,
          position,
          playbackRate
        });
      } catch {
        // Some platforms reject updates when metadata is missing
      }
    }
  }, [isNativePlatform]);

  const handleStopAction = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.warn('[useAudioEngine] MediaSession stop: resetting playback state');
    safePause();
    audio.currentTime = 0;
    setIsCompleted(false);
    setCurrentTime(0);

    const durationValue = audio.duration || track?.duration || 0;
    updatePositionState(0, durationValue);

    if (isNativePlatform) {
      void NativeMediaSession.setPlaybackState({ playbackState: 'paused' });
    } else if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }, [duration, isNativePlatform, safePause, track?.duration, updatePositionState]);

  // --- Media Session API ---

  // 1. Setup Listeners (iOS) - Run Once
  useEffect(() => {
    if (!isNativePlatform || Capacitor.getPlatform() !== 'ios') return;

    let iosListenerHandle: { remove: () => Promise<void> } | null = null;

    const setupListener = async () => {
      const handle = await (NativeMediaSession as any).addListener('actionHandler', (data: { action: string; seekTime?: number }) => {
        console.warn('[useAudioEngine] MediaSession action:', data?.action);
        switch (data.action) {
          case 'play': safePlay(); break;
          case 'pause': safePause(); break;
          case 'stop':
            handleStopAction();
            break;
          // Disable other controls
          case 'seekto':
          case 'seekforward':
          case 'seekbackward':
          case 'nexttrack':
          case 'previoustrack':
            break;
        }
      });
      iosListenerHandle = handle;
    };

    setupListener();

    return () => {
      if (iosListenerHandle) {
        iosListenerHandle.remove();
      }
    };
  }, [handleStopAction, isNativePlatform, safePlay, safePause, seekBy]);

  // 2. Setup Action Handlers (Availability) - Run when availability changes
  useEffect(() => {
    if (!isNativePlatform) return;

    const setupHandlers = async () => {
      // Basic controls
      await NativeMediaSession.setActionHandler({ action: 'play' }, (() => safePlay()) as any);
      await NativeMediaSession.setActionHandler({ action: 'pause' }, (() => safePause()) as any);
      await NativeMediaSession.setActionHandler({ action: 'stop' }, (() => handleStopAction()) as any);
      
      // Disable seeking and track skipping in media session
      await NativeMediaSession.setActionHandler({ action: 'seekto' }, null);
      await NativeMediaSession.setActionHandler({ action: 'seekforward' }, null);
      await NativeMediaSession.setActionHandler({ action: 'seekbackward' }, null);
      await NativeMediaSession.setActionHandler({ action: 'nexttrack' }, null);
      await NativeMediaSession.setActionHandler({ action: 'previoustrack' }, null);
    };

    setupHandlers();
  }, [
    isNativePlatform, 
    // Trigger when availability changes
    !!options?.onNextTrack, 
    !!options?.onPreviousTrack, 
    track?.category !== 'SLEEP',
    track?.duration,
    handleStopAction,
    safePlay,
    safePause,
    updatePositionState
  ]);

  // 3. Update Metadata - Run when track changes
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
        const encoded = normalized
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/');
        return `${base}/${encoded}`;
      }
      return null;
    };

    const getArtworkType = (url: string) => {
      const match = url.toLowerCase().match(/\.(png|jpe?g|webp)(\?|#|$)/);
      if (!match) return 'image/jpeg';
      const ext = match[1];
      if (ext === 'png') return 'image/png';
      if (ext === 'webp') return 'image/webp';
      return 'image/jpeg';
    };

    const fallbackArtworkUrl = 'https://storage.googleapis.com/sleepmusic/images/Body%20Healing.png';
    const resolvedArtworkUrl = resolveArtworkUrl(track.image) || fallbackArtworkUrl;
    const artworkType = getArtworkType(resolvedArtworkUrl);
    const artwork = artworkType
      ? [{ src: resolvedArtworkUrl, sizes: '512x512', type: artworkType }]
      : [];

    const metadata = {
      title: track.title || 'Sleep Music',
      artist: track.teacher || 'School of Breath',
      album: track.category || 'Sleep',
      artwork
    };

    if (isNativePlatform) {
       // CRITICAL: On iOS, WKWebView has its own internal media session. 
       // We MUST set navigator.mediaSession.metadata too.
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.metadata = new MediaMetadata(metadata); } catch {}
      }

      const applyNativeMetadata = async () => {
        try {
          await NativeMediaSession.setMetadata(metadata);
          mediaMetadataReadyRef.current = true;
        } catch {
          await NativeMediaSession.setMetadata({
             ...metadata,
             artwork: []
          });
          mediaMetadataReadyRef.current = true;
        }
      };
      applyNativeMetadata();
    } else {
      // Web Only
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

  // 4. Update Playback State - Run when isPlaying changes
  useEffect(() => {
    if (isNativePlatform) {
      void NativeMediaSession.setPlaybackState({ playbackState: isPlaying ? 'playing' : 'paused' });
    } else {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    }
  }, [isPlaying, isNativePlatform]);

  // 5. Cleanup - Run on Unmount
  useEffect(() => {
    const cleanupNative = async () => {
      if (!isNativePlatform) return;
      await NativeMediaSession.setActionHandler({ action: 'play' }, null);
      await NativeMediaSession.setActionHandler({ action: 'pause' }, null);
      await NativeMediaSession.setActionHandler({ action: 'stop' }, null);
      await NativeMediaSession.setActionHandler({ action: 'seekto' }, null);
      await NativeMediaSession.setActionHandler({ action: 'seekforward' }, null);
      await NativeMediaSession.setActionHandler({ action: 'seekbackward' }, null);
      await NativeMediaSession.setActionHandler({ action: 'nexttrack' }, null);
      await NativeMediaSession.setActionHandler({ action: 'previoustrack' }, null);
      await NativeMediaSession.setPlaybackState({ playbackState: 'none' });
    };

    const cleanupWeb = () => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      // ... clear others if needed
    };

    return () => {
      if (isNativePlatform) {
        void cleanupNative();
      } else {
        cleanupWeb();
      }
    };
  }, [isNativePlatform]);

  // Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) return;

    audio.src = track.audioUrl;
    
    // Enable looping for sleep music, mantras, and chakras
    // This ensures endless looping works on all devices (Android, iOS, desktop) when no next track is available
    // We use native loop=true for seamless (gapless) playback.
    const shouldLoop = (['SLEEP', 'MANTRA', 'SHIVA', 'CHAKRA'].includes(track.category)) && !onNextTrackRef.current;
    const useManualLoop = shouldLoop && isNativePlatform;
    
    if (shouldLoop && !useManualLoop) {
      audio.loop = true;
      audio.setAttribute('loop', 'true');
    } else {
      audio.loop = false;
      audio.removeAttribute('loop');
    }
    
    // Enable background playback
    audio.setAttribute('playsinline', 'true');
    
    audio.load();
    
    const onPlay = () => {
      setIsPlaying(true);
      // Sync position on play to ensure native widget is correct
      if (audio.duration) {
          updatePositionState(audio.currentTime, audio.duration);
      }
      
      // Ensure metadata is re-applied on play (WKWebView fix)
      if (isNativePlatform && track) {
           if ('mediaSession' in navigator) {
             // Just ensuring playback state is correct.
           }
      }
    };
    
    const onPause = () => {
        setIsPlaying(false);
        // Sync position on pause
        if (audio.duration) {
            updatePositionState(audio.currentTime, audio.duration);
        }
    };

    const onSeeked = () => {
        // Sync position after a seek operation completes
        if (audio.duration) {
            updatePositionState(audio.currentTime, audio.duration);
        }
    };
    
    const onTimeUpdate = () => {
      const current = audio.currentTime;
      const docDuration = audio.duration || track.duration || 0;
      setCurrentTime(current);

      if (useManualLoop && audio.duration && audio.duration - current <= 0.35) {
        audio.currentTime = 0;
        safePlay();
        updatePositionState(0, docDuration);
        previousTimeRef.current = 0;
        lastPositionUpdateRef.current = 0;
        return;
      }

      const shouldUpdatePosition =
        Math.abs(current - lastPositionUpdateRef.current) >= 2;

      // Detect Loop: If time jumped backward significantly (loop wrapped)
      // Standard playback increments time. If current < previous, a loop or seek happened.
      // Since we handle manual seeks via onSeeked, this catches the automatic loop.
      if (current < previousTimeRef.current && (previousTimeRef.current - current) > 1) {
          updatePositionState(current, docDuration);
          lastPositionUpdateRef.current = current;
      } else if (shouldUpdatePosition) {
          updatePositionState(current, docDuration);
          lastPositionUpdateRef.current = current;
      }
      
      previousTimeRef.current = current;
    };
    
    const onLoadedMetadata = () => {
        const d = audio.duration || track.duration;
        setDuration(d);
        updatePositionState(audio.currentTime, d);
    };
    
    const onEnded = () => {
      if (useManualLoop) return;
      // Note: If audio.loop is true, this event will NOT fire.
      // So we only handle non-looping cases or explicit playlist navigation here.
      if (track.category === 'SLEEP' && onNextTrackRef.current) {
         // Use playlist navigation if available
          onNextTrackRef.current();
      } else {
        handleComplete();
      }
    };

    const onVolumeChange = () => {
      if (!audio) return;
      volumeRef.current = audio.volume;
      isMutedRef.current = audio.muted || audio.volume === 0;
      setVolumeState(audio.volume);
      setIsMuted(isMutedRef.current);
      console.log('[useAudioEngine] volumechange', { volume: audio.volume, muted: isMutedRef.current });
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('volumechange', onVolumeChange);

    // Auto-play for most modes
    if (['GUIDED', 'SLEEP', 'MANTRA', 'SHIVA'].includes(track.category)) {
      safePlay();
    }

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('volumechange', onVolumeChange);
      // For sleep music, don't pause on unmount to allow background playback
      if (track.category !== 'SLEEP') {
         audio.pause();
      }
    };
  }, [duration, handleComplete, isNativePlatform, safePlay, safePause, track?.audioUrl, track?.category, updatePositionState]);

  // Sleep Timer Logic (ref-driven fade to prevent state thrashing)
  useEffect(() => {
    let interval: number;
    if (isSleepTimerActive && sleepTimerSeconds !== null && sleepTimerSeconds > 0) {
      interval = window.setInterval(() => {
        setSleepTimerSeconds((s) => {
          if (s === null || s <= 0) {
            setIsSleepTimerActive(false);
            safePause();
            return null;
          }
          const next = s - 1;

          // Start fade at 30s remaining
          if (next === 30) {
            // Save current volume at fade start (user might have adjusted)
            originalVolumeRef.current = audioRef.current?.volume || volumeRef.current;
            console.log('[useAudioEngine] Starting fade', { savedVolume: originalVolumeRef.current });
          }

          // Volume Fade out in last 30s (automatic fade, don't update originalVolumeRef)
          if (next <= 30 && next > 0) {
            const fadeVolume = (next / 30) * originalVolumeRef.current;
            if (audioRef.current) {
              audioRef.current.volume = fadeVolume;
              volumeRef.current = fadeVolume;
              isMutedRef.current = fadeVolume === 0;
              // Let volumechange event handle UI sync
            }
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSleepTimerActive, safePause]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isCompleted) {
      setIsCompleted(false);
      audio.currentTime = 0;
    }
    
    if (audio.paused) {
      safePlay();
    } else {
      safePause();
    }
  }, [isCompleted, safePlay, safePause]);

  const handleSetTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      // Cancel timer: DON'T restore volume - keep user's current setting
      const wasInFade = sleepTimerSeconds !== null && sleepTimerSeconds <= 30;
      setIsSleepTimerActive(false);
      setSleepTimerSeconds(null);

      if (audioRef.current && wasInFade) {
        // Only restore if we were in the middle of a fade (last 30s)
        const restoreVol = originalVolumeRef.current;
        audioRef.current.volume = restoreVol;
        volumeRef.current = restoreVol;
        isMutedRef.current = restoreVol === 0;
        setVolumeState(restoreVol);
        setIsMuted(isMutedRef.current);
        console.log('[useAudioEngine] Timer canceled during fade, restoring', { original: originalVolumeRef.current });
      } else {
        // Timer canceled before fade OR completed - keep current volume
        console.log('[useAudioEngine] Timer done, keeping current volume', { currentVol: volumeRef.current });
      }
    } else {
      // Start timer: save current volume for potential fade restore
      originalVolumeRef.current = audioRef.current?.volume || volumeRef.current || 1;
      setSleepTimerSeconds(minutes * 60);
      setIsSleepTimerActive(true);
      console.log('[useAudioEngine] Timer started', { savedVolume: originalVolumeRef.current });
    }
  }, [sleepTimerSeconds]);

  const progress = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [currentTime, duration]);

  return {
    isPlaying,
    currentTime,
    duration,
    progress,
    isCompleted,
    audioRef,
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
