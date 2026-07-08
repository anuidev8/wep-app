/**
 * useRestMusic Hook
 * React hook for managing background music during REST & INTEGRATE phases
 * Provides simple interface to control music playback
 */

import { useEffect, useRef } from 'react';
import { restMusicService } from '../services/restMusicService';

export interface UseRestMusicOptions {
  /**
   * Whether the REST phase is currently active
   */
  isActive: boolean;
  
  /**
   * Whether the session is paused
   */
  isPaused: boolean;
  
  /**
   * Whether to stop music immediately (e.g., when skipping)
   */
  shouldStopImmediate?: boolean;
}

export interface UseRestMusicReturn {
  /**
   * Manually start music (optional, usually handled automatically)
   */
  startMusic: () => Promise<void>;
  
  /**
   * Manually stop music (optional, usually handled automatically)
   */
  stopMusic: (immediate?: boolean) => Promise<void>;
}

/**
 * Hook to manage rest music playback
 * Automatically handles play/stop based on isActive and isPaused states
 */
export const useRestMusic = ({
  isActive,
  isPaused,
  shouldStopImmediate = false,
}: UseRestMusicOptions): UseRestMusicReturn => {
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Update refs when props change
  useEffect(() => {
    isActiveRef.current = isActive;
    isPausedRef.current = isPaused;
  }, [isActive, isPaused]);

  // Handle music playback based on state
  useEffect(() => {
    // If REST phase is active and not paused, start music (only if not already playing)
    if (isActive && !isPaused && !shouldStopImmediate) {
      // Only start if not already playing or paused
      if (!restMusicService.isPlaying() && !restMusicService.isPaused()) {
        // Reuse same track (forceNewTrack=false) - new track selection happens in finishRound via resetTrack()
        restMusicService.play(false).catch((error) => {
          console.error('Failed to start rest music:', error);
        });
      } else if (restMusicService.isPaused() && isActive) {
        // If paused and phase is active, resume (but don't force - let button handle it)
        // This handles session pause/resume, not button mute/unmute
        restMusicService.resume();
      }

      // Cleanup function
      cleanupRef.current = () => {
        restMusicService.stop(true).catch(() => {
          // Ignore cleanup errors
        });
      };
    }
    // If REST phase is not active or should stop immediately, stop music
    else if (!isActive || shouldStopImmediate) {
      restMusicService.stop(shouldStopImmediate).catch((error) => {
        console.error('Failed to stop rest music:', error);
      });
      cleanupRef.current = null;
    }
    // If paused (session pause, not button mute), pause music (but keep track loaded)
    else if (isPaused && restMusicService.isPlaying()) {
      restMusicService.pause();
    }
    // If resumed from session pause (was paused, now not paused), resume music
    else if (!isPaused && isActive && restMusicService.isPaused()) {
      // Only resume if we're in active phase (handles session resume)
      restMusicService.resume();
    }

    // Cleanup on unmount or when REST phase ends
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [isActive, isPaused, shouldStopImmediate]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      restMusicService.cleanup();
    };
  }, []);

  // Manual control functions (optional, for edge cases)
  const startMusic = async () => {
    await restMusicService.play();
  };

  const stopMusic = async (immediate: boolean = false) => {
    await restMusicService.stop(immediate);
  };

  return {
    startMusic,
    stopMusic,
  };
};
