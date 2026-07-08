/**
 * Rest Music Service
 * Manages background music playback during REST & INTEGRATE phases
 * Singular implementation pattern - handles all music logic in one place
 */

const SLEEP_MUSIC_BASE_URL = 'https://storage.googleapis.com/sleepmusic';

export const REST_MUSIC_TRACKS = [
  'Full body Healing 432 Hz.mp3',
  'Sleep Music Deep Sleep All.mp3',
  'MWAA00104bellsrain.mp3',
  'MWAA001093hz.mp3',
  'MWAA0015_and0v7.mp3',
  'MWAA0066_mhcerv.mp3',
  'MWAA0070_hxj9s3.mp3',
  'MWAA00100.mp3',
  'MWAA0092.mp3',
  'MWAA0093.mp3',
];

export interface RestMusicController {
  play: (forceNewTrack?: boolean) => Promise<void>;
  stop: (immediate?: boolean) => Promise<void>;
  pause: () => void;
  resume: () => void;
  cleanup: () => void;
  resetTrack: () => void; // Force new track selection
  isPlaying: () => boolean;
  isPaused: () => boolean;
}

class RestMusicService {
  private audio: HTMLAudioElement | null = null;
  private fadeInInterval: number | null = null;
  private fadeOutInterval: number | null = null;
  private targetVolume: number = 0.35; // 35% volume (between 30-40%)
  private fadeDuration: number = 2000; // 2 seconds
  private lastPlayedIndex: number = -1;
  // Keep a small "recently played" window to avoid repeats; when exhausted, loop back.
  private recentPlayedIndices: number[] = [];
  private readonly maxRecentPlayed: number = 5;
  private isPausedState: boolean = false;
  private currentTrackUrl: string | null = null;
  private savedTrackUrl: string | null = null; // Keep track URL even after cleanup

  /**
   * Get a random track URL, ensuring it's different from the last played track
   */
  private getRandomTrackUrl(): string {
    // Build a candidate set excluding the recent window and the immediate last track
    const total = REST_MUSIC_TRACKS.length;
    if (total <= 1) {
      this.lastPlayedIndex = 0;
      this.recentPlayedIndices = [0];
      const filename = REST_MUSIC_TRACKS[0];
      const trackUrl = `${SLEEP_MUSIC_BASE_URL}/${encodeURIComponent(filename)}`;
      console.log(`[Rest Music] Selected track: "${filename}" (index: 0)`);
      return trackUrl;
    }

    const excluded = new Set<number>(this.recentPlayedIndices);
    if (this.lastPlayedIndex >= 0) excluded.add(this.lastPlayedIndex);

    let candidates = Array.from({ length: total }, (_, i) => i).filter((i) => !excluded.has(i));

    // If we've excluded everything (e.g. maxRecentPlayed too high vs total),
    // loop back by clearing the recent window and only avoid immediate repeat.
    if (candidates.length === 0) {
      this.recentPlayedIndices = [];
      candidates = Array.from({ length: total }, (_, i) => i).filter((i) => i !== this.lastPlayedIndex);
    }

    const randomIndex = candidates[Math.floor(Math.random() * candidates.length)];

    this.lastPlayedIndex = randomIndex;
    this.recentPlayedIndices.push(randomIndex);
    if (this.recentPlayedIndices.length > this.maxRecentPlayed) {
      this.recentPlayedIndices.shift();
    }

    const filename = REST_MUSIC_TRACKS[randomIndex];
    const trackUrl = `${SLEEP_MUSIC_BASE_URL}/${encodeURIComponent(filename)}`;
    
    console.log(`[Rest Music] Selected track: "${filename}" (index: ${randomIndex})`);
    return trackUrl;
  }

  /**
   * Fade in volume from 0 to target volume over fadeDuration
   */
  private fadeIn(): void {
    if (!this.audio) return;

    this.audio.volume = 0;
    const startTime = Date.now();
    const startVolume = 0;
    const endVolume = this.targetVolume;

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this.fadeDuration, 1);
      
      // Use ease-in-out curve for smooth fade
      const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      if (this.audio) {
        this.audio.volume = startVolume + (endVolume - startVolume) * easedProgress;
      }

      if (progress < 1) {
        this.fadeInInterval = window.requestAnimationFrame(fade);
      } else {
        this.fadeInInterval = null;
        if (this.audio) {
          this.audio.volume = endVolume;
        }
      }
    };

    fade();
  }

  /**
   * Fade out volume from current to 0 over fadeDuration
   */
  private fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audio) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const startVolume = this.audio.volume;
      const endVolume = 0;

      const fade = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / this.fadeDuration, 1);
        
        // Use ease-in-out curve for smooth fade
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        if (this.audio) {
          this.audio.volume = startVolume + (endVolume - startVolume) * easedProgress;
        }

        if (progress < 1) {
          this.fadeOutInterval = window.requestAnimationFrame(fade);
        } else {
          this.fadeOutInterval = null;
          if (this.audio) {
            this.audio.volume = 0;
          }
          resolve();
        }
      };

      fade();
    });
  }

  /**
   * Clean up any active fade intervals
   */
  private clearFadeIntervals(): void {
    if (this.fadeInInterval !== null) {
      window.cancelAnimationFrame(this.fadeInInterval);
      this.fadeInInterval = null;
    }
    if (this.fadeOutInterval !== null) {
      window.cancelAnimationFrame(this.fadeOutInterval);
      this.fadeOutInterval = null;
    }
  }

  /**
   * Start playing music with fade in
   * @param forceNewTrack - If true, select a new track. If false, reuse saved track if available.
   */
  async play(forceNewTrack: boolean = false): Promise<void> {
    // If already playing, do nothing
    if (this.audio && !this.audio.paused && !this.isPausedState) {
      const trackName = this.currentTrackUrl?.split('/').pop() || 'unknown';
      console.log(`[Rest Music] ℹ️  Already playing: "${trackName}"`);
      return;
    }

    // If paused, resume instead
    if (this.isPausedState && this.audio) {
      this.resume();
      return;
    }

    // Clean up existing audio if any (but preserve track URL)
    const previousTrackUrl = this.currentTrackUrl || this.savedTrackUrl;
    this.cleanup();

    // Use saved track if available and not forcing new track, otherwise get new one
    let trackUrl: string;
    if (!forceNewTrack && previousTrackUrl) {
      trackUrl = previousTrackUrl;
      console.log(`[Rest Music] ♻️  Reusing track: "${trackUrl.split('/').pop()}"`);
    } else {
      trackUrl = this.getRandomTrackUrl();
    }
    
    this.currentTrackUrl = trackUrl;
    this.savedTrackUrl = trackUrl; // Save for future reuse

    // Create new audio element
    this.audio = new Audio(trackUrl);
    this.audio.loop = true;
    this.audio.volume = 0;
    this.audio.preload = 'auto';

    // Handle errors gracefully
    this.audio.addEventListener('error', (e) => {
      console.error('Rest music playback error:', e);
      this.cleanup();
    });

    // Ensure continuous playback: if track ends (e.g. streaming edge case), restart it
    this.audio.addEventListener('ended', () => {
      if (this.audio && !this.isPausedState) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      }
    });

    try {
      // Start playback
      await this.audio.play();
      this.isPausedState = false;
      
      const trackName = this.currentTrackUrl?.split('/').pop() || 'unknown';
      console.log(`[Rest Music] 🎵 Now playing: "${trackName}" (volume: ${(this.targetVolume * 100).toFixed(0)}%, fade in: ${this.fadeDuration}ms)`);
      
      // Fade in
      this.fadeIn();
    } catch (error) {
      console.error('[Rest Music] ❌ Failed to play rest music:', error);
      this.cleanup();
    }
  }

  /**
   * Stop music with fade out (or immediately if requested)
   * Preserves track URL for reuse on next play
   */
  async stop(immediate: boolean = false): Promise<void> {
    if (!this.audio) return;

    const trackName = this.currentTrackUrl?.split('/').pop() || 'unknown';
    console.log(`[Rest Music] ⏹️  Stopping: "${trackName}" (${immediate ? 'immediate' : 'fade out'}) - track will be preserved`);

    // Preserve current track URL before cleanup
    if (this.currentTrackUrl) {
      this.savedTrackUrl = this.currentTrackUrl;
    }

    this.clearFadeIntervals();

    if (immediate) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.volume = 0;
      this.cleanup();
      return;
    }

    // Fade out then stop
    await this.fadeOut();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.cleanup();
  }

  /**
   * Pause music (maintains position for resume)
   */
  pause(): void {
    if (!this.audio || this.audio.paused) return;

    const trackName = this.currentTrackUrl?.split('/').pop() || 'unknown';
    console.log(`[Rest Music] ⏸️  Paused: "${trackName}"`);

    this.clearFadeIntervals();
    this.audio.pause();
    this.isPausedState = true;
  }

  /**
   * Resume music from paused position
   */
  resume(): void {
    if (!this.audio || !this.isPausedState) return;

    const trackName = this.currentTrackUrl?.split('/').pop() || 'unknown';
    console.log(`[Rest Music] ▶️  Resumed: "${trackName}"`);

    this.clearFadeIntervals();
    
    // Resume playback
    this.audio.play().catch((error) => {
      console.error('[Rest Music] ❌ Failed to resume rest music:', error);
    });

    // Fade in from current volume
    this.fadeIn();
    this.isPausedState = false;
  }

  /**
   * Clean up audio element and intervals
   * Note: Preserves savedTrackUrl so the same track can be reused
   */
  cleanup(): void {
    this.clearFadeIntervals();

    if (this.audio) {
      const trackName = this.currentTrackUrl?.split('/').pop() || 'unknown';
      if (trackName !== 'unknown') {
        console.log(`[Rest Music] 🧹 Cleanup: "${trackName}" (track URL preserved)`);
      }
      
      try {
        this.audio.pause();
        this.audio.src = '';
        this.audio.load();
      } catch (e) {
        // Ignore cleanup errors
      }
      this.audio = null;
    }

    this.isPausedState = false;
    // Don't clear currentTrackUrl - it's preserved in savedTrackUrl for reuse
    // Only clear currentTrackUrl if we want to force a new track selection
  }

  /**
   * Force selection of a new track for the next play
   */
  resetTrack(): void {
    this.savedTrackUrl = null;
    this.currentTrackUrl = null;
    console.log(`[Rest Music] 🔄 Track reset - next play will select new track`);
  }

  /**
   * Check if music is currently playing
   */
  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused && !this.isPausedState;
  }

  /**
   * Check if music is paused
   */
  isPaused(): boolean {
    return this.isPausedState;
  }
}

// Export singleton instance
export const restMusicService = new RestMusicService();
