import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
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

export const MantraPlayerView: React.FC<Props> = ({ engine, track }) => {
  const navigate = useNavigate();

  console.log('[MantraPlayerView] binding', {
    fromTrackProp: track.id,
    fromEngine: (engine as any).trackId,
    isPlaying: engine.isPlaying,
    duration: engine.duration,
    progress: engine.progress,
  });

  const seekSliderRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUIVisible, setIsUIVisible] = useState(true);

  // Background video/image URL (can be customized per mantra or use default)
  const backgroundUrl = track.image || track.audioUrl || "";
  const isVideo = backgroundUrl.endsWith('.mp4') || backgroundUrl.endsWith('.webm') || backgroundUrl.endsWith('.mov');
  const isImage = backgroundUrl.endsWith('.jpg') || backgroundUrl.endsWith('.jpeg') || backgroundUrl.endsWith('.png') || backgroundUrl.endsWith('.webp');
  const DEFAULT_VIDEO = "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Music%20Players/MusicPlayer.GuidedMeditation.Mantra.mp4";

  // Only wait for a video when we actually render a video element:
  // - custom video background  → track that URL's load
  // - image background         → no video element rendered, pass null so hook is immediately "ready"
  // - no track media           → fall back to DEFAULT_VIDEO and track its load
  const videoUrlForHook = (isImage && backgroundUrl)
    ? null
    : (isVideo && backgroundUrl ? backgroundUrl : DEFAULT_VIDEO);
  const { videoUrl, isLoading, onLoadedData, onError } = useVideoLoadingCue(videoUrlForHook, 6000);

  // Track audio readiness separately so the loading overlay waits for both
  // video AND audio before dismissing — prevents thumbnail flash + silent player.
  // Triggers on isPlaying (audio running) OR duration > 0 (metadata loaded).
  const [audioReady, setAudioReady] = useState(false);
  useEffect(() => {
    if (!audioReady && (engine.isPlaying || engine.duration > 0)) {
      setAudioReady(true);
    }
  }, [engine.isPlaying, engine.duration, audioReady]);
  // Fallback: after 6 seconds always consider audio ready (network/load timeout)
  useEffect(() => {
    const t = window.setTimeout(() => setAudioReady(true), 6000);
    return () => window.clearTimeout(t);
  }, []);
  // Show overlay until BOTH video (or image) is considered ready AND audio has duration/is playing
  const showOverlay = isLoading || !audioReady;

  // ── Audio unavailable detection ──────────────────────────────────────────
  // Case 1: track has no audioUrl at all → show modal immediately.
  // Case 2: audioUrl present but the 6-second fallback fired with no playback
  //         detected (load failed silently on native) → show modal then too.
  const [showUnavailableModal, setShowUnavailableModal] = useState(!track.audioUrl);

  useEffect(() => {
    // Case 1: no audioUrl
    if (!track.audioUrl) {
      setShowUnavailableModal(true);
      return;
    }
    setShowUnavailableModal(false);
  }, [track.audioUrl]);

  // Dismiss if audio eventually starts (e.g. slow network recovers)
  useEffect(() => {
    if (engine.isPlaying || engine.duration > 0) setShowUnavailableModal(false);
  }, [engine.isPlaying, engine.duration]);
  // Dedicated failure timer — decoupled from the 6s audioReady overlay timeout.
  // API tracks can take 8-15s to buffer on mobile; using audioReady as a proxy
  // for failure produced false positives (modal during normal loading).
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

  const handleRetry = () => {
    window.location.reload();
  };
  // ─────────────────────────────────────────────────────────────────────────

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

  // Show UI when play state changes
  useEffect(() => {
    setIsUIVisible(true);
  }, [engine.isPlaying]);

  useEffect(() => {
    return () => {
      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    };
  }, []);

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

  const wasTouchEventRef = useRef(false);

  const debouncedSeekBy = useCallback((delta: number) => {
    if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = setTimeout(() => {
      engine.seekBy(delta);
      seekDebounceRef.current = null;
    }, 100);
  }, [engine]);

  // Handle seek drag — visual feedback via dragPercent during move, single seekTo() on drag end
  const handleSeekDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent default touch behavior
    setIsDraggingSeek(true);
    engine.beginUserSeek();
    triggerHaptic('light');

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
      // No engine.seekTo/seekBy here — avoids flooding native bridge and stale closure
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
      engine.seekTo(pendingSeekTime);
      setIsDraggingSeek(false);
      setDragPercent(null);
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

  // Get deity color for overlay
  const getDeityColor = () => {
    switch (track.deity) {
      case 'SHIVA':
        return 'from-indigo-900/40 via-purple-900/30 to-indigo-900/40';
      case 'HANUMAN':
        return 'from-orange-900/40 via-red-900/30 to-orange-900/40';
      case 'KRISHNA':
        return 'from-blue-900/40 via-cyan-900/30 to-blue-900/40';
      case 'DEVI':
        return 'from-pink-900/40 via-rose-900/30 to-pink-900/40';
      case 'GANESHA':
        return 'from-red-900/40 via-orange-900/30 to-red-900/40';
      default:
        return 'from-brand-gold/20 via-brand-gold/10 to-brand-gold/20';
    }
  };

  return (
    <div 
      className="fixed inset-0 w-full overflow-hidden bg-black text-white" 
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.volume-control') || target.closest('button')) return;
        // Background taps only show/hide UI — never toggle playback (same as ChakraPlayerView)
        handleInteraction();
      }}
    >
      {/* Loading overlay — visible until both video and audio are ready */}
      <VideoLoadingOverlay show={showOverlay} message="loading mantra..." zIndex={100} />

      {/* Background Video or Image */}
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
      {isVideo && backgroundUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={videoUrl || backgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={onLoadedData}
          onError={onError}
          onCanPlay={onLoadedData}
          style={{ opacity: showOverlay ? 0 : 1, transition: 'opacity 0.5s ease-in' }}
        />
      ) : isImage && backgroundUrl ? (
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundUrl})`, opacity: showOverlay ? 0 : 1, transition: 'opacity 0.5s ease-in' }}
        />
      ) : (
        // Fallback to default video
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={videoUrl || DEFAULT_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={onLoadedData}
          onError={onError}
          onCanPlay={onLoadedData}
          style={{ opacity: showOverlay ? 0 : 1, transition: 'opacity 0.5s ease-in' }}
        />
      )}
      
      {/* Gradient Overlay with Deity Color */}
      <div className={`absolute inset-0 bg-gradient-to-b ${getDeityColor()} from-black/60 via-transparent to-black/60`} />
      
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

        {/* Volume Control */}
        <div className="flex items-center gap-3">
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

      {/* Center Content */}
      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-[1500ms] ${!engine.isPlaying ? 'opacity-100' : (isUIVisible ? 'opacity-100' : 'opacity-0')}`} style={{ paddingTop: '120px', paddingBottom: engine.isPlaying ? '200px' : '2rem' }}>
        <div className="text-[10px] font-bold tracking-[0.35em] uppercase opacity-70 mb-3 text-brand-gold">
          {track.deity || 'Mantra'} • {track.benefit || 'Sacred Chant'}
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold drop-shadow-lg leading-tight mb-3">{track.title}</h1>
        {track.description && (
          <p className="text-white/80 text-sm sm:text-base max-w-2xl mb-8 drop-shadow-md">{track.description}</p>
        )}
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
              width: `${isDraggingSeek && dragPercent !== null ? dragPercent : engine.progress}%`,
              transition: isDraggingSeek ? 'none' : 'width 0.1s ease-out'
            }}
          />
          {/* Seek indicator dot */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ 
              left: `${isDraggingSeek && dragPercent !== null ? dragPercent : engine.progress}%`,
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

      {/* Audio unavailable modal — shown when audioUrl is missing or failed to load */}
      {showUnavailableModal && (
        <AudioUnavailableModal
          trackTitle={track.title}
          onRetry={track.audioUrl ? handleRetry : undefined}
        />
      )}
    </div>
  );
};

