
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ChevronLeft, CloudRain, Activity, Timer,
  X, Disc, Waves, Wind, Flame, Bell, Zap,
  Moon, Volume2, VolumeX, ChevronUp, ChevronDown,
  Play, Pause
} from 'lucide-react';
import { AudioEngine } from '../../hooks/useAudioEngine';
import { AudioTrack } from '../../types';
import { useNavigate } from 'react-router-dom';
import { triggerHaptic } from '../../utils/hapticFeedback';
import { nativeAudioService } from '../../services/nativeAudioService';

const MandalaVisual = ({ isPlaying, isMinimal, onPlayPause }: { isPlaying: boolean; isMinimal: boolean; onPlayPause: () => void }) => (
    <div 
      className={`relative w-72 h-72 flex items-center justify-center transition-all duration-[1500ms] ease-in-out ${isMinimal ? 'scale-110' : 'scale-100'}`}
    >
        {/* Ambient Glows */}
        <div className="absolute inset-0 rounded-full bg-brand-lavender/5 blur-[80px] animate-pulse-slow"></div>
        <div className="absolute inset-8 rounded-full border border-white/5 animate-ping-slow opacity-10"></div>
        
        {/* Mandala SVG */}
        <div className={`relative z-10 w-full h-full transition-transform duration-[3000ms] ${isPlaying ? 'animate-[spin_120s_linear_infinite]' : 'scale-95 opacity-40'}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(196,191,224,0.2)]">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <ellipse key={deg} cx="50" cy="50" rx="15" ry="40" transform={`rotate(${deg} 50 50)`} fill="none" stroke="rgba(196,191,224,0.2)" strokeWidth="0.5" />
                ))}
                {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => (
                    <ellipse key={deg} cx="50" cy="50" rx="12" ry="32" transform={`rotate(${deg} 50 50)`} fill="none" stroke="rgba(212,165,116,0.1)" strokeWidth="0.5" />
                ))}
                <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
            </svg>
        </div>

        {/* Center play/pause button — layered above mandala, dimmed to match palette */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('medium');
            onPlayPause();
          }}
          className="absolute inset-0 z-20 flex items-center justify-center touch-manipulation"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-[#070812]/60 backdrop-blur-sm border border-white/10 transition-colors duration-300"
            style={{
              boxShadow: '0 0 12px rgba(212,165,116,0.12), 0 0 24px rgba(196,191,224,0.06)',
            }}
          >
            {isPlaying ? (
              <Pause size={20} className="text-white/50" strokeWidth={2.5} fill="currentColor" />
            ) : (
              <Play size={20} className="text-white/50 ml-0.5" strokeWidth={2.5} fill="currentColor" />
            )}
          </div>
        </button>
    </div>
);

interface Props {
  engine: AudioEngine;
  track: AudioTrack;
}

export const SleepPlayerView: React.FC<Props> = ({ engine, track }) => {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<'EFFECTS' | 'FREQUENCIES' | 'TIMER' | 'VOLUME' | null>(null);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const fadeTimerRef = useRef<number | null>(null);
  
  // Custom Timer State
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(0);

  useEffect(() => {
    console.warn('[SleepPlayerView] Rendering with track:', track?.title);
  }, [track?.title]);

  // Audio Layer asset IDs for NativeAudio (no longer need HTML audio elements)
  const layerAssetIdsRef = useRef<Set<string>>(new Set());
  // Incremented each time syncLayers fires — in-flight runs check this to self-cancel
  const syncVersionRef = useRef(0);

  const [effects, setEffects] = useState({
    rain: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/effects/rain1.mp3' },
    crickets: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/effects/crickets.mp3' },
    fire: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/effects/fire.mp3' },
    thunder: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/effects/thunder.mp3' },
    wind: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/effects/wind.mp3' },
  });

  const [frequencies, setFrequencies] = useState({
    delta: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/frequencies/Delta0.5V1.mp3' },
    theta: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/frequencies/ThetaV1.mp3' },
    white: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/frequencies/White%20Noise%20.mp3' },
    om: { vol: 0, muted: false, url: 'https://storage.googleapis.com/sleepmusic/frequencies/OM.mp3' },
  });

  const effectOptions = useMemo(() => ([
    { id: 'rain' as const, label: 'Rain Fall', statusLabel: 'Rain', icon: CloudRain },
    { id: 'crickets' as const, label: 'Night Crickets', statusLabel: 'Crickets', icon: Wind },
    { id: 'fire' as const, label: 'Warm Fire', statusLabel: 'Fire', icon: Flame },
    { id: 'thunder' as const, label: 'Thunder', statusLabel: 'Thunder', icon: Zap },
    { id: 'wind' as const, label: 'Soft Wind', statusLabel: 'Wind', icon: Wind },
  ]), []);

  const frequencyOptions = useMemo(() => ([
    { id: 'delta' as const, label: 'Delta Wave', statusLabel: 'Delta Wave', icon: Disc },
    { id: 'theta' as const, label: 'Theta Wave', statusLabel: 'Theta Wave', icon: Waves },
    { id: 'white' as const, label: 'White Noise', statusLabel: 'White Noise', icon: Wind },
    { id: 'om' as const, label: 'OM Chant', statusLabel: 'OM Chant', icon: Activity },
  ]), []);

  const activeLayerLabels = useMemo(() => {
    const activeEffects = effectOptions
      .filter((opt) => effects[opt.id].vol > 0 && !effects[opt.id].muted)
      .map((opt) => opt.statusLabel);
    const activeFrequencies = frequencyOptions
      .filter((opt) => frequencies[opt.id].vol > 0 && !frequencies[opt.id].muted)
      .map((opt) => opt.statusLabel);

    return [...activeEffects, ...activeFrequencies];
  }, [effectOptions, frequencyOptions, effects, frequencies]);

  const hasActiveLayers = activeLayerLabels.length > 0;
  const activeLayersSummary = useMemo(() => {
    if (!hasActiveLayers) return 'Ambient Mix Active';
    if (activeLayerLabels.length === 1) return `${activeLayerLabels[0]} active`;
    if (activeLayerLabels.length === 2) return `${activeLayerLabels[0]} + ${activeLayerLabels[1]} active`;
    return `${activeLayerLabels[0]} + ${activeLayerLabels[1]} +${activeLayerLabels.length - 2} active`;
  }, [hasActiveLayers, activeLayerLabels]);

  // Initialize and Sync Audio Layers with NativeAudio
  useEffect(() => {
    // Each run gets a unique version; stale runs self-cancel when they see a newer version.
    const version = ++syncVersionRef.current;

    const syncLayers = async () => {
      const allLayers = { ...effects, ...frequencies };

      for (const [id, config] of Object.entries(allLayers) as [string, { vol: number; muted: boolean; url: string }][]) {
        // Abort if a newer syncLayers run has started
        if (version !== syncVersionRef.current) break;

        const assetId = `layer_${id}`;
        const isActive = config.vol > 0 && !config.muted;
        const masterVol = engine.isMuted ? 0 : engine.volume;
        const layerVolume = config.muted ? 0 : (config.vol / 100) * masterVol;
        const shouldPlay = engine.isPlaying && isActive;

        console.log('[LayerSync]', {
          id, isActive, vol: config.vol, muted: config.muted,
          masterVol, layerVolume, shouldPlay,
          engineIsPlaying: engine.isPlaying,
          hasAsset: layerAssetIdsRef.current.has(assetId),
        });

        // Preload when active and not yet loaded — per-layer catch so one failure doesn't block others
        if (!layerAssetIdsRef.current.has(assetId) && isActive) {
          try {
            console.log(`[LayerSync] Preloading: ${assetId}`);
            await nativeAudioService.preload(assetId, config.url, {
              volume: layerVolume,
              loop: true,
              ignoreSilent: true,
            });
            layerAssetIdsRef.current.add(assetId);
          } catch (e) {
            console.error(`[LayerSync] Preload failed for ${assetId}:`, e);
            continue; // skip this layer, don't block the rest
          }
        }

        if (!layerAssetIdsRef.current.has(assetId)) continue;
        if (version !== syncVersionRef.current) break;

        const isCurrentlyPlaying = nativeAudioService.isPlaying(assetId);

        if (shouldPlay && !isCurrentlyPlaying) {
          console.log(`[LayerSync] → play ${assetId} vol=${layerVolume}`);
          try {
            await nativeAudioService.play(assetId);
            await nativeAudioService.setVolume(assetId, layerVolume);
          } catch (e) {
            console.error(`[LayerSync] play failed for ${assetId}:`, e);
          }
        } else if (!shouldPlay && isCurrentlyPlaying) {
          console.log(`[LayerSync] → pause ${assetId}`);
          try {
            await nativeAudioService.pause(assetId);
          } catch (e) {
            console.error(`[LayerSync] pause failed for ${assetId}:`, e);
          }
          // Always silence even if pause threw — guarantees the layer is inaudible
          await nativeAudioService.setVolume(assetId, 0).catch(() => {});
        } else {
          // Already in the right play/pause state — just sync volume
          await nativeAudioService.setVolume(assetId, layerVolume).catch(() => {});
        }
      }
    };

    syncLayers().catch((e) => console.error('[LayerSync] unexpected error:', e));
  }, [engine.isPlaying, engine.volume, engine.isMuted, effects, frequencies]);

  // Global Audio Cleanup
  useEffect(() => {
    return () => {
      // Cleanup all NativeAudio layers
      const cleanup = async () => {
        for (const assetId of layerAssetIdsRef.current) {
          await nativeAudioService.unload(assetId);
        }
        layerAssetIdsRef.current.clear();
      };
      void cleanup();
    };
  }, []);

  // Auto-fade logic
  const startFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    if (engine.isPlaying && !activeModal) {
      fadeTimerRef.current = window.setTimeout(() => {
        setIsUIVisible(false);
      }, 12000);
    }
  }, [engine.isPlaying, activeModal]);

  useEffect(() => {
    if (isUIVisible) {
      startFadeTimer();
    }
    return () => { if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current); };
  }, [isUIVisible, startFadeTimer]);

  const handleInteraction = (e?: React.MouseEvent) => {
    // If clicking on a button or interactive element, don't toggle play/pause
    const target = e?.target as HTMLElement;
    if (target && (target.closest('button') || target.closest('input') || target.closest('[role="button"]'))) {
      // Just show UI if it's hidden, but don't toggle play/pause
      if (!isUIVisible) {
        setIsUIVisible(true);
      } else {
        startFadeTimer();
      }
      return;
    }

    // Toggle play/pause when clicking anywhere on the screen
    engine.togglePlay();
    
    // Show UI if hidden, or restart fade timer if visible
    if (!isUIVisible) {
      setIsUIVisible(true);
    } else {
      startFadeTimer();
    }
  };

  const updateEffect = (id: keyof typeof effects, field: 'vol' | 'muted', value: any) => {
    setEffects(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const updateFreq = (id: keyof typeof frequencies, field: 'vol' | 'muted', value: any) => {
    setFrequencies(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSetCustomTimer = () => {
    const totalMinutes = customHours * 60 + customMinutes;
    if (totalMinutes > 0) {
      triggerHaptic('medium');
      engine.sleepTimer.setTimer(totalMinutes);
      setActiveModal(null);
      setShowCustomInput(false);
      setCustomHours(0);
      setCustomMinutes(0);
    }
  };

  const adjustTime = (type: 'hours' | 'minutes', delta: number) => {
    triggerHaptic('light');
    if (type === 'hours') {
      setCustomHours(prev => Math.max(0, Math.min(23, prev + delta)));
    } else {
      setCustomMinutes(prev => {
        const newValue = prev + delta;
        if (newValue < 0) {
          // If minutes go negative, decrease hours
          if (customHours > 0) {
            setCustomHours(prevHours => prevHours - 1);
            return 59;
          }
          return 0;
        }
        if (newValue > 59) {
          // If minutes exceed 59, increase hours
          if (customHours < 23) {
            setCustomHours(prevHours => prevHours + 1);
            return 0;
          }
          return 59;
        }
        return newValue;
      });
    }
  };

  const getTotalDurationText = () => {
    const totalMinutes = customHours * 60 + customMinutes;
    if (totalMinutes === 0) return '0 minutes';
    if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  };

  return (
    <div 
      className="fixed inset-0 w-full flex flex-col bg-[#070812] text-white overflow-hidden font-sans cursor-none sm:cursor-default"
      onClick={handleInteraction}
    >
      {/* Header */}
      <div 
        className={`px-6 pb-6 flex items-center justify-between z-20 relative transition-opacity duration-[1500ms] ${isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); navigate('/sleep-music'); }} 
          className="relative p-3.5 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all duration-300 border-2 border-white/20 shadow-xl shadow-white/10 active:scale-95 group"
          style={{
            boxShadow: '0 4px 20px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <ChevronLeft size={24} className="relative z-10 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
        </button>
        <div className="text-center">
          <h1 className="text-[10px] font-bold tracking-[0.4em] uppercase text-brand-gold/80 mb-1">Now Playing</h1>
          <p className="text-xs font-bold tracking-widest text-white/30 uppercase">SleepScape</p>
        </div>
        <div className="w-14"></div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 px-8">
        <div className="mb-12">
            <MandalaVisual isPlaying={engine.isPlaying} isMinimal={!isUIVisible} onPlayPause={() => engine.togglePlay()} />
        </div>
        
        <div className={`text-center space-y-4 transition-opacity duration-[1500ms] ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-4 min-h-[72px]">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight px-4">{track.title}</h2>
          </div>
          <div className="flex items-center justify-center">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm transition-all duration-300 max-w-[92vw] sm:max-w-md ${
                hasActiveLayers
                  ? 'bg-brand-gold/10 border-brand-gold/30 shadow-[0_0_22px_rgba(212,165,116,0.18)]'
                  : 'bg-white/[0.04] border-white/10'
              }`}
            >
              {hasActiveLayers ? (
                <Activity size={14} className="text-brand-gold/80" />
              ) : (
                <Moon size={14} className="text-brand-lavender/50 fill-current" />
              )}
              <span
                title={activeLayersSummary}
                className={`text-[10px] font-bold uppercase tracking-[0.24em] ${
                  hasActiveLayers ? 'text-brand-gold/90' : 'text-brand-lavender/40'
                } truncate`}
              >
                {activeLayersSummary}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DEBUG PANEL — remove before release */}
      {true && (
        <div className="px-4 pb-2 z-20 relative flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <button
            className="text-[9px] font-bold uppercase px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300"
            onClick={async () => {
              console.log('=== [DEBUG] Layer state dump ===');
              console.log('engine.isPlaying:', engine.isPlaying, '| engine.volume:', engine.volume, '| engine.isMuted:', engine.isMuted);
              console.log('effects:', JSON.stringify(effects));
              console.log('frequencies:', JSON.stringify(frequencies));
              console.log('loaded assetIds:', [...layerAssetIdsRef.current]);
              nativeAudioService.debugDumpLayers();
            }}
          >
            Dump State
          </button>
          <button
            className="text-[9px] font-bold uppercase px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300"
            onClick={async () => {
              console.log('=== [DEBUG] Direct rain test ===');
              try {
                await nativeAudioService.preload('debug_rain', 'https://storage.googleapis.com/sleepmusic/effects/rain1.mp3', {
                  volume: 0.7, loop: true, ignoreSilent: true,
                });
                await nativeAudioService.play('debug_rain');
                console.log('[DEBUG] rain preload+play OK — if silent, plugin or audio session is broken');
              } catch (e) {
                console.error('[DEBUG] rain direct test FAILED:', e);
              }
            }}
          >
            Test Rain
          </button>
          <button
            className="text-[9px] font-bold uppercase px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300"
            onClick={async () => {
              console.log('=== [DEBUG] Direct delta test ===');
              try {
                await nativeAudioService.preload('debug_delta', 'https://storage.googleapis.com/sleepmusic/frequencies/Delta0.5V1.mp3', {
                  volume: 0.7, loop: true, ignoreSilent: true,
                });
                await nativeAudioService.play('debug_delta');
                console.log('[DEBUG] delta preload+play OK');
              } catch (e) {
                console.error('[DEBUG] delta direct test FAILED:', e);
              }
            }}
          >
            Test Delta
          </button>
          <button
            className="text-[9px] font-bold uppercase px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300"
            onClick={async () => {
              console.log('[DEBUG] Stopping debug assets');
              await nativeAudioService.unload('debug_rain').catch(() => {});
              await nativeAudioService.unload('debug_delta').catch(() => {});
            }}
          >
            Stop Debug
          </button>
        </div>
      )}

      {/* Control Navigation Bar */}
      <div
        className={`bg-gradient-to-t from-black via-black/80 to-transparent px-8 z-20 relative transition-opacity duration-[1500ms] ${isUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))', paddingTop: '2rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          <button onClick={(e) => { e.stopPropagation(); setActiveModal('EFFECTS'); }} className={`flex-1 bg-white/5 border border-white/10 py-5 rounded-[24px] flex flex-col items-center gap-2 transition-all hover:bg-white/10 active:scale-95 ${activeModal === 'EFFECTS' ? 'bg-white/20' : ''}`}>
            <CloudRain size={20} className="text-brand-lavender/80" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Effects</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setActiveModal('FREQUENCIES'); }} className={`flex-1 bg-white/5 border border-white/10 py-5 rounded-[24px] flex flex-col items-center gap-2 transition-all hover:bg-white/10 active:scale-95 ${activeModal === 'FREQUENCIES' ? 'bg-white/20' : ''}`}>
            <Activity size={20} className="text-brand-gold/80" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Healing</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setActiveModal('VOLUME'); }} className={`flex-1 bg-white/5 border border-white/10 py-5 rounded-[24px] flex flex-col items-center gap-2 transition-all hover:bg-white/10 active:scale-95 ${activeModal === 'VOLUME' ? 'bg-white/20' : ''}`}>
            {engine.isMuted ? <VolumeX size={20} className="text-white/60" /> : <Volume2 size={20} className="text-white/80" />}
            <span className="text-[9px] font-bold uppercase tracking-widest">Volume</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setActiveModal('TIMER'); }} className={`flex-1 border py-5 rounded-[24px] flex flex-col items-center gap-2 transition-all hover:bg-white/10 active:scale-95 ${engine.sleepTimer.isActive ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-[0_0_20px_rgba(212,165,116,0.1)]' : 'bg-white/5 border-white/10'}`}>
            <Timer size={20} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{engine.sleepTimer.isActive ? `${Math.ceil(engine.sleepTimer.secondsRemaining! / 60)}m` : 'Timer'}</span>
          </button>
        </div>
      </div>

      {/* EFFECTS MODAL */}
      {activeModal === 'EFFECTS' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)} />
            <div className="relative w-full max-w-sm bg-[#1A1F28] border border-white/10 rounded-[40px] p-8 shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-serif font-bold text-brand-lavender">Ambient Layers</h3>
                    <button 
                        onClick={() => {
                            triggerHaptic('light');
                            setActiveModal(null);
                        }} 
                        className="relative w-12 h-12 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors duration-150 active:scale-95 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                        aria-label="Close"
                    >
                        {/* Glow circle effect */}
                        <div className="absolute inset-0 rounded-full bg-white/5 blur-xl animate-pulse-slow"></div>
                        <X size={24} className="text-white relative z-10" />
                    </button>
                </div>
                <div className="space-y-8">
                    {effectOptions.map((eff) => (
                        <div key={eff.id} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <eff.icon size={16} className="text-brand-lavender/60" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">{eff.label}</span>
                                </div>
                                <button 
                                    onClick={() => updateEffect(eff.id as any, 'muted', !effects[eff.id as keyof typeof effects].muted)} 
                                    className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${effects[eff.id as keyof typeof effects].muted ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-brand-lavender/10 text-brand-lavender border-brand-lavender/20'}`}
                                >
                                    {effects[eff.id as keyof typeof effects].muted ? 'OFF' : 'ON'}
                                </button>
                            </div>
                            <div className="relative h-1 w-full bg-white/5 rounded-full">
                                <div className="h-full bg-brand-lavender rounded-full" style={{ width: `${effects[eff.id as keyof typeof effects].vol}%` }} />
                                <input 
                                    type="range" min="0" max="100" 
                                    value={effects[eff.id as keyof typeof effects].vol} 
                                    onChange={(e) => updateEffect(eff.id as any, 'vol', parseInt(e.target.value))} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => {
                    triggerHaptic('success');
                    setActiveModal(null);
                }} className="w-full mt-10 py-4 bg-brand-lavender text-white rounded-[20px] font-bold text-sm">Save Effects</button>
            </div>
        </div>
      )}

      {/* FREQUENCIES MODAL */}
      {activeModal === 'FREQUENCIES' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)} />
            <div className="relative w-full max-w-sm bg-[#1A1F28] border border-white/10 rounded-[40px] p-8 shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-serif font-bold text-brand-gold">Sound Healing</h3>
                    <button 
                        onClick={() => {
                            triggerHaptic('light');
                            setActiveModal(null);
                        }} 
                        className="relative w-12 h-12 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors duration-150 active:scale-95 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                        aria-label="Close"
                    >
                        {/* Glow circle effect */}
                        <div className="absolute inset-0 rounded-full bg-white/5 blur-xl animate-pulse-slow"></div>
                        <X size={24} className="text-white relative z-10" />
                    </button>
                </div>
                <div className="space-y-8">
                    {frequencyOptions.map((freq) => (
                        <div key={freq.id} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <freq.icon size={16} className="text-brand-gold/60" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">{freq.label}</span>
                                </div>
                                <button 
                                    onClick={() => updateFreq(freq.id as any, 'muted', !frequencies[freq.id as keyof typeof frequencies].muted)} 
                                    className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${frequencies[freq.id as keyof typeof frequencies].muted ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-brand-gold/10 text-brand-gold border-brand-gold/20'}`}
                                >
                                    {frequencies[freq.id as keyof typeof frequencies].muted ? 'OFF' : 'ON'}
                                </button>
                            </div>
                            <div className="relative h-1 w-full bg-white/5 rounded-full">
                                <div className="h-full bg-brand-gold rounded-full" style={{ width: `${frequencies[freq.id as keyof typeof frequencies].vol}%` }} />
                                <input 
                                    type="range" min="0" max="100" 
                                    value={frequencies[freq.id as keyof typeof frequencies].vol} 
                                    onChange={(e) => updateFreq(freq.id as any, 'vol', parseInt(e.target.value))} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => {
                    triggerHaptic('success');
                    setActiveModal(null);
                }} className="w-full mt-10 py-4 bg-brand-gold text-brand-dark rounded-[20px] font-bold text-sm">Save Frequencies</button>
            </div>
        </div>
      )}

      {/* VOLUME MODAL */}
      {activeModal === 'VOLUME' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)} />
          <div className="relative w-full max-w-sm bg-[#1A1F28] border border-white/10 rounded-[40px] p-8 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-serif font-bold text-white">Volume Control</h3>
              <button 
                onClick={() => {
                    triggerHaptic('light');
                    setActiveModal(null);
                }} 
                className="relative w-12 h-12 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors duration-150 active:scale-95 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                aria-label="Close"
              >
                {/* Glow circle effect */}
                <div className="absolute inset-0 rounded-full bg-white/5 blur-xl animate-pulse-slow"></div>
                <X size={24} className="text-white relative z-10" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {engine.isMuted ? (
                      <VolumeX size={20} className="text-white/60" />
                    ) : (
                      <Volume2 size={20} className="text-white/80" />
                    )}
                    <span className="text-[11px] font-bold uppercase tracking-widest">Master Volume</span>
                  </div>
                  <button 
                    onClick={() => engine.toggleMute()} 
                    className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all ${engine.isMuted ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/10 text-white border-white/20'}`}
                  >
                    {engine.isMuted ? 'MUTED' : 'ON'}
                  </button>
                </div>
               
                <>
                <div className="relative h-2 w-full bg-white/5 rounded-full">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${engine.isMuted ? 0 : engine.volume * 100}%` }} />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={engine.isMuted ? 0 : engine.volume * 100}
                    onChange={(e) => {
                      const newVolume = parseInt(e.target.value) / 100;
                      engine.setVolume(newVolume);
                      // No need to force update - ref-driven approach handles it
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="text-center text-[10px] text-white/40 font-bold uppercase tracking-widest">
                  {engine.isMuted ? 'Muted' : `${Math.round(engine.volume * 100)}%`}
                </div>
                </>
                
              </div>
            </div>
            <button onClick={() => {
                triggerHaptic('success');
                // No need to force sync - ref-driven approach keeps audio in sync
                setActiveModal(null);
            }} className="w-full mt-10 py-4 bg-white text-brand-dark rounded-[20px] font-bold text-sm">Done</button>
            </div>
        </div>
      )}

      {/* TIMER MODAL */}
      {activeModal === 'TIMER' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setActiveModal(null)} />
          <div className="relative w-full max-w-sm bg-[#1A1F28] border border-white/10 rounded-[40px] p-8 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-serif font-bold text-center flex-1">Sleep Timer</h3>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setActiveModal(null);
                }} 
                className="relative w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors duration-150 active:scale-95 backdrop-blur-md border border-white/10"
                aria-label="Close"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            
            {showCustomInput ? (
                <div className="animate-fade-in space-y-6">
                    {/* Hours and Minutes Controls */}
                    <div className="flex gap-4">
                        {/* Hours Control */}
                        <div className="flex-1">
                            <div className="relative bg-white/5 border border-white/10 rounded-[20px] overflow-hidden">
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => adjustTime('hours', 1)}
                                        className="flex-1 py-3 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation"
                                        style={{ minHeight: '56px' }}
                                    >
                                        <ChevronUp size={24} className="text-white/80" />
                                    </button>
                                    <div className="py-4 px-2 text-center">
                                        <div className="text-3xl font-bold text-white mb-1">{customHours}</div>
                                        <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Hours</div>
                                    </div>
                                    <button
                                        onClick={() => adjustTime('hours', -1)}
                                        className="flex-1 py-3 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation"
                                        style={{ minHeight: '56px' }}
                                    >
                                        <ChevronDown size={24} className="text-white/80" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Minutes Control */}
                        <div className="flex-1">
                            <div className="relative bg-white/5 border border-white/10 rounded-[20px] overflow-hidden">
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => adjustTime('minutes', 1)}
                                        className="flex-1 py-3 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation"
                                        style={{ minHeight: '56px' }}
                                    >
                                        <ChevronUp size={24} className="text-white/80" />
                                    </button>
                                    <div className="py-4 px-2 text-center">
                                        <div className="text-3xl font-bold text-white mb-1">{customMinutes.toString().padStart(2, '0')}</div>
                                        <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Minutes</div>
                                    </div>
                                    <button
                                        onClick={() => adjustTime('minutes', -1)}
                                        className="flex-1 py-3 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation"
                                        style={{ minHeight: '56px' }}
                                    >
                                        <ChevronDown size={24} className="text-white/80" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Duration Display */}
                    <div className="text-center py-3 px-4 bg-white/5 rounded-[16px] border border-white/10">
                        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Total Duration</div>
                        <div className="text-lg font-bold text-brand-gold">{getTotalDurationText()}</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                triggerHaptic('light');
                                setShowCustomInput(false);
                                setCustomHours(0);
                                setCustomMinutes(0);
                            }} 
                            className="flex-1 py-4 bg-white/5 rounded-[20px] font-bold text-sm text-white hover:bg-white/10 transition-colors active:scale-95"
                        >
                            Back
                        </button>
                        <button 
                            onClick={handleSetCustomTimer}
                            disabled={customHours === 0 && customMinutes === 0}
                            className="flex-1 py-4 bg-brand-gold text-brand-dark rounded-[20px] font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-gold/90 transition-colors active:scale-95"
                        >
                            Set Timer
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {[15, 30, 45, 60].map(m => (
                            <button 
                                key={m} 
                                onClick={() => { 
                                  triggerHaptic('medium');
                                  engine.sleepTimer.setTimer(m); 
                                  setActiveModal(null); 
                                }} 
                                className={`py-4 bg-white/5 border rounded-[20px] text-sm font-bold transition-all active:scale-95 ${
                                  engine.sleepTimer.isActive && engine.sleepTimer.secondsRemaining === m * 60 
                                    ? 'bg-brand-gold/20 border-brand-gold text-brand-gold shadow-[0_0_20px_rgba(212,165,116,0.2)]' 
                                    : 'border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {m} Minutes
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => {
                          triggerHaptic('light');
                          setShowCustomInput(true);
                          setCustomHours(0);
                          setCustomMinutes(0);
                        }}
                        className="w-full py-4 bg-white/5 border border-dashed border-white/20 rounded-[20px] text-sm font-bold mb-6 text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    >
                        Custom Duration...
                    </button>
                    {engine.sleepTimer.isActive && (
                        <button 
                            onClick={() => { 
                              triggerHaptic('medium');
                              engine.sleepTimer.setTimer(null); 
                              setActiveModal(null); 
                            }} 
                            className="w-full py-4 border border-red-500/20 text-red-400 rounded-[20px] text-sm font-bold mb-3 hover:bg-red-500/10 transition-colors active:scale-95"
                        >
                            Turn Off Timer
                        </button>
                    )}
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
