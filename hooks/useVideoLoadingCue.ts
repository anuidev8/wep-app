import { useCallback, useEffect, useRef, useState } from 'react';
import { getCachedVideoSrc } from '../services/videoCacheService';

/**
 * Shared hook for resolving and preloading a single video URL with:
 * - Non-blocking cache check (uses remote URL immediately, caches in background)
 * - "isLoading" flag that shows loading overlay until video is ready
 * - Fallback timer so we never show the loader indefinitely
 * - Follows MorningRitual pattern for consistent behavior
 *
 * Designed to work well inside Capacitor WebViews on iOS/Android.
 */
export const useVideoLoadingCue = (
  remoteUrl: string | null | undefined,
  fallbackTimeoutMs: number = 2500
) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(remoteUrl ?? null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const loadStartRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  // Resolve video source (non-blocking - uses remote URL immediately)
  useEffect(() => {
    let cancelled = false;

    setIsVideoReady(false);
    loadStartRef.current = typeof performance !== 'undefined' ? performance.now() : null;

    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (!remoteUrl) {
      setResolvedUrl(null);
      setIsVideoReady(true);
      return;
    }

    // Use remote URL immediately (don't wait for cache check)
    // This prevents blocking and shows video faster
    setResolvedUrl(remoteUrl);

    // Try to get cached version in background (non-blocking)
    // If cached version is available, switch to it
    getCachedVideoSrc(remoteUrl)
      .then((src) => {
        if (!cancelled && src !== remoteUrl) {
          // Only update if we got a different (cached) URL
          setResolvedUrl(src);
        }
      })
      .catch(() => {
        // Ignore cache errors - we already have remote URL
      });

    // Fallback timer: if the video never fires onLoadedData, don't keep the UI blocked forever
    fallbackTimerRef.current = window.setTimeout(() => {
      if (!cancelled) {
        setIsVideoReady(true);
      }
    }, fallbackTimeoutMs);

    return () => {
      cancelled = true;
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [remoteUrl, fallbackTimeoutMs]);

  const handleLoadedData = useCallback(() => {
    setIsVideoReady(true);
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (loadStartRef.current != null) {
      const duration = performance.now() - loadStartRef.current;
      // eslint-disable-next-line no-console
      console.info(
        `[useVideoLoadingCue] Video loaded in ${Math.round(duration)}ms for ${remoteUrl}`
      );
    }
  }, [remoteUrl]);

  const handleError = useCallback(() => {
    setIsVideoReady(true);
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  return {
    videoUrl: resolvedUrl ?? undefined,
    isLoading: !isVideoReady,
    onLoadedData: handleLoadedData,
    onError: handleError,
  };
};

