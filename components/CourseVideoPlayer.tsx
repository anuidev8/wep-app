import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ArrowLeft, FastForward, Pause, Play, Rewind, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateLessonDuration, updateLessonProgress, markLessonComplete } from '../services/courseService';
import { useVideoLoadingCue } from '../hooks/useVideoLoadingCue';
import { VideoLoadingOverlay } from './VideoLoadingOverlay';
import { useNativeModal } from '../hooks/useNativeModal';

interface CourseVideoPlayerProps {
  videoUrl: string;
  isYoutube: boolean;
  title?: string;
  courseId: string;
  sectionId: string;
  lessonId: string;
  startTime?: number; // Resume position in seconds
  duration?: number;
  onBack: () => void;
  onComplete?: () => void;
}

// Extract YouTube video ID from URL
const getYoutubeVideoId = (url: string): string | null => {
  if (url.includes('youtube.com/watch?v=')) {
    return url.split('v=')[1]?.split('&')[0] || null;
  } else if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1]?.split('?')[0] || null;
  } else if (url.includes('youtube.com/embed/')) {
    return url.split('embed/')[1]?.split('?')[0] || null;
  }
  return null;
};

export const CourseVideoPlayer: React.FC<CourseVideoPlayerProps> = ({
  videoUrl,
  isYoutube,
  title,
  courseId,
  sectionId,
  lessonId,
  startTime = 0,
  duration,
  onBack,
  onComplete,
}) => {
  // Register with ModalContext to hide bottom navigation when video player is active
  // CourseVideoPlayer is always "open" when rendered, so we use true
  useNativeModal(true, onBack);

  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationValue, setDurationValue] = useState(0);
  const [hasSentDuration, setHasSentDuration] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isYoutubeReady, setIsYoutubeReady] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isLandscape, setIsLandscape] = useState(false);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const hideControlsTimeoutRef = useRef<number | null>(null);
  const lastSavedTimeRef = useRef(0);
  const { videoUrl: resolvedVideoUrl, isLoading, onLoadedData, onError } = useVideoLoadingCue(
    isYoutube ? null : videoUrl
  );

  // Save progress to backend
  const saveProgress = useCallback(async (timeInSeconds: number) => {
    if (!courseId || !sectionId || !lessonId) return;
    if (Math.abs(timeInSeconds - lastSavedTimeRef.current) < 3) return;

    try {
      lastSavedTimeRef.current = timeInSeconds;
      // Backend expects seconds * 100
      await updateLessonProgress(courseId, sectionId, lessonId, Math.floor(timeInSeconds * 100));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, [courseId, sectionId, lessonId]);

  const saveDuration = useCallback(async (durationInSeconds: number) => {
    if (!courseId || !sectionId || !lessonId) return;
    if (hasSentDuration || !durationInSeconds || !Number.isFinite(durationInSeconds)) return;

    try {
      setHasSentDuration(true);
      await updateLessonDuration(courseId, sectionId, lessonId, Math.floor(durationInSeconds));
    } catch (error) {
      console.error('Failed to save duration:', error);
    }
  }, [courseId, sectionId, lessonId, hasSentDuration]);

  // Mark lesson as complete
  const handleComplete = useCallback(async () => {
    try {
      await saveProgress(currentTime);
      await markLessonComplete(courseId, sectionId, lessonId);
      onComplete?.();
    } catch (error) {
      console.error('Failed to mark lesson complete:', error);
      onComplete?.(); // Still call onComplete even if API call fails
    }
  }, [courseId, sectionId, lessonId, currentTime, onComplete, saveProgress]);

  // Auto-save progress every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTime > 0) {
        saveProgress(currentTime);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentTime, saveProgress]);

  useEffect(() => {
    if (duration) {
      saveDuration(duration);
    }
  }, [duration, saveDuration]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && currentTime > 0) {
        saveProgress(currentTime);
      }
    };

    const handleBlur = () => {
      if (currentTime > 0) {
        saveProgress(currentTime);
      }
    };

    const handlePageHide = () => {
      if (currentTime > 0) {
        saveProgress(currentTime);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [currentTime, saveProgress]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      if (currentTime > 0) {
        saveProgress(currentTime);
      }
    };
  }, []);

  useEffect(() => {
    const updateOrientation = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      setOrientation(isLandscape ? 'landscape' : 'portrait');
      setIsLandscape(isLandscape);
    };

    updateOrientation();
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  useEffect(() => {
    let removeListener: (() => void) | null = null;
    const updateFromWindow = () => {
      const nextLandscape = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscape(nextLandscape);
    };

    updateFromWindow();

    if (Capacitor.isNativePlatform()) {
      // Sync initial orientation from native (layout uses it for safe area / landscape)
      const orient = (ScreenOrientation as { orientation?: () => Promise<{ type?: string }> }).orientation;
      if (orient) {
        orient()
          .then((result) => {
            const nextLandscape = result?.type?.startsWith('landscape') ?? false;
            setIsLandscape(nextLandscape);
            setOrientation(nextLandscape ? 'landscape' : 'portrait');
          })
          .catch(() => { /* fallback to updateFromWindow */ });
      }

      ScreenOrientation.addListener('screenOrientationChange', (info) => {
        const nextLandscape = info?.type?.startsWith('landscape') ?? false;
        setIsLandscape(nextLandscape);
        setOrientation(nextLandscape ? 'landscape' : 'portrait');
      })
        .then((handle) => {
          removeListener = () => handle.remove();
        })
        .catch(() => {
          window.addEventListener('orientationchange', updateFromWindow);
          window.addEventListener('resize', updateFromWindow);
          removeListener = () => {
            window.removeEventListener('orientationchange', updateFromWindow);
            window.removeEventListener('resize', updateFromWindow);
          };
        });
    } else {
      window.addEventListener('orientationchange', updateFromWindow);
      window.addEventListener('resize', updateFromWindow);
      removeListener = () => {
        window.removeEventListener('orientationchange', updateFromWindow);
        window.removeEventListener('resize', updateFromWindow);
      };
    }

    return () => {
      removeListener?.();
    };
  }, []);

  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    const requestFullscreen = async () => {
      if (document.fullscreenElement) return;
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      }
    };

    const exitFullscreen = async () => {
      if (!document.fullscreenElement) return;
      await document.exitFullscreen();
    };

    if (isLandscape) {
      requestFullscreen().catch(() => undefined);
    } else {
      exitFullscreen().catch(() => undefined);
    }
  }, [isLandscape]);

  useEffect(() => {
    return () => {
      if (!Capacitor.isNativePlatform()) return;
      ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => undefined);
      ScreenOrientation.unlock().catch(() => undefined);
    };
  }, []);

  // Handle back button
  const handleBack = async () => {
    await saveProgress(currentTime);
    onBack();
  };

  const SEEK_SECONDS = 15;

  const seekBack = useCallback(() => {
    setHasUserInteracted(true);
    setIsUIVisible(true);
    const target = Math.max(0, currentTime - SEEK_SECONDS);
    if (isYoutube) {
      const player = youtubePlayerRef.current;
      player?.seekTo?.(target, true);
      setCurrentTime(target);
      return;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  }, [isYoutube, currentTime]);

  const seekForward = useCallback(() => {
    setHasUserInteracted(true);
    setIsUIVisible(true);
    const target = Math.min(durationValue || 0, currentTime + SEEK_SECONDS);
    if (isYoutube) {
      const player = youtubePlayerRef.current;
      player?.seekTo?.(target, true);
      setCurrentTime(target);
      return;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  }, [isYoutube, currentTime, durationValue]);

  const togglePlay = useCallback(() => {
    setHasUserInteracted(true);
    setIsUIVisible(true);
    if (isYoutube) {
      const player = youtubePlayerRef.current;
      if (!player) return;
      if (isPlaying) {
        player.pauseVideo?.();
      } else {
        player.playVideo?.();
      }
      return;
    }

    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying, isYoutube]);

  const toggleMute = useCallback(() => {
    setHasUserInteracted(true);
    setIsUIVisible(true);
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (isYoutube) {
      const player = youtubePlayerRef.current;
      if (!player) return;
      if (nextMuted) {
        player.mute?.();
      } else {
        player.unMute?.();
        player.setVolume?.(Math.round(volume * 100));
      }
      return;
    }

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  }, [isMuted, isYoutube, volume]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setHasUserInteracted(true);
    setIsUIVisible(true);
    setVolume(nextVolume);
    const nextMuted = nextVolume <= 0.01;
    setIsMuted(nextMuted);

    if (isYoutube) {
      const player = youtubePlayerRef.current;
      if (!player) return;
      player.setVolume?.(Math.round(nextVolume * 100));
      if (nextMuted) {
        player.mute?.();
      } else {
        player.unMute?.();
      }
      return;
    }

    if (videoRef.current) {
      videoRef.current.volume = nextVolume;
      videoRef.current.muted = nextMuted;
    }
  }, [isYoutube]);

  useEffect(() => {
    if (isYoutube) {
      if (!isYoutubeReady) return;
      const player = youtubePlayerRef.current;
      if (!player) return;
      player.setVolume?.(Math.round(volume * 100));
      if (isMuted || volume <= 0.01) {
        player.mute?.();
      } else {
        player.unMute?.();
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted || volume <= 0.01;
  }, [isMuted, volume, isYoutube, isYoutubeReady]);

  const handleSeek = useCallback((nextTime: number) => {
    setHasUserInteracted(true);
    setIsUIVisible(true);
    if (isYoutube) {
      const player = youtubePlayerRef.current;
      player?.seekTo?.(nextTime, true);
      setCurrentTime(nextTime);
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  }, [isYoutube]);

  const toggleOrientation = useCallback(async () => {
    setHasUserInteracted(true);
    setIsUIVisible(true);
    const target = orientation === 'portrait' ? 'landscape' : 'portrait';
    try {
      if (Capacitor.isNativePlatform()) {
        await ScreenOrientation.lock({ orientation: target });
        return;
      }

      const screenOrientation = window.screen?.orientation as
        | { lock?: (orientation: string) => Promise<void> }
        | undefined;

      if (screenOrientation?.lock) {
        await screenOrientation.lock(target);
      }
    } catch (error) {
      console.warn('Orientation lock failed:', error);
    }
  }, [orientation]);

  // Track when video element is actually ready (not just URL resolved)
  const [isVideoElementReady, setIsVideoElementReady] = useState(false);
  // On Capacitor iOS/Android, native placeholder (grey/play) shows until video actually plays; keep overlay until then
  const [hasPlayed, setHasPlayed] = useState(false);

  // Show loading as overlay until URL ready, element ready, AND video has started (hides native placeholder)
  const showCourseLoading = isYoutube
    ? !isYoutubeReady && !youtubeError
    : (isLoading || !isVideoElementReady || !hasPlayed);

  const progressPercent = durationValue > 0 ? Math.min(100, (currentTime / durationValue) * 100) : 0;
  const volumePercent = Math.min(100, (isMuted ? 0 : volume) * 100);
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If autoplay is blocked (e.g. iOS low power), hide overlay after a short delay so user can tap play
  useEffect(() => {
    if (isYoutube || !isVideoElementReady || isLoading) return;
    const t = window.setTimeout(() => setHasPlayed(true), 2500);
    return () => clearTimeout(t);
  }, [isYoutube, isVideoElementReady, isLoading]);

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      window.clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      setIsUIVisible(false);
    }, 2000);
  }, [clearHideTimer]);

  useEffect(() => {
    if (isPlaying) {
      scheduleHide();
    } else {
      clearHideTimer();
      setIsUIVisible(true);
    }

    return () => {
      clearHideTimer();
    };
  }, [isPlaying, scheduleHide, clearHideTimer]);

  const handleShowControls = () => {
    setHasUserInteracted(true);
    setIsUIVisible(true);
    if (isPlaying) {
      scheduleHide();
    }
  };

  useEffect(() => {
    if (!isYoutube) return undefined;

    const videoId = getYoutubeVideoId(videoUrl);
    if (!videoId) {
      setYoutubeError('Invalid YouTube URL');
      return undefined;
    }

    let isMounted = true;

    const loadYouTubeApi = () => {
      if ((window as any).YT?.Player) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const existingScript = document.querySelector('script[data-youtube-api="true"]');
        if (existingScript) {
          (window as any).onYouTubeIframeAPIReady = () => resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.setAttribute('data-youtube-api', 'true');
        (window as any).onYouTubeIframeAPIReady = () => resolve();
        document.body.appendChild(script);
      });
    };

    loadYouTubeApi().then(() => {
      if (!isMounted || !youtubeContainerRef.current) return;
      const target = youtubeContainerRef.current;
      const origin = window.location.origin || undefined;

      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
      }

      youtubePlayerRef.current = new (window as any).YT.Player(target, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          start: Math.floor(startTime),
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
          ...(origin ? { origin } : {})
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            setIsYoutubeReady(true);
            event.target.unMute?.();
            event.target.setVolume?.(Math.round(volume * 100));
            setIsMuted(false);
            if (startTime > 0) {
              event.target.seekTo?.(startTime, true);
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            const state = event.data;
            if (state === (window as any).YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setHasPlayed(true);
              if (isMuted) {
                event.target.unMute?.();
                event.target.setVolume?.(Math.round(volume * 100));
                setIsMuted(false);
              }
            } else if (state === (window as any).YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (state === (window as any).YT.PlayerState.ENDED) {
              setIsPlaying(false);
              handleComplete();
            }
          },
          onError: () => {
            if (!isMounted) return;
            setYoutubeError('Unable to load YouTube video');
          }
        }
      });
    });

    return () => {
      isMounted = false;
      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
      }
    };
  }, [isYoutube, videoUrl, startTime, handleComplete, hasUserInteracted, isMuted, volume]);

  useEffect(() => {
    if (!isYoutube || !isYoutubeReady) return undefined;
    const interval = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player) return;
      const nextTime = player.getCurrentTime?.();
      const nextDuration = player.getDuration?.();

      if (Number.isFinite(nextTime)) {
        setCurrentTime(nextTime);
      }
      if (Number.isFinite(nextDuration) && nextDuration > 0) {
        setDurationValue(nextDuration);
        saveDuration(nextDuration);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isYoutube, isYoutubeReady, saveDuration]);

  // Root uses safe-area padding only in portrait; in landscape, we let the video fill the screen
  // and handle safe areas in the overlay controls.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed inset-0 bg-black flex flex-col z-[200] box-border overflow-hidden"
      style={{
        height: '100dvh',
        minHeight: '100dvh',
        paddingTop: isLandscape ? 0 : 'env(safe-area-inset-top, 0px)',
        paddingRight: isLandscape ? 0 : 'env(safe-area-inset-right, 0px)',
        paddingBottom: isLandscape ? 0 : 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: isLandscape ? 0 : 'env(safe-area-inset-left, 0px)',
      }}
    >
      <VideoLoadingOverlay show={showCourseLoading} message="loading lesson..." zIndex={250} />

      {/* Video area + controls (and title/back in same container so they stay visible in landscape fullscreen) */}
      <div
        ref={videoContainerRef}
        className="w-full flex-1 min-h-0 relative bg-black overflow-hidden flex flex-col"
        style={{
          paddingLeft: 0,
          paddingRight: 0
        }}
        onMouseMove={handleShowControls}
        onTouchStart={handleShowControls}
        onClick={handleShowControls}
      >
        {/* Back Button - inside fullscreen container so visible in landscape */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={isUIVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={handleBack}
          className={`absolute z-20 w-14 h-14 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition-all shadow-xl border border-white/10 active:scale-95 ${isUIVisible ? '' : 'pointer-events-none'}`}
          style={{
            top: isLandscape
              ? 'calc(20px + env(safe-area-inset-top, 0px))'
              : 12,
            left: isLandscape
              ? 'calc(20px + env(safe-area-inset-left, 0px))'
              : 20,
            marginLeft: isLandscape ? 0 : undefined,
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
          }}
        >
          <ArrowLeft className="w-7 h-7 text-white" strokeWidth={2.5} />
        </motion.button>

        {/* Title - hides with controls after 7s inactivity (same as back arrow) */}
        <AnimatePresence>
          {title && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={isUIVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              className={`absolute z-20 flex items-center h-14 max-w-[calc(100%-140px)] ${isUIVisible ? '' : 'pointer-events-none'}`}
              style={{
                top: isLandscape ? 'calc(20px + env(safe-area-inset-top, 0px))' : 12,
                left: isLandscape ? 'calc(90px + env(safe-area-inset-left, 0px))' : 72,
                right: isLandscape ? 'calc(20px + env(safe-area-inset-right, 0px))' : 16
              }}
            >
              <h2 className="text-white/95 font-medium text-base md:text-lg truncate leading-tight tracking-wide drop-shadow-md" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {title}
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center controls: Pause, Rewind, Forward — show on touch, hide after 2s */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isUIVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleShowControls}
          className={`absolute inset-0 z-10 flex items-center justify-center gap-4 ${isUIVisible ? '' : 'pointer-events-none'}`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); seekBack(); }}
            className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/25 transition active:scale-95"
            aria-label="Rewind 15 seconds"
          >
            <Rewind className="w-7 h-7 text-white" strokeWidth={2.2} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 hover:bg-white/30 transition active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" strokeWidth={2.2} />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" strokeWidth={2.2} />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); seekForward(); }}
            className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/25 transition active:scale-95"
            aria-label="Forward 15 seconds"
          >
            <FastForward className="w-7 h-7 text-white" strokeWidth={2.2} />
          </button>
        </motion.div>

      <style>{`
        /* Style video controls to have proper bottom spacing */
        video::-webkit-media-controls-panel {
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
        }
        video::-webkit-media-controls {
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
        }
        /* Hide native iOS/Android play button overlays during loading */
        video::-webkit-media-controls-overlay-play-button,
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
          opacity: 0 !important;
          -webkit-appearance: none;
        }
        /* Ensure video background is black (not grey) */
        video {
          background-color: #000;
        }

        .course-video-range {
          -webkit-appearance: none;
          appearance: none;
          background-repeat: no-repeat;
        }

        .course-video-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #f2e6c8;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
        }

        .course-video-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #f2e6c8;
          border: 0;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
        }
      `}</style>
        {isYoutube ? (
          <div ref={youtubeContainerRef} className="absolute inset-0 w-full h-full" />
        ) : (
          <video
            ref={videoRef}
            src={resolvedVideoUrl || videoUrl}
            className="w-full h-full object-contain"
            controls={false}
            autoPlay
            playsInline
            muted={isMuted}
            preload="auto"
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            onLoadedMetadata={() => {
              if (videoRef.current) {
                if (startTime > 0) {
                  videoRef.current.currentTime = startTime;
                }
                setDurationValue(videoRef.current.duration);
                saveDuration(videoRef.current.duration);
              }
            }}
            onLoadedData={() => {
              setIsVideoElementReady(true);
              onLoadedData();
              if (videoRef.current && isMuted) {
                videoRef.current.muted = false;
                setIsMuted(false);
              }
            }}
            onError={() => {
              setIsVideoElementReady(true);
              onError();
            }}
            onCanPlay={() => {
              setIsVideoElementReady(true);
              onLoadedData();
              if (videoRef.current && isMuted) {
                videoRef.current.muted = false;
                setIsMuted(false);
              }
            }}
            onPlay={() => {
              setHasPlayed(true);
              setIsPlaying(true);
              if (isMuted && videoRef.current) {
                setIsMuted(false);
                videoRef.current.muted = false;
              }
            }}
            onPause={() => {
              setIsPlaying(false);
            }}
            onVolumeChange={() => {
              if (videoRef.current) {
                setIsMuted(videoRef.current.muted);
                setVolume(videoRef.current.volume);
              }
            }}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            onEnded={handleComplete}
          />
        )}

        {youtubeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <p className="mb-4">{youtubeError}</p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-white text-black rounded-lg"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Controls bar: horizontal padding only on controls (not video); bar at bottom of screen; bottom padding clears home indicator */}
        <div
          className={`absolute left-0 right-0 bottom-0 z-10 pt-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-500 ${isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{
            paddingBottom: isLandscape
              ? 'calc(env(safe-area-inset-bottom, 0px) + 20px)'
              : 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            paddingLeft: isLandscape
              ? 'calc(env(safe-area-inset-left, 0px) + 60px)'
              : 'max(env(safe-area-inset-left, 0px), 16px)',
            paddingRight: isLandscape
              ? 'calc(env(safe-area-inset-right, 0px) + 60px)'
              : 'max(env(safe-area-inset-right, 0px), 16px)'
          }}
        >
          {/* Volume button + slider row — on top of timeline */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={toggleMute}
              className="w-11 h-11 shrink-0 rounded-full bg-white/10 hover:bg-white/15 transition flex items-center justify-center border border-white/10"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume <= 0.01 ? (
                <VolumeX className="w-5 h-5 text-white" strokeWidth={2.2} />
              ) : (
                <Volume2 className="w-5 h-5 text-white" strokeWidth={2.2} />
              )}
            </button>

            {/* Volume slider — hidden on iOS (platform UX); icon remains for mute toggle */}
            {Capacitor.getPlatform() !== 'ios' && (
            <div className="flex-1 flex items-center min-w-0 max-w-[140px] sm:max-w-[180px]">
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="course-video-range w-full h-2 rounded-full cursor-pointer"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(226, 196, 134, 0.95) ${volumePercent}%, rgba(255, 255, 255, 0.18) ${volumePercent}%)`
                }}
                aria-label="Volume"
              />
            </div>
            )}

            <button
              onClick={toggleOrientation}
              className="ml-auto w-11 h-11 shrink-0 rounded-full hover:bg-white/10 transition flex items-center justify-center"
              aria-label={orientation === 'portrait' ? 'Switch to landscape' : 'Switch to portrait'}
            >
              <RotateCw className="w-5 h-5 text-white" strokeWidth={2.2} />
            </button>
          </div>

          {/* Timeline (progress bar) */}
          <input
            type="range"
            min={0}
            max={Math.max(durationValue, 0)}
            step={0.1}
            value={currentTime}
            onChange={(event) => handleSeek(parseFloat(event.target.value))}
            className="course-video-range w-full h-1.5 rounded-full cursor-pointer"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(226, 196, 134, 1) ${progressPercent}%, rgba(255, 255, 255, 0.2) ${progressPercent}%)`
            }}
            aria-label="Seek"
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
            <span className="tabular-nums">{formatTime(currentTime)}</span>
            <span className="tabular-nums">{formatTime(durationValue)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
