
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Wind } from 'lucide-react';
import { AudioEngine } from '../../hooks/useAudioEngine';
import { AudioTrack } from '../../types';
import { useNavigate } from 'react-router-dom';
import { triggerHaptic } from '../../utils/hapticFeedback';
import { useVideoLoadingCue } from '../../hooks/useVideoLoadingCue';
import { VideoLoadingOverlay } from '../VideoLoadingOverlay';
import { AudioUnavailableModal } from './AudioUnavailableModal';

interface Props {
  engine: AudioEngine;
  track: AudioTrack;
}

export const GuidedPlayerView: React.FC<Props> = ({ engine, track }) => {
  const navigate = useNavigate();
  const seekSliderRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [showBreathingGuide, setShowBreathingGuide] = useState(false);
  const wasTouchEventRef = useRef(false);
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const VIDEO_URL = "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Music%20Players/MusicPlayer.GuidedMeditation.Mantra.mp4";
  const { videoUrl, isLoading, onLoadedData, onError } = useVideoLoadingCue(VIDEO_URL);

  // Track audio readiness — overlay waits for both video AND audio (same as MantraPlayerView)
  const [audioReady, setAudioReady] = useState(false);
  useEffect(() => {
    if (!audioReady && (engine.isPlaying || engine.duration > 0)) setAudioReady(true);
  }, [engine.isPlaying, engine.duration, audioReady]);
  useEffect(() => {
    const t = window.setTimeout(() => setAudioReady(true), 6000);
    return () => window.clearTimeout(t);
  }, []);
  const showOverlay = isLoading || !audioReady;

  // Audio unavailable detection
  const [showUnavailableModal, setShowUnavailableModal] = useState(!track.audioUrl);
  useEffect(() => {
    if (!track.audioUrl) { setShowUnavailableModal(true); return; }
    setShowUnavailableModal(false);
  }, [track.audioUrl]);
  // Hide modal immediately when playback starts (e.g. after a slow-network load)
  useEffect(() => {
    if (engine.isPlaying || engine.duration > 0) setShowUnavailableModal(false);
  }, [engine.isPlaying, engine.duration]);
  // Dedicated failure timer — decoupled from the 6s audioReady overlay timeout.
  // GUIDED tracks can take 8-15s to buffer on mobile networks, so using audioReady
  // as a proxy for failure produced false positives (modal during normal loading).
  // A ref avoids stale-closure issues when reading engine state inside setTimeout.
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

  // Show UI whenever play state changes (pause brings controls back)
  useEffect(() => {
    setIsUIVisible(true);
  }, [engine.isPlaying]);

  useEffect(() => {
    return () => {
      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    };
  }, []);

  const debouncedSeekBy = useCallback((delta: number) => {
    if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = setTimeout(() => {
      engine.seekBy(delta);
      seekDebounceRef.current = null;
    }, 100);
  }, [engine]);

  const handleInteraction = () => {
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
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Handle seek drag — visual feedback via dragPercent during move, single seekTo() on drag end.
  // Avoids flooding the native bridge and prevents iOS snap-back from stale position updates.
  const handleSeekDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent default touch behavior
    setIsDraggingSeek(true);
    engine.beginUserSeek();
    triggerHaptic('light');
    console.log('[GuidedPlayerView] seek drag start', { currentTime: engine.currentTime, duration: engine.duration });

    // Mark as touch event if it's a touch
    if ('touches' in e.nativeEvent) {
      wasTouchEventRef.current = true;
    }

    let pendingSeekTime = engine.currentTime;

    const updateSeekVisual = (clientX: number) => {
      if (!seekSliderRef.current || !engine.duration || engine.duration <= 0) return;
      const rect = seekSliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percent * engine.duration;
      if (isNaN(newTime) || !isFinite(newTime)) return;
      pendingSeekTime = newTime;
      setDragPercent(percent * 100);
      // No engine.seekTo/seekBy here — avoids flooding native bridge and stale snap-back on iOS
    };

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault(); // Prevent scrolling while dragging
      const clientX = 'touches' in moveEvent && moveEvent.touches.length > 0
        ? moveEvent.touches[0].clientX
        : 'changedTouches' in moveEvent && moveEvent.changedTouches.length > 0
        ? moveEvent.changedTouches[0].clientX
        : (moveEvent as MouseEvent).clientX;
      updateSeekVisual(clientX);
    };

    const initialX = 'touches' in e.nativeEvent && e.nativeEvent.touches.length > 0
      ? e.nativeEvent.touches[0].clientX
      : e.clientX;
    updateSeekVisual(initialX);

    const handleEnd = () => {
      console.log('[GuidedPlayerView] seek drag end', { pendingSeekTime });
      engine.seekTo(pendingSeekTime);
      setIsDraggingSeek(false);
      setDragPercent(null);
      triggerHaptic('light');
      setTimeout(() => { wasTouchEventRef.current = false; }, 300);
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
      {/* Loading overlay — wait for both video AND audio */}
      <VideoLoadingOverlay show={showOverlay} message="loading scene..." />

      {showUnavailableModal && (
        <AudioUnavailableModal trackTitle={track.title} variant="guided" onRetry={track.audioUrl ? handleRetry : undefined} />
      )}

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
        @keyframes breathe-cycle {
          0% { transform: scale(0.55); opacity: 0.5; }
          40% { transform: scale(1); opacity: 0.85; }
          100% { transform: scale(0.55); opacity: 0.5; }
        }
        .animate-breathe-guide {
          animation: breathe-cycle 15s ease-in-out infinite;
        }
      `}</style>
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={videoUrl || VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={onLoadedData}
        onError={onError}
        onCanPlay={onLoadedData}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />

      {/* Breathing guide overlay - 4s inhale, 4s exhale cycle */}
      {showBreathingGuide && (
        <div 
          className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div className="w-48 h-48 rounded-full border-2 border-white/40 animate-breathe-guide" />
        </div>
      )}
      
      {/* Top Controls - Back Button and Volume */}
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

        {/* Volume Control + Breathing guide toggle */}
        <div className="flex items-center gap-3">
          {/* Breathing guide toggle - min 44pt for accessibility */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              setShowBreathingGuide((v) => !v);
            }}
            className={`flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 rounded-full text-xs font-medium transition-colors ${showBreathingGuide ? 'bg-white/20 text-white' : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white'} backdrop-blur-md border border-white/20`}
            aria-label={showBreathingGuide ? 'Hide breathing guide' : 'Show breathing guide'}
            title={showBreathingGuide ? 'Hide breathing guide' : 'Show breathing guide'}
          >
            <Wind size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('light');
              engine.toggleMute();
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
            className="relative h-1 w-32 bg-white/10 rounded-full cursor-pointer touch-manipulation group"
            onMouseDown={handleVolumeDrag}
            onTouchStart={handleVolumeDrag}
          >
            <div 
              className="absolute left-0 top-0 h-full bg-white/80 rounded-full transition-all"
              style={{ 
                width: `${engine.isMuted ? 0 : engine.volume * 100}%`,
                transition: isDraggingVolume ? 'none' : 'width 0.1s ease-out'
              }}
            />
            {/* Volume indicator dot */}
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

      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-[1500ms] ${!engine.isPlaying ? 'opacity-100' : (isUIVisible ? 'opacity-100' : 'opacity-0')}`} style={{ paddingBottom: engine.isPlaying ? '200px' : '2rem' }}>
        <div className="text-xs font-bold tracking-[0.45em] uppercase opacity-70 mb-4 text-brand-gold">Guided Meditation</div>
        <h1 className="text-5xl font-serif font-bold drop-shadow-lg leading-tight">{track.title}</h1>
      </div>

      {/* Bottom Controls - Always visible, fade after 12s when playing */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-20 px-8 pb-8 transition-opacity duration-[1500ms] ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          pointerEvents: isUIVisible ? 'auto' : 'none',
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, transparent 100%)',
          borderBottom: 'none',
          marginBottom: 0,
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

        {/* Seek Slider - min 44pt touch target; no onClick (double-fires on iOS) — drag handlers cover taps */}
        <div 
          ref={seekSliderRef}
          className="relative flex items-center justify-center w-full mb-6 cursor-pointer touch-manipulation group min-h-[44px] py-5 -my-2"
          onMouseDown={handleSeekDrag}
          onTouchStart={handleSeekDrag}
        >
          <div className="relative w-full h-1.5 bg-white/10 rounded-full">
            <div 
              className="absolute left-0 top-0 h-full bg-white/90 rounded-full transition-all pointer-events-none"
              style={{ 
                width: `${isDraggingSeek && dragPercent !== null ? dragPercent : engine.progress}%`,
                transition: isDraggingSeek ? 'none' : 'width 0.1s ease-out'
              }}
            />
            {/* Seek indicator dot */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ 
                left: `${isDraggingSeek && dragPercent !== null ? dragPercent : engine.progress}%`,
                transform: `translateX(-50%) translateY(-50%)`,
                transition: isDraggingSeek ? 'none' : 'left 0.1s ease-out, opacity 0.2s'
              }}
            />
          </div>
        </div>

        {/* Play Controls Row - 72pt play/pause, 48pt skip for thumb reach */}
        <div className="flex justify-center items-center gap-4 mb-4">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              triggerHaptic('light');
              debouncedSeekBy(-15); 
            }}
            className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors active:scale-95 rounded-full hover:bg-white/10"
            aria-label="Skip back 15 seconds"
          >
            <RotateCcw size={24} />
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              triggerHaptic('medium');
              engine.togglePlay(); 
            }}
            className="relative w-[72px] h-[72px] min-w-[72px] min-h-[72px] flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition-all duration-300 border-2 border-white/20 shadow-xl shadow-white/10 active:scale-95 group"
            style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
            aria-label={engine.isPlaying ? 'Pause' : 'Play'}
          >
            <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {engine.isPlaying ? (
              <Pause size={28} className="relative z-10 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
            ) : (
              <Play size={28} className="relative z-10 text-white group-hover:scale-110 transition-transform duration-300 ml-1" strokeWidth={2.5} fill="white" />
            )}
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              triggerHaptic('light');
              debouncedSeekBy(15); 
            }}
            className="min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors scale-x-[-1] active:scale-95 rounded-full hover:bg-white/10"
            aria-label="Skip forward 15 seconds"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
