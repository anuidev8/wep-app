
// Add React to the imports to resolve namespace issues
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Check, Sparkles, Clock, Play, SkipForward, Zap, Target, Heart, Layers, Infinity, Sliders, Pause, Info, Wind, Scale, Moon, Flame, RefreshCw, Music, X, Volume2, VolumeX, TrendingUp, RotateCw, Download, Share2, Lock } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { TechniqueIntroCard } from '../components/TechniqueIntroCard';
import { getTechniqueInfo } from '../data/techniques';
import { useApp } from '../context/AppContext';
import { saveMorningRitualResult } from '../services/sessionResultsService';
import { BreathingOrb } from '../components/BreathingOrb';
import { LastBreathPrompt } from '../components/LastBreathPrompt';
import { PatternTutorial } from '../components/PatternTutorial';
import { RelaxationTriangleVisual } from '../components/RelaxationTriangleTutorial';
import { BreathPhase, PATTERNS, PatternProgress, UserPreferences, BreathingPattern } from '../types';
import { useRestMusic } from '../hooks/useRestMusic';
import { restMusicService } from '../services/restMusicService';
import { downloadCertImage, downloadScreenshot, shareCertificate } from '../services/certificateService';
import { maybeSendBreathworkRecommendation } from '../services/breathRecommendationService';
import { getCachedVideoSrc } from '../services/videoCacheService';
// Specific videos for patterns (served via CDN / HTTP URLs)
const DEFAULT_VISUAL_GUIDE_URL = "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/TUMMOV1.mp4";

const PATTERN_VIDEOS: Record<string, string> = {
   CALM: "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/6%203%209%20breathing.m4v",
   BALANCE: "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/ALTERNAL_KUMBAKHA.mp4",
   BHASTRIKA: "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/BHASTRIKAv1.mp4",
   ENERGY: "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/BREATH_OF_FIRE.mp4",
   BHRAMARI: "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/Hummingbeebreathsound.m4v",
   OM_INTEGRATION: "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/Omvideoclue.m4v",
};

const getPatternVideo = (patternId: string) => PATTERN_VIDEOS[patternId] || DEFAULT_VISUAL_GUIDE_URL;

/**
 * PREPARE CUE CONFIGURATION
 * Technique-specific preparation instructions with optional mudra images
 */
interface PrepareCueConfig {
  line1: string;
  line2: string;
  imageUrl?: string;
  techniqueName: string;
}

const PREPARE_CUE_CONFIG: Record<string, PrepareCueConfig> = {
  ENERGY: {
    line1: 'Focus on strong, sharp exhales.',
    line2: 'Let the inhale happen automatically.',
    techniqueName: 'Breath of Fire',
  },
  BHASTRIKA: {
    line1: 'Active inhale. Active exhale.',
    line2: 'Keep the chest open and tall.',
    techniqueName: 'Bhastrika',
  },
  BALANCE: {
    line1: 'Form Vishnu Mudra.',
    line2: 'Close the right nostril with the thumb.',
    imageUrl:
      'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/VishnuMudra1.png',
    techniqueName: 'Alternate Nostril',
  },
  CALM: {
    line1: 'Inhale: belly first, then fill the lungs.',
    line2: 'Exhale: relax chest, gently draw belly in.',
    techniqueName: 'Diaphragmatic Breathing',
  },
  BHRAMARI: {
    line1: 'Come into 7 Doors Closing Mudra.',
    line2: 'Long inhale… exhale with a smooth hum.',
    imageUrl:
      'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/Bhramaripic1.png',
    techniqueName: 'Humming Bee',
  },
  OM_INTEGRATION: {
    line1: 'Close your eyes and soften the face.',
    line2: 'Feel "OM" vibration at the third eye.',
    techniqueName: 'OM Integration',
  },
  FOCUS: {
    line1: 'Breathe like a square: in… hold… out… hold.',
    line2: 'Keep each side steady and equal.',
    techniqueName: 'Box Breathing',
  },
  REST: {
    line1: 'Inhale 4… hold 7… exhale 8.',
    line2: 'Let the exhale be slow and quiet.',
    techniqueName: '4-7-8 Breathing',
  },
};

/**
 * Compute prepare cue duration based on text length and image presence
 * @param config Prepare cue configuration entry
 * @param maxDuration Optional cap (e.g., 8s if near session start)
 * @returns Duration in seconds (6-9, capped by maxDuration if provided)
 */
const computePrepareDurationSeconds = (config: PrepareCueConfig, maxDuration?: number): number => {
  const totalTextLength = (config.line1 + ' ' + config.line2).length;
  let baseDuration: number;

  if (totalTextLength <= 60) baseDuration = 6;
  else if (totalTextLength <= 95) baseDuration = 7;
  else if (totalTextLength <= 130) baseDuration = 8;
  else baseDuration = 9;

  // Add 1 second if image present, but cap at 9
  if (config.imageUrl) {
    baseDuration = Math.min(9, baseDuration + 1);
  }

  if (maxDuration !== undefined) {
    return Math.min(baseDuration, maxDuration);
  }

  return baseDuration;
};

/**
 * PREPARE CUE SCREEN COMPONENT
 * Replaces generic countdown with technique-specific preparation instructions
 */
interface PrepareCueScreenProps {
  patternId: string;
  duration: number;
  timeLeft: number;
  onComplete: () => void;
  onSkip?: () => void;
  isPaused: boolean;
  onPause: () => void;
  onExit: () => void;
}

const PrepareCueScreen: React.FC<PrepareCueScreenProps> = ({
  patternId,
  duration,
  timeLeft,
  onComplete,
  onSkip,
  isPaused,
  onPause,
  onExit,
}) => {
  const config = PREPARE_CUE_CONFIG[patternId];
  const progress = Math.max(0, Math.min(1, (duration - timeLeft) / duration));

  // Auto-complete if config missing
  useEffect(() => {
    if (!config && onComplete) {
      onComplete();
    }
  }, [config, onComplete]);

  if (!config) {
    return null;
  }

  return (
    <div className="h-[100dvh] w-full bg-[#1A4D5C] text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[#1A4D5C]" />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center w-full max-w-md relative z-10 px-8">
        <div className="flex flex-col items-center justify-center space-y-8 w-full px-4">
          {/* Label */}
          <div
            className="text-[18px] font-bold tracking-[3px] uppercase text-brand-gold/90 mb-2"
            style={{
              animation: 'fadeInSoft 0.6s ease-out forwards',
              animationDelay: '0s',
              opacity: 0,
            }}
          >
            PREPARE
          </div>

          {/* Technique name */}
          <div
            className="text-[32px] font-serif font-semibold text-white/95 tracking-wide"
            style={{
              animation: 'fadeInSoft 0.6s ease-out forwards',
              animationDelay: '0.1s',
              opacity: 0,
            }}
          >
            {config.techniqueName}
          </div>

          {/* Instruction lines */}
          <div className="flex flex-col items-center space-y-4 mt-4">
            <div
              className="text-2xl md:text-3xl font-serif font-light text-white/95 tracking-wide leading-[1.8] text-center px-4"
              style={{
                animation: 'fadeInSoft 0.6s ease-out forwards',
                animationDelay: '0.2s',
                opacity: 0,
              }}
            >
              {config.line1}
            </div>
            <div
              className="text-xl md:text-2xl font-serif font-light text-white/90 tracking-wide leading-[1.8] text-center px-4"
              style={{
                animation: 'fadeInSoft 0.6s ease-out forwards',
                animationDelay: '0.3s',
                opacity: 0,
              }}
            >
              {config.line2}
            </div>
          </div>

          {/* Mudra image (if present) */}
          {config.imageUrl && (
            <div
              className="mt-8 flex items-center justify-center"
              style={{
                animation: 'fadeInSoft 0.8s ease-out forwards',
                animationDelay: '0.8s',
                opacity: 0,
              }}
            >
              <img
                src={config.imageUrl}
                alt="Mudra"
                className="max-w-[70vw] max-h-[28vh] object-contain opacity-95 drop-shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="relative z-10 w-full max-w-md px-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-gold/60 transition-all ease-linear rounded-full"
            style={{
              width: `${progress * 100}%`,
              transitionDuration: '1s',
            }}
          />
        </div>
        {onSkip && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="mt-6 mb-4 px-6 py-3 rounded-full mx-auto block uppercase tracking-[0.25em] font-bold text-[11px] bg-brand-gold/10 border border-brand-gold/25 text-brand-gold/90 hover:bg-brand-gold/20 hover:text-brand-goldLight transition-all active:scale-[0.98]"
          >
            skip
          </button>
        )}
        <div className="mt-3 text-xs font-mono text-white/60 tracking-[0.2em] uppercase text-center">
          starting in {timeLeft}s
        </div>
      </div>

      {/* Fade animations */}
      <style>{`
        @keyframes fadeInSoft {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-brand-dark/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
          <h2 className="text-4xl font-serif font-bold mb-12 text-white">paused</h2>
          <div className="space-y-4 w-full max-w-xs">
            <button
              onClick={onPause}
              className="w-full py-4 bg-white text-brand-dark rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2"
            >
              <Play size={20} fill="currentColor" /> Resume Practice
            </button>
            <button
              onClick={onExit}
              className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/20 flex items-center justify-center gap-2"
            >
              <X size={20} /> Exit Practice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * PRANA LIQUID TIMER COMPONENT FOR MORNING RITUAL
 */
const PranaLiquidTimer = ({
  duration,
  isRunning,
  phase,
  cyclesCompleted,
}: {
  duration: number;
  isRunning: boolean;
  phase: BreathPhase;
  cyclesCompleted: number;
}) => {
  const [fill, setFill] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const isGolden = cyclesCompleted > 0 && cyclesCompleted % 6 === 0;

  useEffect(() => {
    if (!isRunning || phase === BreathPhase.IDLE) {
      setFill(0);
      setIsAnimating(false);
      return;
    }

    if (phase === BreathPhase.INHALE) {
      setFill(1);
      setIsAnimating(true);
    } else if (phase === BreathPhase.HOLD) {
      setFill(1);
      setIsAnimating(false);
    } else if (phase === BreathPhase.EXHALE) {
      setFill(0);
      setIsAnimating(true);
    } else if (phase === BreathPhase.HOLD_EMPTY) {
      setFill(0);
      setIsAnimating(false);
    }
  }, [phase, isRunning]);

  const getLiquidStyle = () => {
    if (isGolden)
      return {
        background: 'linear-gradient(to right, #FDE68A, #F59E0B, #EA580C)',
        shadow: 'rgba(251, 191, 36, 0.4)',
      };

    switch (phase) {
      case BreathPhase.INHALE:
        return {
          background: 'linear-gradient(to right, #A5F3FC, #7DD3FC, #38BDF8)',
          shadow: 'rgba(56, 189, 248, 0.3)',
        };
      case BreathPhase.HOLD:
        return {
          background: 'linear-gradient(to right, #38BDF8, #818CF8)',
          shadow: 'rgba(99, 102, 241, 0.3)',
        };
      case BreathPhase.EXHALE:
        return {
          background: 'linear-gradient(to right, #0D9488, #065F46)',
          shadow: 'rgba(13, 148, 136, 0.3)',
        };
      case BreathPhase.HOLD_EMPTY:
        return {
          background: 'linear-gradient(to right, #334155, #1E293B)',
          shadow: 'rgba(0, 0, 0, 0.1)',
        };
      default:
        return { background: 'rgba(255,255,255,0.2)', shadow: 'transparent' };
    }
  };

  const style = getLiquidStyle();

  return (
    <div className="w-full max-w-[200px] h-1.5 relative mt-16 animate-fade-in pointer-events-none transition-all duration-1000">
      <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-full border border-white/5 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full transition-all ease-linear"
          style={{
            width: '100%',
            transform: `scaleX(${fill})`,
            transformOrigin: 'left',
            transitionDuration: isAnimating ? `${duration}s` : '0.6s',
            background: style.background,
            boxShadow: `0 0 10px ${style.shadow}`,
          }}
        >
          <div className="absolute inset-0 opacity-20">
            <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_4s_linear_infinite]" />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

/**
 * Exhale-only progress bar for BHRAMARI (Humming Bee) and OM Integration.
 * Fills 0→1 during EXHALE phase, resets to empty at start of each cycle.
 * Matches Alternate Nostril styling: rounded bar, smooth linear animation, shimmer.
 */
const ExhaleProgressBar = ({
  phase,
  exhaleDuration,
  isRunning,
  theme,
  className = '',
}: {
  phase: BreathPhase;
  exhaleDuration: number;
  isRunning: boolean;
  theme: 'bhramari' | 'om';
  className?: string;
}) => {
  const [fill, setFill] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isRunning || phase === BreathPhase.IDLE) {
      setFill(0);
      setIsAnimating(false);
      return;
    }
    if (phase === BreathPhase.EXHALE) {
      setFill(1);
      setIsAnimating(true);
    } else {
      setFill(0);
      setIsAnimating(false);
    }
  }, [phase, isRunning]);

  const barStyle = theme === 'bhramari'
    ? { background: 'linear-gradient(to right, #0D9488, #14B8A6, #2DD4BF)', shadow: 'rgba(20, 184, 166, 0.35)' }
    : { background: 'linear-gradient(to right, #D97706, #F59E0B, #FBBF24)', shadow: 'rgba(245, 158, 11, 0.4)' };

  if (!isRunning) return null;

  return (
    <div className={`w-full max-w-[220px] relative mt-6 animate-fade-in pointer-events-none transition-all duration-1000 ${className}`}>
      <div className="w-full h-2.5 bg-white/15 backdrop-blur-sm rounded-full border border-white/20 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full transition-all ease-linear rounded-full"
          style={{
            width: '100%',
            transform: `scaleX(${fill})`,
            transformOrigin: 'left',
            transitionDuration: isAnimating ? `${exhaleDuration}s` : '0.5s',
            background: barStyle.background,
            boxShadow: `0 0 15px ${barStyle.shadow}`,
          }}
        >
          <div className="absolute inset-0 opacity-20 rounded-full">
            <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer-exhale_4s_linear_infinite]" />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer-exhale {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

const BoxBreathingVisual = ({ phase, pattern }: { phase: BreathPhase, pattern: BreathingPattern }) => {
    const size = 120;
    const offset = 40;
    const cornerRadius = 12;
    const accentGold = '#C9A85D'; // softer brand-gold tone used across the app

    const activeSide = useMemo(() => {
        switch(phase) {
            case BreathPhase.INHALE: return 0;
            case BreathPhase.HOLD: return 1;
            case BreathPhase.EXHALE: return 2;
            case BreathPhase.HOLD_EMPTY: return 3;
            default: return -1;
        }
    }, [phase]);

    const duration = useMemo(() => {
        switch(phase) {
            case BreathPhase.INHALE: return pattern.inhale;
            case BreathPhase.HOLD: return pattern.hold;
            case BreathPhase.EXHALE: return pattern.exhale;
            case BreathPhase.HOLD_EMPTY: return pattern.holdEmpty || 4;
            default: return 0.5;
        }
    }, [phase, pattern]);

    return (
        <div className="relative flex items-center justify-center h-80 w-80">
            <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-[100px] animate-pulse-slow pointer-events-none"></div>
            
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl overflow-visible">
                <rect 
                    x={offset} y={offset} width={size} height={size} 
                    fill="none" 
                    stroke="rgba(255,255,255,0.1)" 
                    strokeWidth="4" 
                    rx={cornerRadius} 
                />
                
                <g className="transition-opacity duration-1000">
                    <path 
                        d={`M ${offset + cornerRadius} ${offset} H ${offset + size - cornerRadius}`} 
                        stroke={accentGold} strokeWidth="4" strokeLinecap="round" fill="none"
                        className={`transition-opacity duration-700 ${activeSide === 0 ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <path 
                        d={`M ${offset + size} ${offset + cornerRadius} V ${offset + size - cornerRadius}`} 
                        stroke={accentGold} strokeWidth="4" strokeLinecap="round" fill="none"
                        className={`transition-opacity duration-700 ${activeSide === 1 ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <path 
                        d={`M ${offset + size - cornerRadius} ${offset + size} H ${offset + cornerRadius}`} 
                        stroke={accentGold} strokeWidth="4" strokeLinecap="round" fill="none"
                        className={`transition-opacity duration-700 ${activeSide === 2 ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <path 
                        d={`M ${offset} ${offset + size - cornerRadius} V ${offset + cornerRadius}`} 
                        stroke={accentGold} strokeWidth="4" strokeLinecap="round" fill="none"
                        className={`transition-opacity duration-700 ${activeSide === 3 ? 'opacity-100' : 'opacity-0'}`}
                    />
                </g>

                <circle
                    r="9"
                    fill="#D4A574"
                    filter="drop-shadow(0 0 8px rgba(245,176,37,0.7))"
                    className="shadow-lg shadow-brand-gold/50 transition-all"
                    style={{
                        transitionDuration: `${duration}s`,
                        transitionTimingFunction: 'linear',
                        transform:
                            activeSide === 0 ? `translate(${offset + size}px, ${offset}px)` :
                            activeSide === 1 ? `translate(${offset + size}px, ${offset + size}px)` :
                            activeSide === 2 ? `translate(${offset}px, ${offset + size}px)` :
                            activeSide === 3 ? `translate(${offset}px, ${offset}px)` :
                            `translate(${offset}px, ${offset}px)`
                    }}
                />

                <circle cx="100" cy="100" r="30" fill="#D4A574" fillOpacity="0.03" className="animate-pulse" />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <h3 className="text-4xl font-serif font-bold text-white tracking-[0.1em] drop-shadow-2xl animate-fade-in transition-all duration-1000" key={phase}>
                    {phase === BreathPhase.INHALE ? 'inhale' : 
                     phase === BreathPhase.HOLD ? 'hold' : 
                     phase === BreathPhase.EXHALE ? 'exhale' : 
                     phase === BreathPhase.HOLD_EMPTY ? 'hold' : 'ready'}
                 </h3>
            </div>
        </div>
    );
};

// --- REFINED ORB-DRIVEN ALTERNATE NOSTRIL BREATHING VISUAL ---
const AlternateNostrilVisual = ({
    phase,
    cycleCount,
    pattern,
    totalCycles,
    phaseDuration,
    isRunning,
    isRetention,
    retentionTimeLeft,
    isRecovery,
}: {
    phase: BreathPhase;
    cycleCount: number;
    pattern: BreathingPattern;
    totalCycles: number;
    phaseDuration: number;
    isRunning: boolean;
    isRetention?: boolean;
    retentionTimeLeft?: number;
    isRecovery?: boolean;
}) => {
    // Definition: 1 Cycle = (In Left, Hold, Out Right) + (In Right, Hold, Out Left)
    const isLeftStartHalf = cycleCount % 2 === 0;

    const [fill, setFill] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (!isRunning || phase === BreathPhase.IDLE) {
            setFill(0);
            setIsAnimating(false);
            return;
        }
        if (phase === BreathPhase.INHALE) {
            setFill(1);
            setIsAnimating(true);
        } else if (phase === BreathPhase.HOLD) {
            setFill(1);
            setIsAnimating(false);
        } else if (phase === BreathPhase.EXHALE) {
            setFill(0);
            setIsAnimating(true);
        } else if (phase === BreathPhase.HOLD_EMPTY) {
            setFill(0);
            setIsAnimating(false);
        }
    }, [phase, isRunning]);

    const getStatusText = () => {
        if (isRecovery) return "slow exhale & recover";
        // Show "final hold" during retention phase
        if (isRetention && phase === BreathPhase.HOLD) {
            return "final hold";
        }
        if (isRetention && phase === BreathPhase.INHALE) {
            return "inhale fully";
        }
        if (phase === BreathPhase.HOLD) return "hold";
        if (isLeftStartHalf) {
            if (phase === BreathPhase.INHALE) return "inhale";
            if (phase === BreathPhase.EXHALE) return "exhale";
        } else {
            if (phase === BreathPhase.INHALE) return "inhale";
            if (phase === BreathPhase.EXHALE) return "exhale";
        }
        return "balance";
    };

    // Calculate remaining full cycles
    // For BALANCE: totalCycles represents individual nostril actions
    // 1 full cycle = Left + Right, so we convert to full cycles
    const totalFullCycles = totalCycles / 2;
    const completedFullCycles = Math.floor(cycleCount / 2);
    const remainingFullCycles = Math.max(0, Math.ceil(totalFullCycles - completedFullCycles));

    // Determine color for indicators
    const isLeftCurrentlyActive = (isLeftStartHalf && phase === BreathPhase.INHALE) || (!isLeftStartHalf && phase === BreathPhase.EXHALE);
    const isRightCurrentlyActive = (!isLeftStartHalf && phase === BreathPhase.INHALE) || (isLeftStartHalf && phase === BreathPhase.EXHALE);

    const isInhalePhase = phase === BreathPhase.INHALE || phase === BreathPhase.HOLD;
    const barStyle = isInhalePhase
        ? { background: 'linear-gradient(to right, #A5F3FC, #7DD3FC, #38BDF8)', shadow: 'rgba(56, 189, 248, 0.3)' }
        : { background: 'linear-gradient(to right, #0D9488, #065F46)', shadow: 'rgba(13, 148, 136, 0.3)' };

    return (
        <div className="relative flex flex-col items-center justify-center h-[460px] w-full max-w-sm mx-auto scale-100 sm:scale-110 transition-transform duration-700">
            {/* Side-Specific Glows */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-400/10 blur-[100px] rounded-full transition-opacity duration-1000 ${isLeftCurrentlyActive ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-amber-400/10 blur-[100px] rounded-full transition-opacity duration-1000 ${isRightCurrentlyActive ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className="relative w-full flex flex-col items-center justify-center">
                {/* BREATHING ORB ANIMATION with Instruction Text Overlay */}
                <div className="scale-110 mb-8 relative">
                    <BreathingOrb 
                        phase={phase} 
                        pattern={pattern} 
                        cyclesCompleted={cycleCount} 
                        customText={getStatusText()} // Text now appears on top of the orb
                        countdown={isRetention && phase === BreathPhase.HOLD && retentionTimeLeft ? retentionTimeLeft : undefined}
                        isRecovery={isRecovery}
                    />
                </div>
                
                {/* Left/Right Text Indicators - Elegant & Symmetric */}
                <div className="flex justify-center gap-20 pointer-events-none mb-4">
                    <span className={`text-[12px] font-bold tracking-[0.4em] uppercase transition-all duration-700 ${isLeftCurrentlyActive ? 'text-cyan-400 opacity-100 scale-110' : 'text-white/20'}`}>left</span>
                    <span className={`text-[12px] font-bold tracking-[0.4em] uppercase transition-all duration-700 ${isRightCurrentlyActive ? 'text-amber-400 opacity-100 scale-110' : 'text-white/20'}`}>right</span>
                </div>
            </div>

            {/* Instruction Banner - Refined for "Too many words" feedback */}
            <div className="mt-2 flex flex-col items-center justify-center text-center w-full px-4">
                 {/* REDUNDANT DOTS AND LOWER TEXT REMOVED PER USER REQUEST */}
                 
                 {/* COUNTDOWN SUBSCRIPT - Hide during retention or recovery */}
                 {!isRetention && !isRecovery && remainingFullCycles > 0 && (
                     <div className="mt-8 text-center animate-fade-in" key={`count-${remainingFullCycles}`}>
                          <div
                              className={`font-serif font-bold tabular-nums drop-shadow-lg transition-all duration-500 ${remainingFullCycles === 1 ? 'text-5xl scale-110' : 'text-4xl opacity-70'}`}
                              style={remainingFullCycles === 1 ? { color: 'rgba(201,168,93,0.8)' } : undefined}
                          >
                              {remainingFullCycles}
                          </div>
                          <div className="text-[9px] font-bold tracking-[0.2em] opacity-30 uppercase mt-1">
                              cycles remaining
                          </div>
                     </div>
                 )}

                 {/* Inhale / Exhale bar (blue = inhale, green = exhale) — like Diaphragm */}
                 {isRunning && !isRetention && !isRecovery && (
                     <div className="w-full max-w-[200px] relative mt-6 animate-fade-in pointer-events-none transition-all duration-1000">
                       
                         <div className="w-full h-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/5 overflow-hidden">
                             <div
                                 className="absolute top-0 left-0 h-full transition-all ease-linear"
                                 style={{
                                     width: '100%',
                                     transform: `scaleX(${fill})`,
                                     transformOrigin: 'left',
                                     transitionDuration: isAnimating ? `${phaseDuration}s` : '0.6s',
                                     background: barStyle.background,
                                     boxShadow: `0 0 10px ${barStyle.shadow}`,
                                 }}
                             >
                                 <div className="absolute inset-0 opacity-20">
                                     <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer-alt_4s_linear_infinite]" />
                                 </div>
                             </div>
                         </div>
                         <style>{`
                             @keyframes shimmer-alt {
                                 0% { transform: translateX(-100%); }
                                 100% { transform: translateX(100%); }
                             }
                         `}</style>
                     </div>
                 )}
            </div>
        </div>
    );
};

const INSTRUCTION_DETAILS: Record<string, { title: string; text: string; icon: any }> = {
   'ENERGY': {
       title: "Breath of Fire",
       text: "rapid rhythmic breathing. snap the belly in on each exhale.",
       icon: Flame
   },
   'BHASTRIKA': {
       title: "Bhastrika",
       text: "forceful inhale and exhale through the nose. pump belly with each breath.",
       icon: Wind
   },
   'BALANCE': {
       title: "Alternate Nostril",
       text: "harmonize your nervous system with focused channel breathing.",
       icon: Scale
   },
   'FOCUS': {
       title: "Box Breathing",
       text: "inhale 4, hold 4, exhale 4, hold 4. keep the rhythm steady.",
       icon: Target
   },
   'CALM': {
       title: "Diaphragmatic",
       text: "inhale deeply into the belly. hold briefly. exhale slowly and fully.",
       icon: Moon
   },
   'REST': {
       title: "Relaxation",
       text: "inhale nose 4. hold 7. exhale mouth 8. great before sleep.",
       icon: Moon
   },
   'BHRAMARI': {
       title: "Humming Bee",
       text: "inhale deep. exhale while making a humming sound like a bee. feel the vibration in your third eye area.",
       icon: Music
   },
   'OM_INTEGRATION': {
       title: "OM Integration",
       text: "chant om. feel the resonance. integrate your practice.",
       icon: Music
   }
};

const ENERGIZING_CYCLES: Record<string, number[]> = {
   'ENERGY': [24, 36, 48, 60],
   'BHASTRIKA': [21, 33, 39, 48],
   'BHRAMARI': [24, 39, 45, 54]
};

const INTENT_TO_INDEX: Record<string, number> = {
   'QUICK': 0, 'SELF_CARE': 1, 'EXPANSION': 2, 'ASCENSION': 3
};

const FINAL_RETENTION_DURATIONS = [15, 27, 36, 45];

/**
 * Pattern-specific video instruction preview durations (in seconds)
 * Based on research: optimal instructional previews are 6-12 seconds
 * Duration determined by instruction complexity and text length
 */
const PATTERN_TRANSITION_DURATIONS: Record<string, number> = {
   'ENERGY': 6,        // Simple, short instruction: "rapid rhythmic breathing. snap the belly in on each exhale."
   'BHASTRIKA': 6,     // Simple but slightly longer: "forceful inhale and exhale through the nose. pump belly with each breath."
   'BALANCE': 12,       // Medium complexity, conceptual: "harmonize your nervous system with focused channel breathing."
   'FOCUS': 6,         // Has numbers to remember: "inhale 4, hold 4, exhale 4, hold 4. keep the rhythm steady."
   'CALM': 9,          // Medium length: "inhale deeply into the belly. hold briefly. exhale slowly and fully."
   'REST': 6,         // Has numbers, longer instruction: "inhale nose 4. hold 7. exhale mouth 8. great before sleep."
   'BHRAMARI': 12,     // Longest, most detailed: "inhale deep. exhale while making a humming sound like a bee. feel the vibration in your third eye area."
   'OM_INTEGRATION': 9 // Short but meaningful: "chant om. feel the resonance. integrate your practice."
};

const ABHI_AUDIO_BASE = "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/";

const BreathSphereVisual = ({ size = "lg" }: { size?: "sm" | "lg" }) => (
   <div className={`relative flex items-center justify-center ${size === 'lg' ? 'w-56 h-56 mb-8' : 'w-24 h-24'}`}>
        <div className="absolute inset-0 rounded-full border-2 border-brand-gold/30 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        <div className="absolute inset-4 rounded-full border border-brand-gold/20 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1s' }}></div>
        <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-gold/30 via-brand-gold/10 to-transparent backdrop-blur-md border border-brand-gold/50 shadow-[0_0_80px_rgba(212,165,116,0.6)] flex items-center justify-center animate-[pulse_6s_ease-in-out_infinite] relative overflow-hidden group">
           <div className="absolute inset-0 w-full h-full animate-[spin_60s_linear_infinite] opacity-90 p-4">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(212,165,116,0.5)]">
                   <circle cx="50" cy="50" r="46" fill="none" stroke="#D4A574" strokeWidth="1" />
                   {[0, 60, 120, 180, 240, 300].map(deg => (
                       <ellipse key={deg} cx="50" cy="50" rx="22" ry="42" transform={`rotate(${deg} 50 50)`} fill="none" stroke="#F3EAD3" strokeWidth="0.8" className="opacity-80" />
                   ))}
                   <circle cx="50" cy="50" r="28" fill="none" stroke="#D4A574" strokeWidth="1" />
                   <circle cx="50" cy="50" r="12" fill="#D4A574" fillOpacity="0.3" className="animate-pulse" />
                </svg>
           </div>
           <div className="absolute w-1/3 h-1/3 bg-brand-gold rounded-full blur-2xl animate-pulse opacity-60"></div>
           <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-white/30 to-transparent rounded-tr-full blur-lg"></div>
        </div>
   </div>
);

type RitualState = 'CHECKIN' | 'LOADING' | 'SUMMARY' | 'REST' | 'TRANSITION' | 'PREPARATION' | 'BREATHE' | 'OM_INTEGRATION' | 'GRATITUDE';
type FireSequencePhase = 'INTRO' | 'ACTIVE' | 'SQUEEZE' | 'DEEP_INHALE' | 'FINAL_RETENTION' | 'RECOVERY';
type TimeIntentType = 'QUICK' | 'SELF_CARE' | 'EXPANSION' | 'ASCENSION';
type PracticeMode = 'CALM' | 'BALANCED' | 'ENERGY';

interface RitualRound {
   id: number;
   patternId: string;
   name: string;
   durationCycles: number;
   intensity: 'WARM_UP' | 'HIGH' | 'FLOW';
   speedMultiplier: number;
   description: string;
   retentionType?: 'HOLD_FULL' | 'HOLD_EMPTY';
   retentionDuration?: number;
   isFirePattern?: boolean;
}

interface RitualPlan {
   intent: TimeIntentType;
   rounds: RitualRound[];
   omCount: number;
   omSecondsPerChant: number;
   totalDurationMin: number;
   totalSeconds: number;
   userLevel: number;
   practiceMode: PracticeMode;
   restSeconds: number;
   transitionSeconds: number;
}

const TIME_INTENTS = [
   { id: 'QUICK', label: 'Quick Practice', timeRange: '9-12 min', icon: Zap, colorClass: 'bg-sky-500', glowClass: 'shadow-sky-500/50', gradient: 'from-sky-400 to-blue-600', textColor: 'text-sky-200', description: 'Consistency & Stress Relief', range: [9, 12] },
   { id: 'SELF_CARE', label: 'Self-Care', timeRange: '12-18 min', icon: Heart, colorClass: 'bg-teal-500', glowClass: 'shadow-teal-500/50', gradient: 'from-teal-400 to-emerald-600', textColor: 'text-emerald-200', description: 'Emotional Release & Soothing', range: [12, 18] },
   { id: 'EXPANSION', label: 'Expansion', timeRange: '18-24 min', icon: Layers, colorClass: 'bg-orange-500', glowClass: 'shadow-orange-500/50', gradient: 'from-orange-400 to-red-600', textColor: 'text-orange-200', description: 'Pranic Awareness & Activation', range: [18, 24] },
   { id: 'ASCENSION', label: 'Ascension', timeRange: '24-30 min', icon: Infinity, colorClass: 'bg-purple-600', glowClass: 'shadow-purple-600/50', gradient: 'from-violet-500 to-purple-800', textColor: 'text-purple-200', description: 'Deep States & Progression', range: [24, 30] }
];

const PATTERN_CATEGORIES = {
   FIRE: ['ENERGY', 'BHASTRIKA'],
   COOLING: ['FOCUS', 'REST', 'CALM', 'BALANCE'],
   CLOSING: ['BHRAMARI', 'BALANCE']
};

const calculateSessionDuration = (intentId: string, mode: PracticeMode): number => {
   const intent = TIME_INTENTS.find(i => i.id === intentId) || TIME_INTENTS[0];
   const [min, max] = intent.range;
   if (mode === 'ENERGY') return min;
   if (mode === 'CALM') return max;
   return (min + max) / 2;
};

const generateAdaptiveRitual = (
   intentInput: TimeIntentType | null,
   userSessions: number,
   patternProgress: Record<string, PatternProgress>,
   userPreferences: UserPreferences | null,
   practiceMode: PracticeMode = 'BALANCED'
): RitualPlan => {
   let intent: TimeIntentType = 'QUICK';
   if (intentInput) intent = intentInput;
   else if (userPreferences?.sessionDuration) {
       const dur = userPreferences.sessionDuration;
       if (dur === '5min') intent = 'QUICK';
       else if (dur === '10min') intent = 'SELF_CARE';
       else if (dur === '20min') intent = 'EXPANSION';
       else if (dur === '30min') intent = 'ASCENSION';
   }

   const targetMin = calculateSessionDuration(intent, practiceMode);
   const targetSeconds = targetMin * 60;
   const intensityIndex = INTENT_TO_INDEX[intent];

   const baseLevel = Math.floor(userSessions / 5);
   const userLevel = Math.min(5, baseLevel + (userPreferences?.experienceLevel === 'daily' ? 3 : userPreferences?.experienceLevel === 'weekly' ? 2 : userPreferences?.experienceLevel === 'little' ? 1 : 0));

   let numRounds = 4;
   if (intent === 'SELF_CARE') numRounds = 5;
   if (intent === 'EXPANSION') numRounds = 6;
   if (intent === 'ASCENSION') numRounds = 7;

   const omCount = 3 + (intent === 'ASCENSION' ? 3 : intent === 'EXPANSION' ? 2 : intent === 'SELF_CARE' ? 1 : 0);
   const restSeconds = 30;
   // Use average transition duration (9 seconds) for initial budget calculation
   // Will be recalculated with pattern-specific durations after rounds are created
   const avgTransitionSeconds = 9;
   const estimatedFixedOverhead = (numRounds * avgTransitionSeconds) + ((numRounds - 1) * restSeconds) + (omCount * 12);
   const breathworkBudget = Math.max(120, targetSeconds - estimatedFixedOverhead);
  
   const selectPatternIds = (): { id: string, type: 'FIRE' | 'COOLING' | 'CLOSING' }[] => {
       const fireSelection: { id: string, type: 'FIRE' | 'COOLING' | 'CLOSING' }[] = [];
       const coolingSelection: { id: string, type: 'FIRE' | 'COOLING' | 'CLOSING' }[] = [];
       
       let fireCount = 0, coolingCount = 0;
       if (practiceMode === 'ENERGY') { 
           fireCount = numRounds - 1; 
           coolingCount = 0; 
       } else if (practiceMode === 'CALM') { 
           fireCount = 0; 
           coolingCount = numRounds - 1; 
       } else { 
           fireCount = Math.floor((numRounds - 1) / 2); 
           coolingCount = (numRounds - 1) - fireCount; 
       }

       for(let i=0; i<fireCount; i++) {
           fireSelection.push({ id: PATTERN_CATEGORIES.FIRE[(userSessions + i) % 2], type: 'FIRE' });
       }
       
       fireSelection.sort((a, b) => {
           if (a.id === 'ENERGY' && b.id !== 'ENERGY') return -1;
           if (b.id === 'ENERGY' && a.id !== 'ENERGY') return 1;
           return a.id.localeCompare(b.id);
       });

       for(let i=0; i<coolingCount; i++) {
           coolingSelection.push({ id: PATTERN_CATEGORIES.COOLING[(userSessions + i + 10) % 4], type: 'COOLING' });
       }

       const closingSelection: { id: string, type: 'FIRE' | 'COOLING' | 'CLOSING' }[] = [
           { id: PATTERN_CATEGORIES.CLOSING[(userSessions + 20) % 2], type: 'CLOSING' }
       ];

       return [...fireSelection, ...coolingSelection, ...closingSelection];
   };

   const patternChoices = selectPatternIds();
  
   let energizingSeconds = 0;
   const fireRoundsCount = patternChoices.filter(c => c.type === 'FIRE').length;
  
   const fireRoundData = patternChoices.map(choice => {
       if (choice.type !== 'FIRE') return null;
       const base = PATTERNS[choice.id];
       const ct = (base.inhale + (base.hold || 0) + base.exhale + (base.holdEmpty || 0));
       const cycles = ENERGIZING_CYCLES[choice.id] ? ENERGIZING_CYCLES[choice.id][intensityIndex] : 30;
       const finalHold = FINAL_RETENTION_DURATIONS[intensityIndex];
       const retention = 8 + 5 + finalHold;
       energizingSeconds += (ct * cycles) + retention;
       return { cycles, finalHold };
   });

   const remainingBreathBudget = Math.max(60, breathworkBudget - energizingSeconds);
   const nonFireRoundsCount = patternChoices.length - fireRoundsCount;
   const budgetPerNonFireRound = remainingBreathBudget / Math.max(1, nonFireRoundsCount);

   const rounds: RitualRound[] = patternChoices.map((choice, idx) => {
       const base = PATTERNS[choice.id];
       const cycleTime = (base.inhale + (base.hold || 0) + base.exhale + (base.holdEmpty || 0));
      
       let cycles: number;
       let retentionDuration: number;
       let isFirePattern = choice.type === 'FIRE';

       if (isFirePattern) {
           const data = fireRoundData[idx]!;
           cycles = data.cycles;
           retentionDuration = data.finalHold;
       } else {
           retentionDuration = Math.round(budgetPerNonFireRound * 0.25);
           const breathTimeRemaining = budgetPerNonFireRound - retentionDuration;
           cycles = Math.max(4, Math.round(breathTimeRemaining / cycleTime));
       }

       // For BALANCE (Alternate Nostril), ensure durationCycles represents "In-Hold-Out" steps.
       // Traditional 1 loop = 2 of our internal cycles.
       if (choice.id === 'BALANCE') {
            cycles = cycles % 2 === 0 ? cycles : cycles + 1; 
       }

       return {
           id: idx + 1,
           patternId: choice.id,
           name: base.name,
           durationCycles: cycles,
           intensity: isFirePattern ? 'HIGH' : 'FLOW',
           speedMultiplier: 1.0,
           description: isFirePattern ? "Activate." : "Focus.",
           retentionType: isFirePattern ? 'HOLD_EMPTY' : 'HOLD_FULL',
           retentionDuration,
           isFirePattern
       };
   });

   const actualBreathworkSeconds = rounds.reduce((sum, r) => {
       const base = PATTERNS[r.patternId];
       const ct = (base.inhale + (base.hold || 0) + base.exhale + (base.holdEmpty || 0));
       const retentionTotal = r.isFirePattern ? (8 + 5 + (r.retentionDuration || 15)) : (r.retentionDuration || 0);
       return sum + (ct * r.durationCycles) + retentionTotal;
   }, 0);
  
   // Calculate total transition seconds based on pattern-specific durations
   const totalTransitionSeconds = rounds.reduce((sum, r) => {
       return sum + (PATTERN_TRANSITION_DURATIONS[r.patternId] || 9);
   }, 0) + (PATTERN_TRANSITION_DURATIONS['OM_INTEGRATION'] || 8); // Add OM integration transition
   
   // Calculate average transition seconds for the plan (for backwards compatibility)
   const transitionSeconds = Math.round(totalTransitionSeconds / (rounds.length + 1));
   
   const fixedOverhead = totalTransitionSeconds + ((numRounds - 1) * restSeconds) + (omCount * 12);
   const totalSeconds = Math.round(actualBreathworkSeconds + fixedOverhead);
   const totalDurationMin = Number((totalSeconds / 60).toFixed(1));

   return { intent, rounds, omCount, omSecondsPerChant: 12, totalDurationMin, totalSeconds, userLevel, practiceMode, restSeconds, transitionSeconds };
};

const SandTimer = ({ duration, timeLeft }: { duration: number; timeLeft: number }) => {
   const progress = Math.max(0, Math.min(1, (duration - timeLeft) / duration));
   return (
       <div className="flex flex-col items-center animate-fade-in relative">
           <div className="relative w-36 h-56 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
               <svg width="0" height="0" className="absolute">
                   <defs>
                       <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                           <stop offset="0%" stopColor="#FDE68A" />
                           <stop offset="100%" stopColor="#D97706" />
                       </linearGradient>
                   </defs>
               </svg>
               <svg viewBox="0 0 100 200" className="w-full h-full">
                   <path d="M10,5 L90,5 L90,15 C90,55 55,85 55,100 C55,115 90,145 90,185 L90,195 L10,195 L10,185 C10,145 45,115 45,100 C45,85 10,55 10,15 Z" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                   <path d="M15,15 L85,15 L85,20 C85,50 60,80 50,90 C40,80 15,50 15,20 Z" fill="url(#sandGradient)" style={{ transformOrigin: 'top center', transform: `scaleY(${1 - progress})`, transition: 'transform 1s linear' }} opacity="0.9" />
                   {timeLeft > 0 && timeLeft < duration && <rect x="49" y="95" width="2" height="95" fill="url(#sandGradient)" className="animate-pulse" opacity="0.8" />}
                   <path d="M15,190 L85,190 L85,180 C85,150 60,115 50,105 C40,115 15,150 15,180 Z" fill="url(#sandGradient)" style={{ transformOrigin: 'bottom center', transform: `scaleY(${progress})`, transition: 'transform 1s linear' }} opacity="0.9" />
               </svg>
           </div>
           <div className="absolute bottom-[-40px] font-mono text-3xl text-brand-gold font-bold tracking-widest drop-shadow-md">
               {timeLeft}<span className="text-sm ml-1 opacity-50">s</span>
           </div>
       </div>
   );
};

const OmVibrationVisual = () => (
   <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-b from-[#240046] via-[#3c096c] to-[#240046] animate-pulse-slow"></div>
       {[...Array(6)].map((_, i) => <div key={i} className="absolute rounded-full border border-brand-gold/30 box-border" style={{ width: '30vh', height: '30vh', animation: `expandRing 12s linear infinite`, animationDelay: `${i * 2}s` }} />)}
       <div className="absolute inset-0 animate-[spin_60s_linear_infinite]">
            {[...Array(12)].map((_, i) => <div key={i} className="absolute w-1 h-1 bg-brand-gold/40 rounded-full" style={{ top: '50%', left: '50%', transform: `rotate(${i * 30}deg) translate(35vh) scale(${Math.random()})` }} />)}
       </div>
       <div className="relative z-10 flex items-center justify-center">
           <div className="absolute w-64 h-64 bg-brand-gold/10 rounded-full blur-3xl animate-pulse"></div>
           <div className="text-[10rem] text-brand-gold leading-none font-serif select-none" style={{ animation: 'goldenGlow 6s ease-in-out infinite' }}>ॐ</div>
       </div>
   </div>
);

// Ripple rings (same vibe as Humming Bee) for OM screen
const OmRippleRings = ({ isActive }: { isActive: boolean }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="absolute rounded-full border border-[#D4A574]/15"
        style={{
          width: `${320 + i * 120}px`,
          height: `${320 + i * 120}px`,
          animation: `omRipple ${isActive ? 5 : 8}s ease-out infinite`,
          animationDelay: `${i * 0.8}s`,
          opacity: isActive ? 0.85 : 0.5,
        }}
      />
    ))}
    <style>{`
      @keyframes omRipple {
        0% { transform: scale(0.98); opacity: 0.0; }
        25% { opacity: 0.35; }
        100% { transform: scale(1.08); opacity: 0.0; }
      }
    `}</style>
  </div>
);

// Use React.FC as a type
export const MorningRitual: React.FC = () => {
 const navigate = useNavigate();
 const { addCalmPoints, incrementStreak, stats, patternProgress, userPreferences, user, membershipStatus } = useApp();
 const isSubscribed = membershipStatus === 'Premium Membership';
 const [view, setView] = useState<RitualState>('LOADING');
 const [loadingText, setLoadingText] = useState('checking history...');
 const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('ENERGY');
  console.log('isSubscribed', isSubscribed);
  // Force ENERGY mode for non-premium users
  useEffect(() => {
      if (!isSubscribed && selectedMode !== 'ENERGY') {
          setSelectedMode('ENERGY');
      }
  }, [isSubscribed, selectedMode]);

  const [plan, setPlan] = useState<RitualPlan | null>(null);
 const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
 const [phase, setPhase] = useState<BreathPhase>(BreathPhase.IDLE);
 const [cycleCount, setCycleCount] = useState(0);
 const [isRetention, setIsRetention] = useState(false);
 const [fireSequencePhase, setFireSequencePhase] = useState<FireSequencePhase>('ACTIVE');
 const [fireIntroStep, setFireIntroStep] = useState(0);
 const [isPaused, setIsPaused] = useState(false);
 const [transitionTimeLeft, setTransitionTimeLeft] = useState(9);
 const [preparationCountdown, setPreparationCountdown] = useState(3);
 const [prepareCueDuration, setPrepareCueDuration] = useState(3);
 const [restTimeLeft, setRestTimeLeft] = useState(30);
 const [retentionTimeLeft, setRetentionTimeLeft] = useState(0);
 const [omCyclesCompleted, setOmCyclesCompleted] = useState(0);
 const [startCountdown, setStartCountdown] = useState(12);
 const [autoStartEnabled, setAutoStartEnabled] = useState(false);
 const [showRoundMessage, setShowRoundMessage] = useState(false);
 const [breathSoundEnabled, setBreathSoundEnabled] = useState(true);
 const [showExhaleFullyHint, setShowExhaleFullyHint] = useState(false);
 const [hideFinalBreathUI, setHideFinalBreathUI] = useState(false);
 const [isTransitioningToOm, setIsTransitioningToOm] = useState(false);
 const [shouldStopMusicImmediate, setShouldStopMusicImmediate] = useState(false);
 const [restMusicEnabled, setRestMusicEnabled] = useState(true);
 const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
 const [totalSessionCycles, setTotalSessionCycles] = useState(0);
 const [savingResult, setSavingResult] = useState(false);
 const [showTechniqueIntro, setShowTechniqueIntro] = useState<string | null>(null);
 const [techniqueIntroForced, setTechniqueIntroForced] = useState(false);
 const [transitionVideoUrl, setTransitionVideoUrl] = useState<string>('');
 const [isTransitionVideoReady, setIsTransitionVideoReady] = useState(false);
 const [isUIVisible, setIsUIVisible] = useState(true);
 const [transitionVideoMuted, setTransitionVideoMuted] = useState(true);

// Make sure that when the tab/app goes to the background, we don't keep
// advancing breath timers in the background (which can make visuals look
// like they "jump" or move backwards when returning).
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      setIsPaused(true);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);

 // Certificate generation state (for GRATITUDE view)
 const certificateRef = useRef<HTMLDivElement>(null);
 const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
 
 // Video preloading refs - store preloaded video elements and resolved srcs
 const preloadedVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
 const preloadedVideoSrcRef = useRef<Map<string, string>>(new Map());
 const transitionVideoLoadStartRef = useRef<number | null>(null);
 const transitionVideoFallbackTimerRef = useRef<number | null>(null);
 
 // Motivational messages pool
 const motivationalMessages = [
     "Small breaths. Big shifts.",
     "You showed up for yourself today.",
     "Calm is a skill—and you practiced it.",
     "This state will follow you into your day.",
     "Nothing to fix. Just continue.",
     "Your body remembers this.",
     "Stillness is now available to you.",
     "You are less rushed than you were.",
     "Presence has been trained.",
     "Carry this breath with you.",
     "Gentle mornings shape strong days.",
     "This is how change begins."
 ];
 
 // Select random message - initialize once when component mounts
 const [selectedMessage] = useState(() => 
     motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
 );
 
 // Elemental symbols (air, water, fire, space, earth)
 const elementalSymbols = ['air', 'water', 'fire', 'space', 'earth'];
 
 // Select random elemental symbol
 const [selectedSymbol] = useState(() => 
     elementalSymbols[Math.floor(Math.random() * elementalSymbols.length)]
 );
 
 // Elemental Symbol Component
 const ElementalSymbol: React.FC<{ type: string; className?: string }> = ({ type, className = '' }) => {
     const symbolStyle = { fill: '#D4A574', stroke: '#D4A574', strokeWidth: 2 };
     
     switch (type) {
         case 'air':
             return (
                 <svg viewBox="0 0 100 100" className={className} style={{ width: '80px', height: '80px' }}>
                     <path d="M 20 50 Q 30 30, 50 50 T 80 50" {...symbolStyle} fill="none" strokeWidth="3" />
                     <path d="M 20 60 Q 30 40, 50 60 T 80 60" {...symbolStyle} fill="none" strokeWidth="3" />
                 </svg>
             );
         case 'water':
             return (
                 <svg viewBox="0 0 100 100" className={className} style={{ width: '80px', height: '80px' }}>
                     <path d="M 50 20 Q 45 35, 50 50 Q 55 35, 50 20" {...symbolStyle} />
                     <line x1="50" y1="50" x2="50" y2="70" {...symbolStyle} strokeWidth="2" />
                 </svg>
             );
         case 'fire':
             return (
                 <svg viewBox="0 0 100 100" className={className} style={{ width: '80px', height: '80px' }}>
                     <path d="M 50 20 Q 45 35, 50 45 Q 55 35, 50 20" {...symbolStyle} />
                     <path d="M 50 20 Q 40 40, 50 50 Q 60 40, 50 20" {...symbolStyle} />
                     <line x1="50" y1="50" x2="50" y2="70" {...symbolStyle} strokeWidth="2" />
                 </svg>
             );
         case 'space':
             return (
                 <svg viewBox="0 0 100 100" className={className} style={{ width: '80px', height: '80px' }}>
                     <circle cx="50" cy="50" r="30" {...symbolStyle} fill="none" strokeWidth="2" />
                     <line x1="50" y1="20" x2="50" y2="80" {...symbolStyle} strokeWidth="2" />
                     <line x1="20" y1="50" x2="80" y2="50" {...symbolStyle} strokeWidth="2" />
                 </svg>
             );
         case 'earth':
             return (
                 <svg viewBox="0 0 100 100" className={className} style={{ width: '80px', height: '80px' }}>
                     <path d="M 50 20 L 30 50 L 50 80 L 70 50 Z" {...symbolStyle} fill="none" strokeWidth="2" />
                     <circle cx="50" cy="50" r="8" {...symbolStyle} />
                 </svg>
             );
         default:
             return null;
     }
 };

 const activeRound = plan?.rounds[currentRoundIndex];
  const activePattern = useMemo(() => {
     if (!activeRound) return PATTERNS.CALM;
     const base = PATTERNS[activeRound.patternId];
     const m = activeRound.speedMultiplier;
     return { ...base, inhale: Number((base.inhale * m).toFixed(2)), hold: base.hold ? Number((base.hold * m).toFixed(2)) : 0, exhale: Number((base.exhale * m).toFixed(2)), holdEmpty: base.holdEmpty ? Number((base.holdEmpty * m).toFixed(2)) : undefined };
 }, [activeRound]);

 // Rest music hook - plays calming background music during REST phase
 // Note: restMusicEnabled is handled separately via button, hook manages phase transitions
 useRestMusic({
     isActive: view === 'REST',
     isPaused: isPaused || !restMusicEnabled, // Treat muted as paused
     shouldStopImmediate: shouldStopMusicImmediate,
 });

 const remainingCycles = useMemo(() => {
     if (!activeRound) return 0;
     // For BALANCE (Alternate Nostril), cycleCount represents individual nostril actions
     // 1 full cycle = Left + Right, so we need to convert to full cycles
     if (activeRound.patternId === 'BALANCE') {
         const totalFullCycles = activeRound.durationCycles / 2;
         const completedFullCycles = Math.floor(cycleCount / 2);
         return Math.max(1, totalFullCycles - completedFullCycles);
     }
     return Math.max(1, activeRound.durationCycles - cycleCount);
 }, [activeRound, cycleCount]);

const timerRef = useRef<number | null>(null);
const uiHideTimerRef = useRef<number | null>(null);
 const audioContextRef = useRef<AudioContext | null>(null);
 const masterGainNodeRef = useRef<GainNode | null>(null);
 const breathSoundEnabledRef = useRef<boolean>(true);
 
 const exhaleBufferRef = useRef<AudioBuffer | null>(null);
 const exhaleFullyBufferRef = useRef<AudioBuffer | null>(null);
 const hummingBufferRef = useRef<AudioBuffer | null>(null);
 const longInhaleBufferRef = useRef<AudioBuffer | null>(null);
 
 const fireIntroBufferRef = useRef<AudioBuffer | null>(null);
 const fireInhaleHalfwayBufferRef = useRef<AudioBuffer | null>(null);
 const fireExhaleBufferRef = useRef<AudioBuffer | null>(null);
 const fireLastExhaleBufferRef = useRef<AudioBuffer | null>(null);
 const fireHoldBufferRef = useRef<AudioBuffer | null>(null);
 const fireFinalHoldBufferRef = useRef<AudioBuffer | null>(null);

 const bhastrikaInhaleBufferRef = useRef<AudioBuffer | null>(null);
 const bhastrikaExhaleBufferRef = useRef<AudioBuffer | null>(null);
 const bhastrikaLastExhaleBufferRef = useRef<AudioBuffer | null>(null);

 // NEW CUES REFS
 const inhale6BufferRef = useRef<AudioBuffer | null>(null);
 const hold3BufferRef = useRef<AudioBuffer | null>(null);
 const exhale9BufferRef = useRef<AudioBuffer | null>(null);
 const inhale4boxBufferRef = useRef<AudioBuffer | null>(null);
 const hold7BufferRef = useRef<AudioBuffer | null>(null);
 const exhale8BufferRef = useRef<AudioBuffer | null>(null);
 const hold4boxBufferRef = useRef<AudioBuffer | null>(null);
 const exhale4boxBufferRef = useRef<AudioBuffer | null>(null);
 const hold4box2BufferRef = useRef<AudioBuffer | null>(null);
 const inhaleLeftBufferRef = useRef<AudioBuffer | null>(null);
 const exhaleRightBufferRef = useRef<AudioBuffer | null>(null);
 const inhaleRightBufferRef = useRef<AudioBuffer | null>(null);
 const exhaleLeftBufferRef = useRef<AudioBuffer | null>(null);
const genericHoldBufferRef = useRef<AudioBuffer | null>(null);
const bellBufferRef = useRef<AudioBuffer | null>(null);
const chimeBufferRef = useRef<AudioBuffer | null>(null);
 
// OM INTEGRATION CUES REFS
 const omInhaleBufferRef = useRef<AudioBuffer | null>(null);
 const omExhaleBufferRef = useRef<AudioBuffer | null>(null);

 // INSTRUCTION PREVIEW CUES REFS (for TRANSITION view)
 const boxBreathingInstructionBufferRef = useRef<AudioBuffer | null>(null);
 const rest478InstructionBufferRef = useRef<AudioBuffer | null>(null);

 const clearTimers = () => { if (timerRef.current) clearTimeout(timerRef.current); };

 const loadAudioBuffer = async (ctx: AudioContext, url: string) => {
   try {
       const response = await fetch(url);
       const arrayBuffer = await response.arrayBuffer();
       return await ctx.decodeAudioData(arrayBuffer);
   } catch (e) {
       console.error(`Failed to load audio from ${url}`, e);
       return null;
   }
 };

 // Keep latest sound enabled state in a ref so toggling mute doesn't restart breathing timers.
 useEffect(() => {
     breathSoundEnabledRef.current = breathSoundEnabled;
 }, [breathSoundEnabled]);

// Keep REST background music in sync with the global breath mute state so that
// one volume button controls breath cues AND rest music across the ritual.
useEffect(() => {
    if (!breathSoundEnabled) {
        // Globally muted: turn off REST music and pause the service
        setRestMusicEnabled(false);
        if (restMusicService.isPlaying()) {
            restMusicService.pause();
        }
    } else {
        // Globally unmuted: allow REST music again, and if we're currently
        // on the REST screen and not paused, ensure music is playing.
        setRestMusicEnabled(true);
        if (view === 'REST' && !isPaused && !restMusicService.isPlaying()) {
            restMusicService.play(false).catch((error) => {
                console.error('Failed to start rest music after unmute:', error);
            });
        }
    }
}, [breathSoundEnabled, view, isPaused]);

// --- IMMERSIVE MODE (ZEN VIEW) ---
// Hide chrome (title, volume, pause, skip, progress) during breathing for a more spacious feel.
const clearImmersiveTimer = useCallback(() => {
    if (uiHideTimerRef.current) {
        window.clearTimeout(uiHideTimerRef.current);
        uiHideTimerRef.current = null;
    }
}, []);

const scheduleImmersiveHide = useCallback(() => {
    clearImmersiveTimer();
    // Only auto-hide on core practice views
    if (view === 'BREATHE' || view === 'OM_INTEGRATION' || view === 'REST') {
        uiHideTimerRef.current = window.setTimeout(() => {
            setIsUIVisible(false);
        }, 4000);
    }
}, [view, clearImmersiveTimer]);

const handleScreenTap = useCallback(() => {
    // Any tap reveals UI again and restarts the hide timer
    setIsUIVisible(true);
    scheduleImmersiveHide();
}, [scheduleImmersiveHide]);

// When entering/exiting immersive-capable views, manage initial visibility & timers
useEffect(() => {
    if (view === 'BREATHE' || view === 'OM_INTEGRATION' || view === 'REST') {
        setIsUIVisible(true);
        scheduleImmersiveHide();
    } else {
        setIsUIVisible(true);
        clearImmersiveTimer();
    }
    return () => {
        clearImmersiveTimer();
    };
}, [view, scheduleImmersiveHide, clearImmersiveTimer]);

 useEffect(() => {
   const initAudio = async () => {
       try {
           if (!audioContextRef.current) {
               audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
           }
           const ctx = audioContextRef.current;

           // Master gain: mute/unmute should only affect output volume (not timers/state).
           if (!masterGainNodeRef.current) {
               const master = ctx.createGain();
               master.gain.setValueAtTime(breathSoundEnabledRef.current ? 1.0 : 0.0, ctx.currentTime);
               master.connect(ctx.destination);
               masterGainNodeRef.current = master;
           }
          
           const bufferSize = ctx.sampleRate * 2;
           const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
           const output = buffer.getChannelData(0);
           for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
           exhaleBufferRef.current = buffer;

           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_exhalev2.mp3").then(b => exhaleFullyBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/hummingbeev3.mp3").then(b => hummingBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/Long_inhale.mp3").then(b => longInhaleBufferRef.current = b);

           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_inhalefully_spoken.mp3").then(b => fireIntroBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_deep_inhale_spoken.mp3").then(b => fireInhaleHalfwayBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_exhalev2.mp3").then(b => fireExhaleBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_last_exhale_spoken.mp3").then(b => fireLastExhaleBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_hold.mp3").then(b => fireHoldBufferRef.current = b);
           // Removed: fire_breath_final_hold.mp3 - file not found (404)

           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/bhastrika_inhale.mp3").then(b => bhastrikaInhaleBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/bhastrika_exhale.mp3").then(b => bhastrikaExhaleBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/exhalelast.mp3").then(b => bhastrikaLastExhaleBufferRef.current = b);

           // LOAD NEW ABHI CUES
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "Inhale6.mp3").then(b => inhale6BufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "hold3.mp3").then(b => hold3BufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "Exhale9.mp3").then(b => exhale9BufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "Inhale4box.mp3").then(b => inhale4boxBufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "hold7.mp3").then(b => hold7BufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "exhale8.mp3").then(b => exhale8BufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "Hold4box.mp3").then(b => hold4boxBufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "Exhale4Box.mp3").then(b => exhale4boxBufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "Hold4box2.mp3").then(b => hold4box2BufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "inhaleleft.mp3").then(b => inhaleLeftBufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "exhaleRight.mp3").then(b => exhaleRightBufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "inhaleRight.mp3").then(b => inhaleRightBufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "exhaleLeft.mp3").then(b => exhaleLeftBufferRef.current = b);
           loadAudioBuffer(ctx, ABHI_AUDIO_BASE + "hold.mp3").then(b => genericHoldBufferRef.current = b);
           // Removed: bell.mp3 - file not found (404)
           
           // LOAD OM INTEGRATION CUES
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/Long_inhale.mp3").then(b => omInhaleBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/om%20sound.mp3").then(b => omExhaleBufferRef.current = b);
           
           // LOAD INSTRUCTION PREVIEW CUES (for TRANSITION view)
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/boxbreathingaudio.mp3").then(b => boxBreathingInstructionBufferRef.current = b);
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/478breathingaudio.mp3").then(b => rest478InstructionBufferRef.current = b);
           
           // LOAD CHIME SOUND (for end of rest and integration)
           loadAudioBuffer(ctx, "https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/chimes.mp3").then(b => chimeBufferRef.current = b);

       } catch (e) { console.error("Failed to initialize audio", e); }
   };
   initAudio();
   return () => { if (audioContextRef.current) audioContextRef.current.close(); };
 }, []);

 // Apply mute/unmute by changing master gain only (no timer resets).
 useEffect(() => {
     const ctx = audioContextRef.current;
     const master = masterGainNodeRef.current;
     if (!ctx || !master) return;
     // If enabling sound, try to resume context (gesture already happened).
     if (breathSoundEnabled && ctx.state === 'suspended') {
         ctx.resume().catch(() => {});
     }
     const t = ctx.currentTime;
     // Smooth ramp to avoid clicks.
     master.gain.cancelScheduledValues(t);
     master.gain.setValueAtTime(master.gain.value, t);
     master.gain.linearRampToValueAtTime(breathSoundEnabled ? 1.0 : 0.0, t + 0.08);
 }, [breathSoundEnabled]);

 const playBell = useCallback(() => {
     if (!audioContextRef.current || !bellBufferRef.current || !masterGainNodeRef.current) return;
     if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
     try {
         const source = audioContextRef.current.createBufferSource();
         source.buffer = bellBufferRef.current;
         source.connect(masterGainNodeRef.current);
         source.start();
     } catch (e) { console.error("Error playing bell", e); }
 }, []);

 const playChime = useCallback(() => {
     if (!audioContextRef.current || !chimeBufferRef.current || !masterGainNodeRef.current) return;
     if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
     try {
         const source = audioContextRef.current.createBufferSource();
         source.buffer = chimeBufferRef.current;
         source.connect(masterGainNodeRef.current);
         source.start();
     } catch (e) { console.error("Error playing chime", e); }
 }, []);

/**
 * Get transition duration for a specific pattern
 */
const getTransitionDuration = (patternId: string | undefined, isOmTransition: boolean = false): number => {
     if (isOmTransition) return PATTERN_TRANSITION_DURATIONS['OM_INTEGRATION'] || 8;
     if (!patternId) return 9; // Default fallback
     return PATTERN_TRANSITION_DURATIONS[patternId] || 9;
};

const advanceToTransition = useCallback(() => { 
     setPhase(BreathPhase.IDLE); 
     // Stop music immediately when skipping rest
     setShouldStopMusicImmediate(true);
     // Get pattern-specific duration - check if transitioning to OM_INTEGRATION or next round
     const duration = isTransitioningToOm 
         ? getTransitionDuration(undefined, true) 
         : getTransitionDuration(plan?.rounds[currentRoundIndex]?.patternId, false);
     setTransitionTimeLeft(duration); 
     setView('TRANSITION'); 
     playChime(); // End of Rest & Integrate - play chime sound
     // Reset immediate stop flag after a brief delay to allow music to stop
     setTimeout(() => setShouldStopMusicImmediate(false), 100);
 }, [isTransitioningToOm, plan, currentRoundIndex, playChime]);

 /**
  * Play instruction preview audio cue for TRANSITION view
  */
 const playInstructionPreviewAudio = useCallback((patternId: string) => {
     if (!audioContextRef.current || !masterGainNodeRef.current) return;
     if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
     
     try {
         const ctx = audioContextRef.current;
         let bufferToUse: AudioBuffer | null = null;
         
         if (patternId === 'FOCUS') {
             bufferToUse = boxBreathingInstructionBufferRef.current;
         } else if (patternId === 'REST') {
             bufferToUse = rest478InstructionBufferRef.current;
         }
         
         if (bufferToUse) {
             const source = ctx.createBufferSource();
             const gainNode = ctx.createGain();
             source.buffer = bufferToUse;
             gainNode.gain.setValueAtTime(0.8, ctx.currentTime);
             source.connect(gainNode).connect(masterGainNodeRef.current);
             source.start();
         }
     } catch (e) { 
         console.error("Error playing instruction preview audio", e); 
     }
 }, []);

const playBreathSound = useCallback((type: 'EXHALE' | 'INHALE' | 'DEEP_INHALE' | 'FIRE_INTRO' | 'FIRE_EXHALE_FULLY' | 'FIRE_HOLD' | 'FIRE_FINAL_HOLD' | 'FIRE_INHALE_HALFWAY' | 'HOLD' | 'HOLD_EMPTY' | 'RECOVERY_EXHALE') => {
     if (!audioContextRef.current || !masterGainNodeRef.current) return;
     if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
     try {
       const ctx = audioContextRef.current;
       const source = ctx.createBufferSource();
       const gainNode = ctx.createGain();

       const patternId = activeRound?.patternId;
       const remaining = activeRound ? Math.max(1, activeRound.durationCycles - cycleCount) : 0;
       const isExhaleFullyState = (type === 'EXHALE' && (
           (activeRound?.isFirePattern && remaining === 1) ||
           (isRetention && fireSequencePhase === 'SQUEEZE')
       ));

       let bufferToUse = null;

       // Check if we're in OM_INTEGRATION view and use OM-specific cues
       if (view === 'OM_INTEGRATION') {
           if (type === 'INHALE') {
               bufferToUse = omInhaleBufferRef.current || longInhaleBufferRef.current; // Fallback to long inhale if OM inhale not available
           } else if (type === 'EXHALE') {
               bufferToUse = omExhaleBufferRef.current || hummingBufferRef.current; // Fallback to humming if OM exhale not available
           }
       } else if (type === 'FIRE_INTRO') bufferToUse = fireIntroBufferRef.current;
       else if (type === 'FIRE_INHALE_HALFWAY') bufferToUse = fireInhaleHalfwayBufferRef.current;
       else if (type === 'FIRE_EXHALE_FULLY') bufferToUse = fireLastExhaleBufferRef.current;
       else if (type === 'FIRE_HOLD') bufferToUse = fireHoldBufferRef.current;
       else if (type === 'FIRE_FINAL_HOLD') bufferToUse = fireFinalHoldBufferRef.current;
       else if (type === 'DEEP_INHALE') bufferToUse = longInhaleBufferRef.current;
       else if (type === 'INHALE') {
           if (patternId === 'BHASTRIKA') bufferToUse = bhastrikaInhaleBufferRef.current;
           else if (patternId === 'BHRAMARI') bufferToUse = longInhaleBufferRef.current;
           else if (patternId === 'CALM') bufferToUse = inhale6BufferRef.current;
           else if (patternId === 'REST') bufferToUse = inhale4boxBufferRef.current;
           else if (patternId === 'FOCUS') bufferToUse = inhale4boxBufferRef.current;
           else if (patternId === 'BALANCE') bufferToUse = (cycleCount % 2 === 0) ? inhaleLeftBufferRef.current : inhaleRightBufferRef.current;
       } else if (type === 'HOLD') {
           if (patternId === 'CALM') bufferToUse = hold3BufferRef.current;
           else if (patternId === 'REST') bufferToUse = hold7BufferRef.current;
           else if (patternId === 'FOCUS') bufferToUse = hold4boxBufferRef.current;
           else bufferToUse = genericHoldBufferRef.current; // Map hold.mp3 to all other holds (e.g. Alternate Nostril)
       } else if (type === 'EXHALE') {
           if (patternId === 'ENERGY') {
               if (isRetention && fireSequencePhase === 'SQUEEZE') bufferToUse = fireLastExhaleBufferRef.current;
               else bufferToUse = fireExhaleBufferRef.current;
           } else if (patternId === 'BHASTRIKA') {
               if (isRetention && fireSequencePhase === 'SQUEEZE') bufferToUse = bhastrikaLastExhaleBufferRef.current;
               else bufferToUse = bhastrikaExhaleBufferRef.current;
           } else if (isExhaleFullyState) bufferToUse = exhaleFullyBufferRef.current;
           else if (patternId === 'BHRAMARI') bufferToUse = hummingBufferRef.current;
           else if (patternId === 'CALM') bufferToUse = exhale9BufferRef.current;
           else if (patternId === 'REST') bufferToUse = exhale8BufferRef.current;
           else if (patternId === 'FOCUS') bufferToUse = exhale4boxBufferRef.current;
           else if (patternId === 'BALANCE') bufferToUse = (cycleCount % 2 === 0) ? exhaleRightBufferRef.current : exhaleLeftBufferRef.current;
           else bufferToUse = exhaleBufferRef.current;
      } else if (type === 'HOLD_EMPTY') {
          if (patternId === 'FOCUS') bufferToUse = hold4box2BufferRef.current;
          else bufferToUse = genericHoldBufferRef.current;
      } else if (type === 'RECOVERY_EXHALE') {
          // Use the long Bhastrika recovery exhale sound for all
          // "slow exhale & recover" phases across patterns
          bufferToUse = bhastrikaLastExhaleBufferRef.current;
      }

       if (bufferToUse) {
            source.buffer = bufferToUse;
            gainNode.gain.setValueAtTime(patternId === 'BHRAMARI' ? 1.0 : 0.8, ctx.currentTime);
            source.connect(gainNode).connect(masterGainNodeRef.current);
            source.start();
       }
     } catch (e) { console.error("Error playing breath sound", e); }
 }, [activeRound, cycleCount, isRetention, fireSequencePhase, remainingCycles, view]);

 const finishRound = useCallback(() => {
     clearTimers();
     // Add current round's cycles to total before moving to next round or OM
     if (cycleCount > 0) {
         setTotalSessionCycles(prev => prev + cycleCount);
     }
     // Reset music stop flag when entering REST phase
     setShouldStopMusicImmediate(false);
     // Force new track selection when entering a new REST phase
     restMusicService.resetTrack();
     if (plan && currentRoundIndex < plan.rounds.length - 1) { 
         setRestTimeLeft(30); 
         setView('REST'); 
         playBell(); // Start of Rest & Integrate
         setCurrentRoundIndex(prev => prev + 1);
         setIsTransitioningToOm(false);
     }
     else { 
         setIsTransitioningToOm(true);
         setRestTimeLeft(30); 
         setView('REST'); 
         playBell(); // Start of Rest & Integrate
     }
 }, [plan, currentRoundIndex, playBell, cycleCount]);

// Preload all videos for the plan (and cache them on device when possible)
const preloadVideos = useCallback(async (planToPreload: RitualPlan) => {
    // Preload all round videos
    for (const round of planToPreload.rounds) {
        const patternId = round.patternId;
        // Skip SVG-based tutorials that don't use external video files
        if (patternId === 'FOCUS' || patternId === 'REST') continue;

        const remoteUrl = getPatternVideo(patternId);
        if (!remoteUrl || preloadedVideosRef.current.has(remoteUrl)) continue;

        try {
            const cachedSrc = await getCachedVideoSrc(remoteUrl);
            const video = document.createElement('video');
            video.src = cachedSrc;
            video.preload = 'auto';
            video.load();
            preloadedVideosRef.current.set(remoteUrl, video);
            preloadedVideoSrcRef.current.set(remoteUrl, cachedSrc);
        } catch (err) {
            console.warn('[MorningRitual] Failed to preload video', remoteUrl, err);
        }
    }
    
    // Preload OM integration video
    const omRemoteUrl = getPatternVideo('OM_INTEGRATION');
    if (omRemoteUrl && !preloadedVideosRef.current.has(omRemoteUrl)) {
        try {
            const cachedSrc = await getCachedVideoSrc(omRemoteUrl);
            const video = document.createElement('video');
            video.src = cachedSrc;
            video.preload = 'auto';
            video.load();
            preloadedVideosRef.current.set(omRemoteUrl, video);
            preloadedVideoSrcRef.current.set(omRemoteUrl, cachedSrc);
        } catch (err) {
            console.warn('[MorningRitual] Failed to preload OM video', omRemoteUrl, err);
        }
    }
}, []);

useEffect(() => {
  if (view === 'LOADING' && !plan) {
      const initialMode: PracticeMode = 'ENERGY';
      setSelectedMode(initialMode);
      const generatedPlan = generateAdaptiveRitual(null, stats.sessionsCompleted, patternProgress, userPreferences, initialMode);
      setPlan(generatedPlan);
      // Preload all videos immediately when plan is generated
      preloadVideos(generatedPlan);
      const idx = TIME_INTENTS.findIndex(i => i.id === generatedPlan.intent);
      if (idx !== -1) setSelectedIndex(idx);
      setTimeout(() => setLoadingText(`analyzing ${stats.sessionsCompleted} past sessions...`), 800);
      setTimeout(() => setLoadingText("optimizing flow for energy..."), 1800);
      setTimeout(() => { setLoadingText("ready."); setTimeout(() => setView('SUMMARY'), 800); }, 2800);

     // Best-effort: nudge a personalized recommendation into the notification system
     maybeSendBreathworkRecommendation(stats, patternProgress, userPreferences).catch((err) => {
       console.warn('[MorningRitual] Failed to enqueue recommendation', err);
     });
  }
}, []);

useEffect(() => {
  if (view === 'CHECKIN' && plan) {
    // Warm the cache in the background while user adjusts settings
    preloadVideos(plan);
  }
}, [view, plan, preloadVideos]);

// Resolve and cache the current transition video URL whenever the round or mode changes
useEffect(() => {
  if (view !== 'TRANSITION') return;
  setIsTransitionVideoReady(false);
  transitionVideoLoadStartRef.current = performance.now();
  if (transitionVideoFallbackTimerRef.current) {
    window.clearTimeout(transitionVideoFallbackTimerRef.current);
  }
  transitionVideoFallbackTimerRef.current = window.setTimeout(() => {
    setIsTransitionVideoReady(true);
  }, 2500);

  const isOmTransition = isTransitioningToOm;
  const nextRound = isOmTransition ? null : plan?.rounds[currentRoundIndex];
  const patternId = isOmTransition ? 'OM_INTEGRATION' : nextRound?.patternId;

  if (!patternId) {
    setTransitionVideoUrl('');
    setIsTransitionVideoReady(true);
    return;
  }

  // For FOCUS/REST we show SVG tutorials, no external videos
  if (patternId === 'FOCUS' || patternId === 'REST') {
    setTransitionVideoUrl('');
    setIsTransitionVideoReady(true);
    return;
  }

  const remoteUrl = getPatternVideo(patternId);
  if (!remoteUrl) {
    setTransitionVideoUrl('');
    setIsTransitionVideoReady(true);
    return;
  }

  const preloadedSrc = preloadedVideoSrcRef.current.get(remoteUrl);
  if (preloadedSrc) {
    setTransitionVideoUrl(preloadedSrc);
    return;
  }

  let cancelled = false;

  getCachedVideoSrc(remoteUrl)
    .then((src) => {
      if (!cancelled) {
        preloadedVideoSrcRef.current.set(remoteUrl, src);
        setTransitionVideoUrl(src);
      }
    })
    .catch(() => {
      if (!cancelled) {
        // Fallback to original URL if caching fails
        setTransitionVideoUrl(remoteUrl);
      }
    });

  return () => {
    cancelled = true;
    if (transitionVideoFallbackTimerRef.current) {
      window.clearTimeout(transitionVideoFallbackTimerRef.current);
      transitionVideoFallbackTimerRef.current = null;
    }
  };
}, [view, isTransitioningToOm, plan, currentRoundIndex]);

 // Auto-start countdown removed - users now manually start the session

 const handleManualStart = () => {
     const selectedIntent = TIME_INTENTS[selectedIndex];
     const generatedPlan = generateAdaptiveRitual(selectedIntent.id as TimeIntentType, stats.sessionsCompleted, patternProgress, userPreferences, selectedMode);
     setPlan(generatedPlan);
     // Preload all videos immediately when plan is updated
     preloadVideos(generatedPlan);
     setView('LOADING');
     setTimeout(() => setLoadingText(`recalibrating for ${selectedIntent.label.toLowerCase()}...`), 500);
     setTimeout(() => setLoadingText(selectedMode === 'CALM' ? "prioritizing relaxation..." : "adjusting intensity..."), 1500);
     setTimeout(() => { setLoadingText("ready."); setTimeout(() => setView('SUMMARY'), 800); }, 2500);
 };

 const handleModeSwitch = (mode: PracticeMode) => {
     setSelectedMode(mode);
     const selectedIntent = TIME_INTENTS[selectedIndex];
     const newPlan = generateAdaptiveRitual(selectedIntent.id as TimeIntentType, stats.sessionsCompleted, patternProgress, userPreferences, mode);
     setPlan(newPlan);
     // Preload all videos immediately when plan is updated
     preloadVideos(newPlan);
 };

 useEffect(() => {
     if (view === 'BREATHE' && !isRetention && !isPaused && fireSequencePhase === 'ACTIVE') {
           const runBreathCycle = () => {
           const p = activePattern;
           if (!p) return;
           
           setPhase(BreathPhase.INHALE);
           playBreathSound('INHALE');
           timerRef.current = window.setTimeout(() => {
               if (p.hold && p.hold > 0) {
                   setPhase(BreathPhase.HOLD);
                   playBreathSound('HOLD');
                   timerRef.current = window.setTimeout(() => {
                       setPhase(BreathPhase.EXHALE);
                       playBreathSound('EXHALE');
                       timerRef.current = window.setTimeout(() => {
                           if (p.holdEmpty && p.holdEmpty > 0) {
                                setPhase(BreathPhase.HOLD_EMPTY);
                                playBreathSound('HOLD_EMPTY');
                                timerRef.current = window.setTimeout(() => completeCycle(), p.holdEmpty * 1000);
                           } else completeCycle();
                       }, p.exhale * 1000);
                   }, p.hold * 1000);
               } else {
                   setPhase(BreathPhase.EXHALE);
                   playBreathSound('EXHALE');
                   timerRef.current = window.setTimeout(() => {
                       if (p.holdEmpty && p.holdEmpty > 0) {
                            setPhase(BreathPhase.HOLD_EMPTY);
                            playBreathSound('HOLD_EMPTY');
                            timerRef.current = window.setTimeout(() => completeCycle(), p.holdEmpty * 1000);
                       } else completeCycle();
                   }, p.exhale * 1000);
               }
           }, p.inhale * 1000);
         };
         runBreathCycle();
     }
     return () => clearTimers();
 }, [cycleCount, view, isRetention, isPaused, fireSequencePhase, playBreathSound, activePattern, activeRound, remainingCycles, finishRound]);

 // OM Integration breathing cycle logic (similar to BHRAMARI)
 useEffect(() => {
     if (view === 'OM_INTEGRATION' && !isPaused) {
         const omPattern = PATTERNS.BHRAMARI; // Use same pattern as Humming Bee
         const targetOm = plan?.omCount || 3;
         
        if (omCyclesCompleted >= targetOm) {
            // Add final OM cycles to total before transitioning
            // Note: The last round's cycles were already added in finishRound, so we just add OM cycles
            setTotalSessionCycles(prev => prev + omCyclesCompleted);
            setTimeout(() => setView('GRATITUDE'), 2000);
            return;
        }

         const runOmCycle = () => {
             setPhase(BreathPhase.INHALE);
             playBreathSound('INHALE');
             timerRef.current = window.setTimeout(() => {
                 setPhase(BreathPhase.EXHALE);
                 playBreathSound('EXHALE');
                 timerRef.current = window.setTimeout(() => {
                     setOmCyclesCompleted(prev => prev + 1);
                     setCycleCount(prev => prev + 1);
                 }, omPattern.exhale * 1000);
             }, omPattern.inhale * 1000);
         };
         
         runOmCycle();
     }
     return () => clearTimers();
 }, [omCyclesCompleted, view, isPaused, plan, playBreathSound]);

 // Save ritual result to API when all exercises finish (GRATITUDE view)
 useEffect(() => {
     if (view !== 'GRATITUDE' || !plan) return;
     setSavingResult(true);
     const actualDurationSec = sessionStartTime
         ? Math.round((Date.now() - sessionStartTime) / 1000)
         : undefined;
     saveMorningRitualResult({
         plan: {
             intent: plan.intent,
             practiceMode: plan.practiceMode,
             rounds: plan.rounds.map(r => ({
                 id: r.id,
                 patternId: r.patternId,
                 name: r.name,
                 durationCycles: r.durationCycles,
                 intensity: r.intensity,
                 speedMultiplier: r.speedMultiplier,
                 description: r.description,
                 retentionType: r.retentionType,
                 retentionDuration: r.retentionDuration,
             })),
             omCount: plan.omCount,
             totalDurationMin: plan.totalDurationMin,
             totalSeconds: plan.totalSeconds,
             userLevel: plan.userLevel,
         },
         actualDurationSec,
         roundsCompleted: plan.rounds.length,
         totalCycles: totalSessionCycles + cycleCount,
         calmPointsEarned: 150,
         metadata: { omCyclesCompleted },
     }).finally(() => setSavingResult(false));
 }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

 const completeCycle = () => {
     setCycleCount(prev => {
         const newCount = prev + 1;
         // For BALANCE (Alternate Nostril), check completion based on full cycles
         // durationCycles represents individual nostril actions, so we need to check if all actions are done
         if (activeRound && activeRound.patternId === 'BALANCE') {
             if (newCount >= activeRound.durationCycles) {
                 // Other patterns with retention (like BALANCE) use retention phase
                 if (activeRound.retentionDuration && activeRound.retentionDuration > 0) {
                     runStandardRetentionPhase(activeRound);
                 } else {
                     finishRound();
                 }
             }
         } else if (activeRound && newCount >= activeRound.durationCycles) {
             // Fire patterns (ENERGY, BHASTRIKA) go to retention phases
             if (activeRound.isFirePattern) { 
                 setIsRetention(true); 
                 setRetentionTimeLeft(8); 
                 setFireSequencePhase('SQUEEZE'); 
             }
             // REST and CALM patterns finish cleanly without retention
             else if (activeRound.patternId === 'REST' || activeRound.patternId === 'CALM') {
                 finishRound();
             }
             // Other patterns with retention use retention phase
             else if (activeRound.patternId !== 'FOCUS' && activeRound.retentionDuration && activeRound.retentionDuration > 0) {
                 runStandardRetentionPhase(activeRound);
             }
             // FOCUS and others without retention finish directly
             else {
                 finishRound();
             }
         }
         return newCount;
     });
 };

 const isFire = activeRound?.isFirePattern || activeRound?.patternId === 'BHRAMARI';
 const isFinalCycle = remainingCycles === 1;

 useEffect(() => {
   if (isFinalCycle && !hideFinalBreathUI) {
       setShowExhaleFullyHint(true);
       const timer = setTimeout(() => {
           setShowExhaleFullyHint(false);
           setHideFinalBreathUI(true);
       }, 3000);
       return () => clearTimeout(timer);
   }
 }, [isFinalCycle, hideFinalBreathUI]);

 useEffect(() => {
     if (!isRetention && fireSequencePhase !== 'INTRO') return;
     if (!activeRound?.isFirePattern || isPaused || view !== 'BREATHE') return;

     let fireTimer: number;

     if (fireSequencePhase === 'INTRO') {
         if (fireIntroStep === 0) {
             setPhase(BreathPhase.INHALE); playBreathSound('FIRE_INTRO');
             fireTimer = window.setTimeout(() => setFireIntroStep(1), 3500);
         } else if (fireIntroStep === 1) {
             setPhase(BreathPhase.EXHALE); playBreathSound('FIRE_EXHALE_FULLY');
             fireTimer = window.setTimeout(() => setFireIntroStep(2), 3500);
         } else if (fireIntroStep === 2) {
             setPhase(BreathPhase.INHALE); playBreathSound('FIRE_INHALE_HALFWAY');
             fireTimer = window.setTimeout(() => { setFireSequencePhase('ACTIVE'); setFireIntroStep(0); }, 3000);
         }
     }
     else if (fireSequencePhase === 'SQUEEZE') {
         setPhase(BreathPhase.EXHALE);
         playBreathSound('EXHALE'); 
         const squeezeLastExhaleMs = activeRound?.patternId === 'BHASTRIKA' ? 2500 : 1500;
         fireTimer = window.setTimeout(() => {
             setPhase(BreathPhase.HOLD_EMPTY);
             playBreathSound('FIRE_HOLD'); 
             setRetentionTimeLeft(8);
         }, squeezeLastExhaleMs);
     }
     else if (fireSequencePhase === 'DEEP_INHALE') {
         setPhase(BreathPhase.INHALE);
         playBreathSound('DEEP_INHALE');
         fireTimer = window.setTimeout(() => { setFireSequencePhase('FINAL_RETENTION'); }, 5000);
     }
    else if (fireSequencePhase === 'FINAL_RETENTION') {
        setPhase(BreathPhase.HOLD);
        playBreathSound('FIRE_FINAL_HOLD');
        setRetentionTimeLeft(activeRound.retentionDuration || 15);
    }
    else if (fireSequencePhase === 'RECOVERY') {
        setPhase(BreathPhase.EXHALE);
        // Long exhale cue during "slow exhale & recover" for fire patterns
        playBreathSound('RECOVERY_EXHALE');
        fireTimer = window.setTimeout(() => { setIsRetention(false); setFireSequencePhase('ACTIVE'); finishRound(); }, 5000);
    }

     return () => { if (fireTimer) window.clearTimeout(fireTimer); };
 }, [isRetention, fireSequencePhase, fireIntroStep, isPaused, view, activeRound, playBreathSound]);

 // Alternate Nostril (BALANCE) recovery: "slow exhale & recover" then finish round
 useEffect(() => {
     if (activeRound?.patternId !== 'BALANCE' || fireSequencePhase !== 'RECOVERY' || view !== 'BREATHE' || isPaused) return;
     const t = window.setTimeout(() => {
         setFireSequencePhase('ACTIVE');
         finishRound();
     }, 5000);
     return () => window.clearTimeout(t);
 }, [activeRound?.patternId, fireSequencePhase, view, isPaused]);

 useEffect(() => {
     if (isRetention && retentionTimeLeft === 0 && !isPaused) {
         if (fireSequencePhase === 'SQUEEZE' && phase === BreathPhase.HOLD_EMPTY) setFireSequencePhase('DEEP_INHALE');
         else if (fireSequencePhase === 'FINAL_RETENTION' && phase === BreathPhase.HOLD) setFireSequencePhase('RECOVERY');
         else if (!activeRound?.isFirePattern) {
             if (activeRound?.patternId === 'BALANCE') {
                 setPhase(BreathPhase.EXHALE);
                // Long exhale cue during "slow exhale & recover" for BALANCE recovery
                playBreathSound('RECOVERY_EXHALE');
                 setFireSequencePhase('RECOVERY');
                 setIsRetention(false);
             } else {
                 setIsRetention(false);
                 finishRound();
             }
         }
    }
}, [isRetention, retentionTimeLeft, isPaused, fireSequencePhase, phase, activeRound, playBreathSound]);

 const runStandardRetentionPhase = (round: RitualRound) => {
     setIsRetention(true);
     const duration = round.retentionDuration || 10;
     setRetentionTimeLeft(duration);
     if (round.retentionType === 'HOLD_EMPTY') {
         setPhase(BreathPhase.EXHALE); playBreathSound('EXHALE');
         setTimeout(() => setPhase(BreathPhase.HOLD_EMPTY), 1500);
     } else {
         setPhase(BreathPhase.INHALE); playBreathSound('DEEP_INHALE');
         setTimeout(() => setPhase(BreathPhase.HOLD), 2000);
     }
 };

 useEffect(() => {
     if (isRetention && retentionTimeLeft > 0 && !isPaused && (phase === BreathPhase.HOLD || phase === BreathPhase.HOLD_EMPTY || phase === BreathPhase.INHALE || phase === BreathPhase.EXHALE)) {
         const timer = setInterval(() => setRetentionTimeLeft(prev => Math.max(0, prev - 1)), 1000);
         return () => clearInterval(timer);
     }
 }, [isRetention, retentionTimeLeft, isPaused, phase]);

 const startRound = () => {
     clearTimers(); 
     // Track session start time on first round
     if (sessionStartTime === null && currentRoundIndex === 0) {
         setSessionStartTime(Date.now());
     }
     // Add previous round's cycles to total before resetting
     if (cycleCount > 0) {
         setTotalSessionCycles(prev => prev + cycleCount);
     }
     setCycleCount(0); 
     setIsRetention(false);
     if (activeRound?.patternId === 'ENERGY') { setFireSequencePhase('INTRO'); setFireIntroStep(0); } else setFireSequencePhase('ACTIVE');
     setHideFinalBreathUI(false); setView('BREATHE');
 };

 // Handle PREPARATION countdown with fade out animation
 useEffect(() => {
     if (view === 'PREPARATION' && !isPaused) {
         const interval = setInterval(() => {
             setPreparationCountdown(prev => {
                 if (prev <= 1) {
                     clearInterval(interval);
                     setTimeout(() => {
                        if (isTransitioningToOm) {
                            runOmIntegration();
                            setView('OM_INTEGRATION');
                        } else {
                            startRound();
                        }
                     }, 600);
                     return 0;
                 }
                 return prev - 1;
             });
         }, 1000);
         return () => clearInterval(interval);
     }
}, [view, isPaused, isTransitioningToOm]);

 useEffect(() => {
     if (view === 'REST' && !isPaused) {
         const interval = setInterval(() => { 
             setRestTimeLeft(prev => { 
                 if (prev <= 1) { 
                     clearInterval(interval); 
                     // Normal transition - fade out music (not immediate)
                     // Music will fade out when view changes to TRANSITION
                     setShouldStopMusicImmediate(false);
                     advanceToTransition(); 
                     return 0; 
                 } 
                 return prev - 1; 
             }); 
         }, 1000);
         return () => clearInterval(interval);
     }
 }, [view, isPaused, advanceToTransition]);

 // Play instruction preview audio when entering TRANSITION view
 useEffect(() => {
     if (view === 'TRANSITION' && !isTransitioningToOm) {
         const nextRound = plan?.rounds[currentRoundIndex];
         if (nextRound && (nextRound.patternId === 'FOCUS' || nextRound.patternId === 'REST')) {
             // Play instruction preview audio for Box Breathing (FOCUS) and Relax (REST) patterns
             playInstructionPreviewAudio(nextRound.patternId);
         }
     }
 }, [view, currentRoundIndex, plan, isTransitioningToOm, playInstructionPreviewAudio]);

 useEffect(() => {
     if (view === 'TRANSITION' && !isPaused) {
         const interval = setInterval(() => { 
             setTransitionTimeLeft(prev => { 
                 if (prev <= 1) { 
                     clearInterval(interval); 
                    // Transition to PREPARATION screen with computed duration
                    // Handle both regular rounds and OM Integration
                    if (isTransitioningToOm) {
                        const config = PREPARE_CUE_CONFIG['OM_INTEGRATION'];
                        if (config) {
                            const duration = computePrepareDurationSeconds(config);
                            setPrepareCueDuration(duration);
                            setPreparationCountdown(duration);
                        } else {
                            setPrepareCueDuration(6);
                            setPreparationCountdown(6);
                        }
                        setView('PREPARATION');
                    } else {
                        const nextRound = plan?.rounds[currentRoundIndex];
                        if (nextRound) {
                            const config = PREPARE_CUE_CONFIG[nextRound.patternId];
                            if (config) {
                                const duration = computePrepareDurationSeconds(config);
                                setPrepareCueDuration(duration);
                                setPreparationCountdown(duration);
                            } else {
                                setPrepareCueDuration(6);
                                setPreparationCountdown(6);
                            }
                        } else {
                            setPrepareCueDuration(6);
                            setPreparationCountdown(6);
                        }
                        setView('PREPARATION');
                    }
                     return 0; 
                 } 
                 return prev - 1; 
             }); 
         }, 1000);
         return () => clearInterval(interval);
     }
}, [view, isPaused, isTransitioningToOm, currentRoundIndex, plan]);

    const runOmIntegration = () => {
        setOmCyclesCompleted(0);
        setCycleCount(0);
        setPhase(BreathPhase.INHALE);
        // Start the first cycle
    };

 const handleFinish = () => { addCalmPoints(150); incrementStreak(); navigate('/'); };

 const getPhaseLabel = (p: BreathPhase) => {
     // OM Integration labels
     if (view === 'OM_INTEGRATION') {
         if (p === BreathPhase.INHALE) return "inhale";
         if (p === BreathPhase.EXHALE) return "ॐ";
         return "ready...";
     }
     if (fireSequencePhase === 'RECOVERY') return "slow exhale & recover";
     
     if (fireSequencePhase === 'INTRO') {
         if (fireIntroStep === 0) return "inhale fully";
         if (fireIntroStep === 1) return "exhale fully";
         if (fireIntroStep === 2) return "inhale halfway";
     }
     if (isRetention) {
         if (activeRound?.isFirePattern) {
             if (fireSequencePhase === 'SQUEEZE') return p === BreathPhase.HOLD_EMPTY ? "squeeze & hold" : "exhale fully";
             if (fireSequencePhase === 'DEEP_INHALE') return "deep inhale...";
             if (fireSequencePhase === 'FINAL_RETENTION') return "final hold";
             // fireSequencePhase === 'RECOVERY' is handled at the top of getPhaseLabel
         }
         if (activeRound?.retentionType === 'HOLD_EMPTY') return p === BreathPhase.HOLD_EMPTY ? "squeeze & hold" : "exhale fully";
         return p === BreathPhase.HOLD ? "retain breath" : "deep inhale";
     }
     if (!activeRound) return "";
     
     if (remainingCycles === 1 && !isRetention && fireSequencePhase !== 'INTRO') {
         if (p === BreathPhase.INHALE) return "last one!";
         if (p === BreathPhase.EXHALE) {
             if (activeRound?.patternId === 'BHRAMARI') return "hmmm...";
             return "exhale fully";
         }
     }
     
     if (p === BreathPhase.INHALE) return activePattern.labels?.INHALE || "inhale";
     if (p === BreathPhase.HOLD) return activePattern.labels?.HOLD || "hold";
     if (p === BreathPhase.EXHALE) return activePattern.labels?.EXHALE || "exhale";
     if (p === BreathPhase.HOLD_EMPTY) return activePattern.labels?.HOLD_EMPTY || "hold";
     return "ready...";
 };

 const currentPhaseDuration = useMemo(() => {
    // For OM Integration, use BHRAMARI pattern timings
    const patternToUse = view === 'OM_INTEGRATION' ? PATTERNS.BHRAMARI : activePattern;
    if (phase === BreathPhase.INHALE) return patternToUse.inhale;
    if (phase === BreathPhase.HOLD) return patternToUse.hold || 0;
    if (phase === BreathPhase.EXHALE) return patternToUse.exhale;
    if (phase === BreathPhase.HOLD_EMPTY) return patternToUse.holdEmpty || 0;
    return 1;
 }, [phase, activePattern, view]);

 if (view === 'LOADING') {
     return (
         <div
             className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-brand-dark flex flex-col items-center justify-center p-8 text-center animate-fade-in overflow-hidden touch-none"
             style={{
                 paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))',
                 paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
             }}
         >
              <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full">
                  <BreathSphereVisual size="lg" />
                  <h2 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-goldLight to-brand-gold mb-2 animate-pulse mt-4">{loadingText}</h2>
              </div>
         </div>
     );
 }

 if (view === 'CHECKIN') {
     const selected = TIME_INTENTS[selectedIndex];
     return (
         <div className="h-[100dvh] w-full bg-[#0f172a] flex flex-col px-6 animate-fade-in text-white relative overflow-hidden transition-colors duration-1000">
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30 transition-all duration-1000 ${selected.colorClass}`}></div>
             <ScreenHeader
                 variant="dark"
                 title="Adjust Session"
                 onBack={() => setView('SUMMARY')}
                 className="mb-4"
             />
             <div className="flex-1 flex flex-col items-center justify-between min-h-0 z-10 relative">
                 <div className="flex-1 flex items-center justify-center w-full max-h-[35vh]">
                     <div className={`rounded-full bg-gradient-to-br ${selected.gradient} shadow-2xl transition-all duration-700 ease-out flex items-center justify-center relative ${selected.glowClass}`} style={{ width: `${130 + (selectedIndex * 25)}px`, height: `${130 + (selectedIndex * 25)}px` }}>
                         <selected.icon size={48 + (selectedIndex * 6)} className="text-white drop-shadow-md relative z-10 animate-pulse-slow" />
                     </div>
                 </div>
                 <div className="shrink-0 text-center space-y-2 mb-4 w-full">
                     <h2 className="text-3xl font-serif font-bold tracking-tight">{selected.label}</h2>
                     <div className={`inline-block px-4 py-1.5 rounded-full bg-white/10 text-xs font-bold tracking-wide ${selected.textColor} mb-1`}>{selected.timeRange}</div>
                     <p className="text-white/60 max-w-xs mx-auto text-sm leading-relaxed line-clamp-2">{selected.description}</p>
                 </div>
                 <div className="w-full max-w-sm shrink-0 space-y-5">
                     <div className="relative w-full">
                         <div className="flex justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 px-1"><span>quick</span><span>deep</span></div>
                         <div className="relative h-2 bg-white/10 rounded-full">
                             <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${selected.colorClass}`} style={{ width: `${(selectedIndex / 3) * 100}%` }}></div>
                             <input 
                                type="range" 
                                min="0" 
                                max="3" 
                                step="1" 
                                value={selectedIndex} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isSubscribed && val > 0) {
                                        navigate('/subscription');
                                        return;
                                    }
                                    setSelectedIndex(val);
                                }} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                             />
                             <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 pointer-none z-10 flex items-center justify-center" style={{ left: `calc(${(selectedIndex / 3) * 100}% - 12px)` }}></div>
                             
                             {/* Lock indicators for non-premium users */}
                             {!isSubscribed && [1, 2, 3].map((idx) => (
                                <div 
                                    key={idx} 
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center pointer-events-none"
                                    style={{ left: `calc(${(idx / 3) * 100}% - 8px)` }}
                                >
                                    <Lock size={8} className="text-white/70" />
                                </div>
                             ))}
                         </div>
                     </div>
                       <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                           <div className="flex justify-between items-center mb-2"><div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Practice Mode</div><button className="text-white/30 hover:text-white/80 transition-colors"><Info size={12} /></button></div>
                           <div className="flex gap-2">
                               {(['ENERGY', 'BALANCED', 'CALM'] as PracticeMode[]).map(mode => {
                                   const isLocked = !isSubscribed && mode !== 'ENERGY';
                                   return (
                                       <button 
                                           key={mode} 
                                           onClick={() => {
                                               if (isLocked) {
                                                   navigate('/subscription');
                                               } else {
                                                   setSelectedMode(mode);
                                               }
                                           }} 
                                           className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                                               selectedMode === mode 
                                                   ? 'bg-white text-brand-dark border-white shadow-lg' 
                                                   : 'bg-transparent text-white/50 border-transparent'
                                           } ${isLocked ? 'opacity-60' : ''}`}
                                       >
                                           {mode}
                                           {isLocked && <Lock size={10} className="text-white/50" />}
                                       </button>
                                   );
                               })}
                           </div>
                      </div>
                 </div>
             </div>
             <div className="shrink-0 mt-4 z-10 relative" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}><button onClick={handleManualStart} className="w-full bg-white text-brand-dark py-4 rounded-2xl font-bold shadow-2xl shadow-blue-900/50 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 min-h-[56px]"><Play size={20} className="fill-current" /> Update Flow</button></div>
         </div>
     );
 }

if (view === 'SUMMARY') {
    return (
        <>
        <div className="h-[100dvh] w-full bg-[#1A4D5C] text-white flex flex-col overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-[#2F5A6C]/50 to-transparent pointer-events-none"></div>
            <div className="flex-1 flex flex-col max-w-md mx-auto w-full h-full relative z-10">
                <ScreenHeader
                    variant="dark"
                    title="Morning Ritual"
                    onBack={() => navigate('/')}
                    titleColor="text-brand-gold"
                />
                <div className="px-6 pb-4 shrink-0">
                    <div className="flex flex-col items-center w-full mt-2">
                        <div className="flex bg-black/20 rounded-2xl p-1 gap-1 mb-4 backdrop-blur-md">
                              {(['ENERGY', 'BALANCED', 'CALM'] as PracticeMode[]).map((mode) => {
                                  const isLocked = !isSubscribed && mode !== 'ENERGY';
                                  return (
                                      <button 
                                          key={mode} 
                                          onClick={() => {
                                              if (isLocked) {
                                                  navigate('/subscription');
                                              } else {
                                                  handleModeSwitch(mode);
                                              }
                                          }} 
                                          className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 ${
                                              selectedMode === mode 
                                                  ? 'bg-white text-brand-dark shadow-md scale-[1.02]' 
                                                  : 'text-white/40 hover:text-white hover:bg-white/5'
                                          } ${isLocked ? 'opacity-60' : ''}`}
                                      >
                                          {mode}
                                          {isLocked && <Lock size={10} />}
                                      </button>
                                  );
                              })}
                        </div>
                        <div className="px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest uppercase border border-white/20 bg-white/5">{plan?.totalDurationMin} MINS</div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3 no-scrollbar">
                    {plan?.rounds.map((round, i) => {
                        const techniqueInfo = getTechniqueInfo(round.patternId);
                        return (
                        <div key={i} className="flex gap-4 relative items-center">
                            {i < (plan.rounds.length) && <div className="absolute left-[11px] top-8 bottom-[-20px] w-px bg-white/10"></div>}
                            <div className="shrink-0 relative z-10 self-start mt-3"><div className="w-6 h-6 rounded-full border border-[#D4A574]/50 flex items-center justify-center text-[10px] font-bold text-[#D4A574] bg-[#1A4D5C]">{i + 1}</div></div>
                            <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm text-white">{round.name}</h3>
                                    {techniqueInfo && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTechniqueIntroForced(true);
                                                setShowTechniqueIntro(round.patternId);
                                            }}
                                            className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                            aria-label={`Learn about ${round.name}`}
                                        >
                                            <Info size={14} className="text-brand-gold" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-[10px] text-white/50 font-medium">{round.patternId === 'BALANCE' ? `${round.durationCycles / 2} cycles` : `${round.durationCycles} cycles`}</span>
                            </div>
                        </div>
                        );
                    })}
                    <div className="flex gap-4 relative items-center">
                        <div className="shrink-0 relative z-10 self-start mt-3"><div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold text-white/40 bg-[#1A4D5C]">{plan?.rounds.length + 1}</div></div>
                        <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm opacity-80 flex items-center justify-between"><h3 className="font-bold text-sm text-white">Integration</h3><span className="text-[10px] text-white/50 font-medium">om sounds</span></div>
                    </div>
                </div>
                <div className="px-6 pt-2 shrink-0 bg-gradient-to-t from-[#1A4D5C] via-[#1A4D5C] to-transparent" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
                     <button onClick={() => { setAutoStartEnabled(false); setView('CHECKIN'); }} className="w-full py-3 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2 mb-2"><Sliders size={14} /> Change session length</button>
                     <button onClick={() => { 
                         // Get pattern-specific duration for the first round
                         const firstRound = plan?.rounds[0];
                         const duration = getTransitionDuration(firstRound?.patternId, false);
                         setTransitionTimeLeft(duration); 
                         setView('TRANSITION'); 
                     }} className="w-full bg-white text-brand-dark py-4 rounded-2xl font-bold text-lg shadow-xl hover:scale-[1.02] transition-all">Start Session</button>
                </div>
            </div>
        </div>
        
        {/* Technique Intro Card */}
        {showTechniqueIntro && getTechniqueInfo(showTechniqueIntro) && (
          <TechniqueIntroCard
            technique={getTechniqueInfo(showTechniqueIntro)!}
            onStart={() => {
              setShowTechniqueIntro(null);
              setTechniqueIntroForced(false);
              // Start the practice immediately
              const firstRound = plan?.rounds[0];
              const duration = getTransitionDuration(firstRound?.patternId, false);
              setTransitionTimeLeft(duration);
              setView('TRANSITION');
            }}
            onClose={() => {
              setShowTechniqueIntro(null);
              setTechniqueIntroForced(false);
            }}
            forceShow={techniqueIntroForced}
          />
        )}
        </>
    );
 }

if (view === 'REST') {
  return (
      <div
          className="h-[100dvh] w-full bg-brand-dark text-white flex flex-col relative overflow-hidden transition-colors duration-1000"
          onClick={handleScreenTap}
      >
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2F5A6C_0%,_#0f172a_100%)] opacity-80"></div>
           {/* Header with controls - matching BREATHE view styling */}
           <div
               className={`absolute top-0 left-0 right-0 flex items-center justify-between px-6 z-20 transition-all duration-500 ${
                   isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
               }`}
               style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
           >
               <div className="text-xs font-bold tracking-widest opacity-90 uppercase flex items-center gap-2.5">
                   <span>rest & integrate</span>
               </div>
               <div className="flex items-center gap-4">
                   <button 
                       onClick={(e) => {
                           e.stopPropagation();
                           setBreathSoundEnabled(prev => !prev);
                       }} 
                       className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                       aria-label={breathSoundEnabled ? 'Mute sounds' : 'Unmute sounds'}
                   >
                       {breathSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-white/50" />}
                   </button>
                   <button
                       onClick={(e) => {
                           e.stopPropagation();
                           setIsPaused(true);
                       }}
                       className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                   >
                       <Pause size={20} fill="currentColor" />
                   </button>
               </div>
           </div>
           <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
                <p className="text-sm text-brand-light/70 font-medium tracking-widest uppercase mb-12">feel the spaciousness</p>
                <SandTimer duration={plan?.restSeconds || 30} timeLeft={restTimeLeft} />
           </div>
           <div
               className={`relative z-20 w-full flex justify-center transition-all duration-500 ${
                   isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
               }`}
               style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
           >
               <button
                   onClick={(e) => {
                       e.stopPropagation();
                       advanceToTransition();
                   }}
                   className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors flex items-center gap-2 py-4 px-8"
               >
                   Skip Rest <SkipForward size={12} />
               </button>
           </div>
            {isPaused && (
               <div className="fixed inset-0 z-50 bg-brand-dark/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
                   <h2 className="text-4xl font-serif font-bold mb-12 text-white">paused</h2>
                   <div className="space-y-4 w-full max-w-xs">
                       <button onClick={() => setIsPaused(false)} className="w-full py-4 bg-white text-brand-dark rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2"><Play size={20} fill="currentColor" /> Resume Practice</button>
                       <button onClick={() => navigate('/')} className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/20 flex items-center justify-center gap-2"><X size={20} /> Exit Practice</button>
                   </div>
               </div>
           )}
       </div>
   );
 }

if (view === 'TRANSITION') {
    const isOmTransition = isTransitioningToOm;
    const nextRound = isOmTransition ? null : plan?.rounds[currentRoundIndex];
    const details = isOmTransition 
        ? INSTRUCTION_DETAILS['OM_INTEGRATION'] 
        : (nextRound ? (INSTRUCTION_DETAILS[nextRound.patternId] || { title: nextRound.name, text: nextRound.description, icon: Sparkles }) : { title: '', text: '', icon: Sparkles });
    const Icon = details.icon;
    const videoUrl = transitionVideoUrl;
    const fallbackVideoUrl = isOmTransition
        ? getPatternVideo('OM_INTEGRATION')
        : (nextRound ? getPatternVideo(nextRound.patternId) : '');

    const handleTransitionVideoError = () => {
        setIsTransitionVideoReady(true);
        if (fallbackVideoUrl && fallbackVideoUrl !== videoUrl) {
            setTransitionVideoUrl(fallbackVideoUrl);
        }
    };
    
     return (
         <div className="h-[100dvh] w-full bg-brand-dark text-white flex flex-col items-center justify-center text-center animate-fade-in relative overflow-hidden">
             {!isTransitionVideoReady && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2F5A6C_0%,_#0f172a_70%)] opacity-80"></div>
                 <div className="relative z-10 flex flex-col items-center">
                   <div className="w-12 h-12 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mb-4" />
                   <p className="text-brand-gold/80 text-xs tracking-widest uppercase">loading cue...</p>
                 </div>
               </div>
             )}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#35637C_0%,_#1e293b_100%)]"></div>
             <div className="relative z-10 max-w-sm w-full flex flex-col items-center px-8" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                 {!isOmTransition && <div className="text-brand-gold font-bold tracking-widest text-xs uppercase mb-6">Round {currentRoundIndex + 1} of {plan?.rounds.length}</div>}
                {isOmTransition && <div className="text-brand-gold font-bold tracking-widest text-xs uppercase mb-6">Integration</div>}
                 <div className="w-full aspect-[4/3] bg-black/30 rounded-2xl overflow-hidden relative mb-8 border border-white/10 shadow-2xl">
                    {isOmTransition ? (
                        videoUrl && videoUrl.trim() !== '' ? (
                            <div className="w-full h-full relative">
                                <video
                                    src={videoUrl}
                                    autoPlay
                                    loop
                                    muted={transitionVideoMuted}
                                    playsInline
                                    preload="auto"
                                    onLoadedData={() => {
                                      setIsTransitionVideoReady(true);
                                      if (transitionVideoLoadStartRef.current) {
                                        const duration = performance.now() - transitionVideoLoadStartRef.current;
                                        console.info(`[MorningRitual] Transition video loaded in ${Math.round(duration)}ms`);
                                      }
                                    }}
                                    onError={handleTransitionVideoError}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-start justify-between p-3 pointer-events-none">
                                    <div />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTransitionVideoMuted((m) => !m);
                                            }}
                                            className="pointer-events-auto px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-[11px] font-semibold tracking-[0.18em] uppercase text-white border border-white/20 backdrop-blur-sm"
                                        >
                                            {transitionVideoMuted ? 'Unmute' : 'Mute'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Skip straight into OM integration breathing
                                                runOmIntegration();
                                                setView('OM_INTEGRATION');
                                            }}
                                            className="pointer-events-auto px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-[11px] font-semibold tracking-[0.18em] uppercase text-white border border-white/20 backdrop-blur-sm"
                                        >
                                            Skip
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null
                    ) : nextRound ? (
                        <PatternTutorial
                            patternId={nextRound.patternId}
                            videoUrl={videoUrl}
                            muted={transitionVideoMuted}
                            onToggleMute={() => setTransitionVideoMuted((m) => !m)}
                            onSkip={() => {
                                // Skip straight to the breathing round for this pattern
                                startRound();
                            }}
                            onLoadedData={() => {
                              setIsTransitionVideoReady(true);
                              if (transitionVideoLoadStartRef.current) {
                                const duration = performance.now() - transitionVideoLoadStartRef.current;
                                console.info(`[MorningRitual] Transition video loaded in ${Math.round(duration)}ms`);
                              }
                            }}
                            onError={handleTransitionVideoError}
                        />
                    ) : null}
                 </div>
                 <div className="text-center mb-8"><h2 className="text-2xl font-serif font-bold mb-3 flex items-center justify-center gap-2"><Icon size={24} className="text-brand-gold" /> {details.title}</h2><p className="text-white/70 text-sm leading-relaxed max-w-xs mx-auto">{details.text}</p></div>
                 {!isOmTransition && nextRound && <div className="mb-4"><div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">duration</div><div className="text-xl font-mono text-white font-bold">{nextRound.patternId === 'BALANCE' ? `${nextRound.durationCycles / 2} cycles` : `${nextRound.durationCycles} cycles`}</div></div>}
                 {isOmTransition && plan && <div className="mb-4"><div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">duration</div><div className="text-xl font-mono text-white font-bold">{plan.omCount} om chants</div></div>}
                 <div className="text-[8rem] font-bold text-white/10 leading-none absolute bottom-[-4rem] pointer-events-none">{transitionTimeLeft}</div>
             </div>
             {isPaused && (
              <div className="fixed inset-0 z-50 bg-brand-dark/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
                  <h2 className="text-4xl font-serif font-bold mb-12 text-white">paused</h2>
                  <div className="space-y-4 w-full max-w-xs">
                      <button onClick={() => setIsPaused(false)} className="w-full py-4 bg-white text-brand-dark rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2"><Play size={20} fill="currentColor" /> Resume Practice</button>
                      <button onClick={() => navigate('/')} className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/20 flex items-center justify-center gap-2"><X size={20} /> Exit Practice</button>
                  </div>
              </div>
          )}
         </div>
     );
 }

 if (view === 'PREPARATION') {
     // Determine patternId: use OM_INTEGRATION if transitioning to OM, otherwise use current round
     const patternId = isTransitioningToOm ? 'OM_INTEGRATION' : (plan?.rounds[currentRoundIndex]?.patternId || 'CALM');
     
     return (
         <PrepareCueScreen
             patternId={patternId}
             duration={prepareCueDuration}
             timeLeft={preparationCountdown}
             onComplete={isTransitioningToOm ? () => {
                 runOmIntegration();
                 setView('OM_INTEGRATION');
             } : startRound}
             onSkip={isTransitioningToOm ? () => {
                 runOmIntegration();
                 setView('OM_INTEGRATION');
             } : startRound}
             isPaused={isPaused}
             onPause={() => setIsPaused(true)}
             onExit={() => navigate('/')}
         />
     );
 }

 if (view === 'BREATHE') {
     const activeDetails = activeRound ? (INSTRUCTION_DETAILS[activeRound.patternId] || { icon: Sparkles }) : { icon: Sparkles };
     const Icon = activeDetails.icon;

     // ✅ Condition to show progress bar for Calm, Sleepy within Morning Ritual (BALANCE has its own bar inside AlternateNostrilVisual)
     const showProgressBar = ['CALM', 'REST'].includes(activeRound?.patternId || '');
     
     // Determine icon color: blue for calming techniques, gold for balance, red for fire patterns
     const iconColor = ['CALM', 'BHRAMARI', 'FOCUS', 'REST', 'OM_INTEGRATION'].includes(activeRound?.patternId || '')
         ? 'text-blue-500'
         : activeRound?.patternId === 'BALANCE'
         ? 'text-brand-gold'
         : 'text-red-500';

    return (
        <div className={`h-[100dvh] w-full bg-brand-dark text-white flex flex-col relative overflow-hidden`}>
             {/* Header with technique name and controls */}
             <div
                 className={`absolute top-0 left-0 right-0 flex items-center justify-between px-6 z-20 transition-all duration-500 ${
                     isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
                 }`}
                 style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
             >
                  <div className="text-xs font-bold tracking-widest opacity-90 uppercase flex items-center gap-2.5">
                      <Icon size={18} className={iconColor} /> 
                      <span>{activeRound?.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <button
                         onClick={(e) => {
                             e.stopPropagation();
                             setBreathSoundEnabled(!breathSoundEnabled);
                         }}
                         className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                     >
                          {breathSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-white/50" />}
                      </button>
                     <button
                         onClick={(e) => {
                             e.stopPropagation();
                             setIsPaused(true);
                         }}
                         className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                     >
                          <Pause size={20} fill="currentColor" />
                      </button>
                  </div>
             </div>
             {/* Centered layout optimized for mobile - orb slightly lower for better visual balance */}
             <div
                 className="flex-1 flex flex-col items-center justify-center relative z-10 pt-8 pb-safe"
                 onClick={handleScreenTap}
             >
                 {/* Orb container: small top offset so orb sits a bit more centered on screen */}
                 <div className={`shrink-0 flex items-center justify-center mt-10 ${!['FOCUS', 'BALANCE', 'REST'].includes(activeRound?.patternId || '') ? 'h-[320px]' : ''}`} style={!['FOCUS', 'BALANCE', 'REST'].includes(activeRound?.patternId || '') ? { height: '320px', flexShrink: 0 } : undefined}>
                    {activeRound?.patternId === 'FOCUS' ? (
                      <BoxBreathingVisual phase={phase} pattern={activePattern} />
                    ) : activeRound?.patternId === 'BALANCE' ? (
                      <AlternateNostrilVisual
                        phase={phase}
                        cycleCount={cycleCount}
                        pattern={activePattern}
                        totalCycles={activeRound.durationCycles}
                        phaseDuration={currentPhaseDuration}
                        isRunning={!isPaused}
                        isRetention={isRetention}
                        retentionTimeLeft={retentionTimeLeft}
                        isRecovery={fireSequencePhase === 'RECOVERY' && activeRound?.patternId === 'BALANCE'}
                      />
                    ) : activeRound?.patternId === 'REST' ? (
                      <RelaxationTriangleVisual
                        phase={phase}
                        pattern={activePattern}
                        showLabels={cycleCount < 2}
                      />
                    ) : (
                      <BreathingOrb
                        phase={phase}
                        pattern={activePattern}
                        cyclesCompleted={cycleCount}
                        customText={getPhaseLabel(phase)}
                        isLastBreath={remainingCycles === 1 && !isRetention && fireSequencePhase !== 'INTRO'}
                        countdown={isRetention && (phase === BreathPhase.HOLD || phase === BreathPhase.HOLD_EMPTY) && retentionTimeLeft ? retentionTimeLeft : undefined}
                      />
                    )}
                  </div>
                  
                  <div
                    className={`text-center space-y-2 animate-fade-in flex flex-col items-center`}
                  >
                      {/* ✅ Integrated PranaLiquidTimer for Morning Ritual */}
                      {showProgressBar && !isRetention && fireSequencePhase !== 'INTRO' && (
                        <PranaLiquidTimer 
                            duration={currentPhaseDuration} 
                            isRunning={!isPaused} 
                            phase={phase} 
                            cyclesCompleted={cycleCount} 
                        />
                      )}

                      {/* Counter container: Always reserve space to prevent orb from shifting */}
                      {/* For Fire patterns (ENERGY, BHASTRIKA) and CALM patterns, show cycles remaining */}
                      {activeRound?.patternId !== 'BALANCE' && (activeRound?.isFirePattern || activeRound?.patternId === 'CALM') && (
                          <div className="flex flex-col items-center" style={{ height: '200px', minHeight: '200px', marginTop: '16px' }}>
                              {/* Fire INTRO: Show placeholder during intro (only for Fire patterns) */}
                              {activeRound?.isFirePattern && fireSequencePhase === 'INTRO' ? (
                                  <div className="invisible flex flex-col items-center pointer-events-none" aria-hidden="true" style={{ height: '100%', justifyContent: 'center' }}>
                                      <div className="font-serif font-bold text-6xl tabular-nums">0</div>
                                      <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase mt-1">remaining</div>
                                  </div>
                              ) : !hideFinalBreathUI ? (
                                  /* Active phase: Show counter */
                                  <>
                                      <div
                                          className={`font-serif font-bold tabular-nums drop-shadow-lg transition-all duration-500 ${remainingCycles === 1 ? 'text-7xl scale-110' : 'text-6xl'}`}
                                          style={remainingCycles === 1 ? { color: 'rgba(201,168,93,0.8)' } : undefined}
                                      >
                                          {remainingCycles}
                                      </div>
                                      <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase">
                                          remaining
                                      </div>
                                      <LastBreathPrompt
                                          visible={showExhaleFullyHint}
                                          text="Exhale fully — last breath."
                                          className="mt-4"
                                      />
                                  </>
                              ) : (
                                  /* Hidden but space reserved */
                                  <div className="invisible" aria-hidden="true" style={{ height: '100%' }}></div>
                              )}
                          </div>
                      )}
                  </div>
              </div>

              {/* Humming Bee (BHRAMARI) exhale progress bar — positioned like OM/diaphragm (below counter, above skip) */}
              {activeRound?.patternId === 'BHRAMARI' && !isRetention && fireSequencePhase !== 'INTRO' && (
                <div className="absolute left-0 w-full flex justify-center z-20 pointer-events-none" style={{ bottom: 'calc(11rem + env(safe-area-inset-bottom, 0px))' }}>
                  <ExhaleProgressBar
                    phase={phase}
                    exhaleDuration={PATTERNS.BHRAMARI.exhale}
                    isRunning={!isPaused}
                    theme="bhramari"
                    className="mt-0"
                  />
                </div>
              )}

              {/* SKIP BUTTON FOR EACH BREATHWORK SCREEN */}
              <div
                  className={`absolute left-0 w-full flex justify-center z-20 transition-all duration-500 ${
                      isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                  style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
              >
                   <button 
                       onClick={(e) => {
                           e.stopPropagation();
                           finishRound();
                       }} 
                       className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-colors flex items-center gap-2 py-2.5 px-6 bg-white/5 rounded-full backdrop-blur-md border border-white/5 hover:bg-white/10 active:scale-95 shadow-lg"
                   >
                       Skip Technique <SkipForward size={12} />
                   </button>
              </div>

              <div
                  className={`absolute bottom-0 left-0 w-full h-1 bg-white/10 transition-opacity duration-500 ${
                      isUIVisible ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                  <div
                      className="h-full bg-brand-gold transition-all duration-300"
                      style={{ width: `${((currentRoundIndex) / plan.rounds.length) * 100}%` }}
                  ></div>
              </div>
              {isPaused && (
                   <div className="fixed inset-0 z-50 bg-brand-dark/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
                       <h2 className="text-4xl font-serif font-bold mb-12 text-white">paused</h2>
                       <div className="space-y-4 w-full max-w-xs">
                           <button onClick={() => setIsPaused(false)} className="w-full py-4 bg-white text-brand-dark rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2"><Play size={20} fill="currentColor" /> Resume Practice</button>
                           <button onClick={() => navigate('/')} className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/20 flex items-center justify-center gap-2"><X size={20} /> Exit Practice</button>
                       </div>
                   </div>
               )}
         </div>
     );
 }

 if (view === 'OM_INTEGRATION') {
     const omPattern = PATTERNS.BHRAMARI;
     const targetOm = plan?.omCount || 3;
     const remainingOm = Math.max(0, targetOm - omCyclesCompleted);
    const omPrompt =
        phase === BreathPhase.INHALE
            ? "breathe in gently…"
            : phase === BreathPhase.EXHALE
                ? "sing along: Ommmm…"
                : "stay with the vibration…";
 
    return (
       <div className="h-[100dvh] w-full bg-[#240046] text-white flex flex-col items-center justify-center relative overflow-hidden animate-fade-in transition-colors duration-1000">
              <div className="absolute inset-0 z-0">
                   <video 
                       src={getPatternVideo('OM_INTEGRATION')} 
                       autoPlay 
                       loop 
                       playsInline 
                       muted
                       preload="auto"
                       className="w-full h-full object-cover opacity-20"
                   />
                   <div className="absolute inset-0 bg-[#240046]/80"></div>
              </div>

              {/* OM ripple rings (visual sound effect like Humming Bee) */}
              <OmRippleRings isActive={!isPaused && phase === BreathPhase.EXHALE} />

              {/* Header with OM label and controls - matching Home.tsx pt-16 spacing */}
             <div
                className={`absolute top-0 left-0 right-0 flex items-center justify-between px-6 z-20 transition-all duration-500 ${
                    isUIVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
                }`}
                style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
             >
                 <div className="flex items-center gap-2">
                     <div className="text-[11px] font-bold tracking-[0.38em] uppercase text-brand-gold">
                         OM
                     </div>
                     <div className="text-[13px] text-brand-gold/80">
                         (ॐ)
                     </div>
                 </div>
                  <div className="flex items-center gap-4">
                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              setBreathSoundEnabled(!breathSoundEnabled);
                          }}
                          className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                      >
                          {breathSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-white/50" />}
                      </button>
                      <button
                          onClick={(e) => {
                              e.stopPropagation();
                              setIsPaused(true);
                          }}
                          className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                      >
                          <Pause size={20} fill="currentColor" />
                      </button>
                  </div>
              </div>

              {/* Centered layout optimized for mobile - orb positioned in middle of screen */}
             <div
                 className="flex-1 flex flex-col items-center justify-center relative z-10 pb-safe"
                 onClick={handleScreenTap}
             >
                  {/* Orb container: centered vertically, responsive sizing for Android/iPhone */}
                  <div className="shrink-0 flex items-center justify-center h-[280px] sm:h-[320px]">
                      <BreathingOrb 
                          phase={phase} 
                          pattern={omPattern} 
                          cyclesCompleted={omCyclesCompleted} 
                          customText={getPhaseLabel(phase)} 
                      />
                  </div>
                  
                  <div className="text-center space-y-2 animate-fade-in mt-6 sm:mt-8 flex flex-col items-center">
                      {/* Dynamic prompt (non-overlapping, zen) */}
                      <div
                          key={`${phase}-${omCyclesCompleted}`}
                          className="text-center text-sm font-semibold tracking-[0.18em] uppercase text-white/70"
                      >
                          {omPrompt}
                      </div>

                      {/* Remaining chants counter */}
                      <div className="mt-8 min-h-[168px] flex flex-col items-center">
                          <div
                              className={`font-serif font-bold tabular-nums drop-shadow-lg transition-all duration-500 ${remainingOm === 1 ? 'text-6xl scale-105' : 'text-5xl'}`}
                              style={remainingOm === 1 ? { color: 'rgba(201,168,93,0.85)' } : undefined}
                          >
                              {remainingOm}
                          </div>
                          <div className="text-[10px] font-bold tracking-[0.25em] opacity-40 uppercase mt-1">
                              chants left
                          </div>
                      </div>

                      {/* Exhale progress bar */}
                      {!isPaused && (
                          <ExhaleProgressBar
                              phase={phase}
                              exhaleDuration={omPattern.exhale}
                              isRunning={!isPaused}
                              theme="om"
                              className="mt-5"
                          />
                      )}
                  </div>
              </div>
              
              {isPaused && (
                   <div className="fixed inset-0 z-50 bg-brand-dark/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
                       <h2 className="text-4xl font-serif font-bold mb-12 text-white">paused</h2>
                       <div className="space-y-4 w-full max-w-xs">
                           <button onClick={() => setIsPaused(false)} className="w-full py-4 bg-white text-brand-dark rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2"><Play size={20} fill="currentColor" /> Resume Practice</button>
                           <button onClick={() => navigate('/')} className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/20 flex items-center justify-center gap-2"><X size={20} /> Exit Practice</button>
                       </div>
                   </div>
               )}
         </div>
     );
 }

if (view === 'GRATITUDE') {
     // Calculate session duration in minutes (rounded to whole number)
     const sessionDurationMinutes = sessionStartTime
         ? Math.round((Date.now() - sessionStartTime) / 1000 / 60)
         : 0;

     // Format date
     const dateStr = new Date().toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'long',
         day: 'numeric'
     });

     // Build breathing exercise summary for certificate — mirror first summary page exactly (cycles, total duration)
     const certificateSummaryLines: string[] = [];
     if (plan?.rounds?.length) {
         plan.rounds.forEach((r) => {
             // Match summary page: BALANCE shows durationCycles/2 as "cycles", others show durationCycles
             const displayCycles = r.patternId === 'BALANCE' ? r.durationCycles / 2 : r.durationCycles;
             certificateSummaryLines.push(`${r.name} — ${displayCycles} cycles`);
         });
     }
     if (plan?.omCount && plan.omCount > 0) {
         const omSec = (plan.omSecondsPerChant ?? 12) * plan.omCount;
         certificateSummaryLines.push(`${plan.omCount} chants of OM — ${omSec} sec`);
     }
     // Use plan's estimated total (same as "11.1 MINS" on summary page), not elapsed clock time
     if (plan?.totalDurationMin != null && plan.totalDurationMin > 0) {
         certificateSummaryLines.push(`Total — ${plan.totalDurationMin} min`);
     }

     // Download screenshot of the certificate
      const handleDownloadImage = async () => {
          if (!certificateRef.current) return;

          setIsGeneratingCertificate(true);
          try {
              await downloadCertImage('cert-template', `breathwork-${Date.now()}.png`);
          } catch (error) {
              try {
                  await downloadScreenshot(certificateRef.current, `breathwork-${Date.now()}.png`);
              } catch (fallbackError) {
                  console.error('Failed to generate certificate:', fallbackError);
              }
          } finally {
              setIsGeneratingCertificate(false);
          }
      };

     // Share functionality
     const handleShare = async () => {
         await shareCertificate(sessionDurationMinutes, selectedMessage);
     };

     return (
         <div className="h-[100dvh] w-full bg-[#0f172a] text-white flex flex-col items-center justify-between text-center animate-fade-in relative overflow-hidden">
             {/* Loading overlay while saving result */}
             {savingResult && (
                 <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a]">
                     <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-4" />
                     <p className="text-white/60 text-sm tracking-wide">saving your practice...</p>
                 </div>
             )}
             {/* Certificate content area - this is what gets captured (extra padding-bottom so download doesn't cut off footer) */}
              <div
                  id="cert-template"
                  ref={certificateRef}
                  className="flex-1 flex flex-col items-center justify-center w-full relative bg-[#0f172a] px-6 pb-16"
                  style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))', paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
              >
                 {/* Subtle texture overlay */}
                 <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
                     background: 'radial-gradient(ellipse at 50% 30%, rgba(212, 165, 116, 0.05) 0%, transparent 50%)'
                 }}></div>

                 {/* Certificate content - centered */}
                 <div className="flex flex-col items-center justify-center space-y-8 max-w-md relative z-10">
                     {/* Elemental symbol (golden) */}
                     <div className="opacity-90">
                         <ElementalSymbol type={selectedSymbol} />
                     </div>

                     {/* Congrats with name (golden) */}
                     <div className="text-4xl font-serif font-light text-[#D4A574] tracking-wide">
                         congrats {user}
                     </div>

                     {/* Date (lighter golden) */}
                     <div className="text-xl font-serif font-light text-[#D4A574]/70 tracking-wide">
                         {dateStr}
                     </div>

                     {/* Motivational message (golden) */}
                     <div className="text-2xl font-serif font-light text-[#D4A574]/85 leading-relaxed px-4 mt-4">
                         {selectedMessage}
                     </div>

                     {/* Breathing exercises summary — what they completed (proud moment, shareable) */}
                     {certificateSummaryLines.length > 0 && (
                         <div className="w-full max-w-sm mt-6 pt-6 border-t border-[#D4A574]/20">
                             <div className="text-[11px] font-medium text-[#D4A574]/50 uppercase tracking-[0.2em] mb-3">
                                 What you practiced
                             </div>
                             <div className="space-y-1.5 text-sm font-serif font-light text-[#D4A574]/80 text-center">
                                 {certificateSummaryLines.map((line, i) => (
                                     <div key={i}>{line}</div>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>

                 {/* Footer: The School of Breath (subtle golden) — extra margin so downloads don't cut it off */}
                 <div className="text-sm font-serif font-light text-[#D4A574]/40 mt-auto pt-8 pb-6 relative z-10">
                     The School of Breath
                 </div>
             </div>

             {/* Action buttons - positioned at bottom, outside the screenshot area */}
             <div className="w-full max-w-md mx-auto space-y-3 px-6 pt-6 relative z-10" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
                 <button
                     onClick={handleDownloadImage}
                     disabled={isGeneratingCertificate}
                     className="w-full px-6 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-light text-base hover:bg-white/20 transition-all border border-white/20 shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                     {isGeneratingCertificate ? (
                         <>
                             <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                             Generating...
                         </>
                     ) : (
                         'Save this moment'
                     )}
                 </button>

                 <button
                     onClick={handleFinish}
                     disabled={isGeneratingCertificate}
                     className="w-full px-6 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-light text-base hover:bg-white/20 transition-all border border-white/20 shadow-xl active:scale-[0.98] disabled:opacity-50"
                 >
                     Return Home
                 </button>
             </div>

             {/* Loading overlay */}
             {isGeneratingCertificate && (
                 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                     <div className="bg-[#0f172a] border border-[#D4A574]/30 rounded-2xl p-8 flex flex-col items-center gap-4">
                         <div className="w-12 h-12 border-3 border-[#D4A574]/30 border-t-[#D4A574] rounded-full animate-spin"></div>
                         <p className="text-[#D4A574] font-serif">Creating your certificate...</p>
                     </div>
                 </div>
             )}
         </div>
     );
 }

      {/* Technique Intro Card */}
      {showTechniqueIntro && getTechniqueInfo(showTechniqueIntro) && (
        <TechniqueIntroCard
          technique={getTechniqueInfo(showTechniqueIntro)!}
          onStart={() => {
            setShowTechniqueIntro(null);
            setTechniqueIntroForced(false);
          }}
          onClose={() => {
            setShowTechniqueIntro(null);
            setTechniqueIntroForced(false);
          }}
          forceShow={techniqueIntroForced}
        />
      )}

 return null;
};
