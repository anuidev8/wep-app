import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { AudioEngine } from '../../hooks/useAudioEngine';
import { AudioTrack } from '../../types';
import { Volume2, VolumeX, ArrowLeft, Pause, RotateCcw, Play } from 'lucide-react';
import { CHAKRAS } from '../../constants';
import { triggerHaptic } from '../../utils/hapticFeedback';
import { useVideoLoadingCue } from '../../hooks/useVideoLoadingCue';
import { VideoLoadingOverlay } from '../VideoLoadingOverlay';
import { AudioUnavailableModal } from './AudioUnavailableModal';

interface ChakraPlayerViewProps {
  engine: AudioEngine;
  track: AudioTrack;
}

export const ChakraPlayerView: React.FC<ChakraPlayerViewProps> = ({ engine, track }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const seekSliderRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const hasAutoPlayedRef = useRef(false);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find the chakra for this track (supports both legacy and API tracks)
  const chakra = CHAKRAS.find((c) => {
    // Legacy: chakra_root, chakra_root_mantraId
    if (track.id.startsWith('chakra_')) {
      const suffix = track.id.replace('chakra_', '');
      const chakraId = suffix.split('_')[0];
      if (c.id === chakraId) return true;
      if (track.id === `chakra_${c.id}`) return true;
    }
    if (track.visualUrl === c.visualUrl) return true;
    // API tracks: match by title (e.g. "Root Chakra Healing", "3rdEye Chakra")
    const titleLower = (track.title || '').toLowerCase();
    if (titleLower.includes('root') && c.id === 'root') return true;
    if (titleLower.includes('sacral') && c.id === 'sacral') return true;
    if ((titleLower.includes('solar') || titleLower.includes('plexus')) && c.id === 'solar') return true;
    if (titleLower.includes('heart') && c.id === 'heart') return true;
    if (titleLower.includes('throat') && c.id === 'throat') return true;
    if ((titleLower.includes('third') || titleLower.includes('3rd') || titleLower.includes('eye')) && c.id === 'third_eye') return true;
    if (titleLower.includes('crown') && c.id === 'crown') return true;
    return false;
  }) || CHAKRAS.find((c) => c.id === track.id.replace('chakra_', ''));

  const rawVideoUrl = track.visualUrl || chakra?.visualUrl;
  const { videoUrl, isLoading: isVideoLoading, onLoadedData, onError } = useVideoLoadingCue(
    rawVideoUrl || null
  );

  // Track audio readiness — overlay waits for both video (if any) AND audio
  const [audioReady, setAudioReady] = useState(false);
  useEffect(() => {
    if (!audioReady && (engine.isPlaying || engine.duration > 0)) setAudioReady(true);
  }, [engine.isPlaying, engine.duration, audioReady]);
  useEffect(() => {
    const t = window.setTimeout(() => setAudioReady(true), 6000);
    return () => window.clearTimeout(t);
  }, []);
  const showOverlay = (Boolean(rawVideoUrl && isVideoLoading) || !audioReady);

  // Audio unavailable detection
  const [showUnavailableModal, setShowUnavailableModal] = useState(!track.audioUrl);
  useEffect(() => {
    if (!track.audioUrl) { setShowUnavailableModal(true); return; }
    setShowUnavailableModal(false);
  }, [track.audioUrl]);
  // Hide modal immediately when playback starts
  useEffect(() => {
    if (engine.isPlaying || engine.duration > 0) setShowUnavailableModal(false);
  }, [engine.isPlaying, engine.duration]);
  // Dedicated failure timer — decoupled from the 6s audioReady overlay timeout
  const audioHasStartedRef = useRef(false);
  useEffect(() => {
    if (engine.isPlaying || engine.duration > 0) audioHasStartedRef.current = true;
  }, [engine.isPlaying, engine.duration]);
  useEffect(() => {
    if (!track.audioUrl) return;
    const t = window.setTimeout(() => {
      if (!audioHasStartedRef.current) setShowUnavailableModal(true);
    }, 20000);
    return () => window.clearTimeout(t);
  }, [track.audioUrl]);
  const handleRetry = () => window.location.reload();

  // Sync video play/pause with engine state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (engine.isPlaying && video.paused) {
      video.play().catch(console.error);
    } else if (!engine.isPlaying && !video.paused) {
      video.pause();
    }
  }, [engine.isPlaying]);

  // Sync video time with engine time
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !engine.currentTime) return;

    // Sync only if drift > 0.5s to avoid stuttering
    if (Math.abs(video.currentTime - engine.currentTime) > 0.5) {
      video.currentTime = engine.currentTime;
    }
  }, [engine.currentTime]);

  // Show UI whenever play state changes (pause brings controls back, same as Mantra/Guided)
  useEffect(() => {
    setIsUIVisible(true);
  }, [engine.isPlaying]);

  useEffect(() => {
    return () => {
      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    };
  }, []);

  // Auto-fade logic - hide UI 12 seconds after play starts
  useEffect(() => {
    if (fadeTimerRef.current) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (engine.isPlaying && isUIVisible) {
      fadeTimerRef.current = window.setTimeout(() => {
        setIsUIVisible(false);
      }, 12000);
    }

    return () => {
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [engine.isPlaying, isUIVisible]);

  const togglePlay = useCallback(() => {
    triggerHaptic('medium');
    engine.togglePlay();
  }, [engine]);

  const toggleMute = useCallback(() => {
    triggerHaptic('light');
    engine.toggleMute();
  }, [engine]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Handle seek drag — visual only during move, single seekTo() on drag end
  const handleSeekDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingSeek(true);
    engine.beginUserSeek();
    triggerHaptic('light');

    let pendingSeekTime = engine.currentTime;

    const updateSeekVisual = (clientX: number) => {
      if (!seekSliderRef.current || !engine.duration) return;
      const rect = seekSliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percent * engine.duration;
      pendingSeekTime = newTime;
      setDragPercent(percent * 100);
      // No engine.seekTo here — avoids flooding the native bridge
    };

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault();
      const clientX = 'touches' in moveEvent && moveEvent.touches.length > 0
        ? moveEvent.touches[0].clientX
        : (moveEvent as MouseEvent).clientX;
      updateSeekVisual(clientX);
    };

    const initialX = 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientX : e.clientX;
    updateSeekVisual(initialX);

    const handleEnd = () => {
      engine.seekTo(pendingSeekTime);
      setIsDraggingSeek(false);
      setDragPercent(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }, [engine]);

  // Handle volume drag
  const handleVolumeDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingVolume(true);
    triggerHaptic('light');

    const updateVolume = (clientX: number) => {
      if (!volumeSliderRef.current) return;
      const rect = volumeSliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      engine.setVolume(percent);
      if (percent === 0) {
        if (!engine.isMuted) engine.toggleMute();
      } else if (engine.isMuted) {
        engine.toggleMute();
      }
    };

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      updateVolume(clientX);
    };

    const initialX = 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientX : e.clientX;
    updateVolume(initialX);

    const handleEnd = () => {
      setIsDraggingVolume(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
  };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }, [engine]);

  const progressPercent = engine.duration > 0 ? (engine.currentTime / engine.duration) * 100 : 0;

  const debouncedSeekBy = useCallback((delta: number) => {
    if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = setTimeout(() => {
      engine.seekBy(delta);
      seekDebounceRef.current = null;
    }, 100);
  }, [engine]);

  const handleInteraction = useCallback(() => {
    if (!isUIVisible) {
      setIsUIVisible(true);
    } else {
      // Restart the timer by clearing and resetting
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      if (engine.isPlaying) {
        fadeTimerRef.current = window.setTimeout(() => {
          setIsUIVisible(false);
        }, 12000);
      }
    }
  }, [isUIVisible, engine.isPlaying]);

  // Fallback to audio-only player if no video URL
  if (!videoUrl && !rawVideoUrl) {
    return (
      <div 
        className="min-h-screen bg-[#070812] text-white flex flex-col items-center justify-center p-8"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          handleInteraction();
        }}
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif font-bold mb-2">{track.title}</h2>
          <p className="text-white/70">{track.description}</p>
        </div>
        <div className="w-72 h-72 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-8">
          {/* No play/pause button - clicking anywhere toggles playback */}
        </div>
        <div className="w-full max-w-md">
          <div 
            className="w-full h-1 bg-white/20 rounded-full mb-4 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              const progressBar = e.currentTarget;
              const rect = progressBar.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percent = clickX / rect.width;
              if (engine.duration) {
                const newTime = percent * engine.duration;
                engine.seekTo(newTime);
                triggerHaptic('light');
              }
            }}
          >
            <div 
              className="h-full bg-brand-gold rounded-full transition-all pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>{formatTime(engine.currentTime)}</span>
            <span>{formatTime(engine.duration)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 w-full overflow-hidden bg-black text-white"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.volume-control') || target.closest('button')) return;
        // Background taps only show/hide UI — never toggle playback
        handleInteraction();
      }}
    >
      {/* Loading overlay — wait for both video (if any) AND audio.
          zIndex={250} ensures the overlay renders above the native video layer
          on iOS/Android WebView, which ignores CSS z-index for <video> elements. */}
      <VideoLoadingOverlay
        show={showOverlay}
        message="loading chakra..."
        zIndex={250}
      />

      {showUnavailableModal && (
        <AudioUnavailableModal trackTitle={track.title} variant="chakra" onRetry={track.audioUrl ? handleRetry : undefined} />
      )}

      {/* Video Element (muted, visual only) */}
      {videoUrl && (
        <>
          <style>{`
            video::-webkit-media-controls-overlay-play-button,
            video::-webkit-media-controls-start-playback-button {
              display: none !important;
              opacity: 0 !important;
              -webkit-appearance: none;
            }
            video {
              background-color: #000;
            }
          `}</style>
          <video
            ref={videoRef}
            key={videoUrl}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-contain"
            playsInline
            autoPlay
            preload="auto"
            muted={true}
            loop={true}
            style={{ opacity: showOverlay ? 0 : 1, transition: 'opacity 0.6s ease' }}
            onLoadedData={onLoadedData}
            onError={onError}
            onCanPlay={onLoadedData}
          />
        </>
      )}

      {/* Top Controls - Back Button and Volume (same as Mantra / Guided Meditation) */}
      <div 
        className={`absolute top-0 left-0 right-0 px-6 pb-6 z-20 flex items-center justify-between transition-opacity duration-[1500ms] ${isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('light');
            navigate(-1);
          }}
          className="relative p-3.5 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition-all duration-300 border-2 border-white/20 shadow-xl shadow-white/10 active:scale-95 group"
          style={{
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <ArrowLeft size={20} className="relative z-10 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
        </button>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              toggleMute();
            }}
            className="relative p-3.5 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition-all duration-300 border-2 border-white/20 shadow-xl shadow-white/10 active:scale-95 group"
            style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
          >
            <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {engine.isMuted || engine.volume === 0 ? (
              <VolumeX size={20} className="relative z-10 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
            ) : (
              <Volume2 size={20} className="relative z-10 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
            )}
          </button>
          {/* Horizontal Volume Slider — hidden on iOS (platform UX); icon remains for mute toggle */}
          {Capacitor.getPlatform() !== 'ios' && (
          <div
            ref={volumeSliderRef}
            className="volume-control relative h-1 w-32 bg-white/10 rounded-full cursor-pointer touch-manipulation group"
            onMouseDown={handleVolumeDrag}
            onTouchStart={handleVolumeDrag}
            onClick={(e) => {
              e.stopPropagation();
              if (!volumeSliderRef.current) return;
              const rect = volumeSliderRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = Math.max(0, Math.min(1, x / rect.width));
              engine.setVolume(percent);
              if (percent === 0) {
                if (!engine.isMuted) engine.toggleMute();
              } else if (engine.isMuted) {
                engine.toggleMute();
              }
              triggerHaptic('light');
            }}
          >
            <div 
              className="absolute left-0 top-0 h-full bg-white/80 rounded-full transition-all"
              style={{ 
                width: `${engine.isMuted ? 0 : engine.volume * 100}%`,
                transition: isDraggingVolume ? 'none' : 'width 0.1s ease-out'
              }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ 
                left: `${engine.isMuted ? 0 : engine.volume * 100}%`,
                transform: `translateX(-50%) translateY(-50%)`,
                transition: isDraggingVolume ? 'none' : 'left 0.1s ease-out, opacity 0.2s'
              }}
            />
          </div>
          )}
        </div>
      </div>

      {/* Center Content - Title Above Chakra Symbol */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 transition-opacity duration-[1500ms] ${!engine.isPlaying ? 'opacity-100' : (isUIVisible ? 'opacity-100' : 'opacity-0')}`} style={{ paddingBottom: engine.isPlaying ? '200px' : '2rem' }}>
        {/* Title Section - Above Chakra Symbol */}
        <div className="text-center mb-16">
          <h2 className="text-white font-serif font-bold text-2xl mb-1">{track.title}</h2>
          {track.description && (
            <p className="text-white font-serif font-bold text-lg mb-2">{track.description}</p>
          )}
          {chakra && (
            <p className="text-white/70 text-sm">{chakra.sanskritName} • {chakra.frequency}</p>
          )}
        </div>
      </div>

      {/* Bottom Controls - Always visible, fade after 12s when playing */}
      <div 
          className={`absolute bottom-0 left-0 right-0 z-20 px-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-[1500ms] ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{
            pointerEvents: isUIVisible ? 'auto' : 'none',
            paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))'
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleInteraction();
          }}
          onMouseMove={handleInteraction}
          onTouchStart={handleInteraction}
      >
          {/* Timer Display */}
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-white/80 text-sm font-light tracking-wide">
              {formatTime(engine.currentTime)}
            </span>
            <span className="text-white/60 text-sm font-light tracking-wide">
              {formatTime(engine.duration)}
            </span>
          </div>

          {/* Seek Slider - no onClick (double-fires on iOS); drag handlers cover taps */}
          <div 
            ref={seekSliderRef}
            className="relative h-1.5 bg-white/10 rounded-full mb-6 cursor-pointer touch-manipulation group"
            onMouseDown={handleSeekDrag}
            onTouchStart={handleSeekDrag}
          >
          <div
              className="absolute left-0 top-0 h-full bg-brand-gold rounded-full transition-all"
              style={{
                width: `${isDraggingSeek && dragPercent !== null ? dragPercent : progressPercent}%`,
                transition: isDraggingSeek ? 'none' : 'width 0.1s ease-out'
              }}
            />
            {/* Seek indicator dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `${isDraggingSeek && dragPercent !== null ? dragPercent : progressPercent}%`,
                transform: `translateX(-50%) translateY(-50%)`,
                transition: isDraggingSeek ? 'none' : 'left 0.1s ease-out, opacity 0.2s'
              }}
            />
          </div>

          {/* Play Controls Row */}
          <div className="flex justify-center items-center gap-6 mb-6">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                triggerHaptic('light');
                debouncedSeekBy(-15);
              }}
              className="p-2 text-white/70 hover:text-white transition-colors active:scale-95"
            >
              <RotateCcw size={22} />
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                triggerHaptic('medium');
                engine.togglePlay(); 
              }}
              className="relative p-3.5 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition-all duration-300 border-2 border-white/20 shadow-xl shadow-white/10 active:scale-95 group"
              style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
              aria-label={engine.isPlaying ? 'Pause' : 'Play'}
            >
              <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              {engine.isPlaying ? (
                <Pause size={20} className="relative z-10 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
              ) : (
                <Play size={20} className="relative z-10 text-white group-hover:scale-110 transition-transform duration-300 ml-1" strokeWidth={2.5} fill="white" />
              )}
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                triggerHaptic('light');
                debouncedSeekBy(15);
              }}
              className="p-2 text-white/70 hover:text-white transition-colors scale-x-[-1] active:scale-95"
            >
              <RotateCcw size={22} />
            </button>
          </div>
      </div>

      {/* Chakra Color Overlay */}
      {chakra && (
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at center, ${chakra.color}15 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
};
