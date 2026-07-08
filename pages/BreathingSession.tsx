
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Snowflake, RotateCcw, ChevronDown, Volume2, VolumeX, Info, Leaf, Flame, Moon, Scale } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BreathingOrb } from '../components/BreathingOrb';
import { ResetLevelModal } from '../components/ResetLevelModal';
import { TechniqueIntroCard } from '../components/TechniqueIntroCard';
import { getTechniqueInfo } from '../data/techniques';
import { PATTERNS, BreathPhase, SoundscapeMode } from '../types';
import { AVAILABLE_SOUNDSCAPES } from '../constants';
import { playSoundscape } from '../services/audioEngine';
import { triggerHaptic } from '../utils/hapticFeedback';

// ✅ Adaptive patterns list (Humming Bee is fixed-level, so excluded)
const ADAPTIVE_PATTERN_IDS = ['CALM', 'BALANCE', 'FOCUS', 'REST'];
const CYCLES_TO_LEVEL_UP = 6;

// ✅ Abhi cue base URL (reuse MorningRitual inhale / hold / exhale sounds)
const ABHI_AUDIO_BASE = 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/';

// --- PREPARATION COPY (mirrors MorningRitual PREPARE_CUE_CONFIG, but text-only) ---
interface PrepareCueConfig {
  line1: string;
  line2: string;
  techniqueName: string;
}

const PREPARE_CUES: Record<string, PrepareCueConfig> = {
  ENERGY: {
    line1: 'Sharp exhales ignite. Inhales arise naturally.',
    line2: '',
    techniqueName: 'Breath of Fire',
  },
  BHASTRIKA: {
    line1: 'Active inhale. Active exhale.',
    line2: 'Keep the chest open and tall.',
    techniqueName: 'Bhastrika',
  },
  BALANCE: {
    line1: 'Vishnu Mudra formed. Alternate nostrils flow.',
    line2: '',
    techniqueName: 'Alternate Nostril',
  },
  CALM: {
    line1: 'Belly rises. Lungs expand. Release flows.',
    line2: '',
    techniqueName: 'Diaphragmatic Breathing',
  },
  REST: {
    line1: 'Four counts in. Seven held. Eight released.',
    line2: '',
    techniqueName: '4‑7‑8 Breathing',
  },
  FOCUS: {
    line1: 'Equal sides. Steady rhythm.',
    line2: '',
    techniqueName: 'Box Breathing',
  },
  BHRAMARI: {
    line1: 'Come into 7 Doors Closing Mudra.',
    line2: 'Long inhale… exhale with a smooth hum.',
    techniqueName: 'Humming Bee',
  },
};

// Recommended times and best times for each pattern
const PATTERN_RECOMMENDATIONS: Record<string, { duration: string; bestTime: string }> = {
  CALM: { duration: '5–10 min', bestTime: 'Anytime' },
  REST: { duration: '7–15 min', bestTime: 'Evening' },
  FOCUS: { duration: '3–5 min', bestTime: 'Morning / Mid-day' },
  BALANCE: { duration: '5–10 min', bestTime: 'Morning / Pre-Meditation' },
  ENERGY: { duration: '3–5 min', bestTime: 'Morning' },
  BHASTRIKA: { duration: '1–3 min', bestTime: 'Morning' },
  BHRAMARI: { duration: '5–10 min', bestTime: 'Evening / Before Sleep' },
};

// Compute 6–9s preparation duration based on text length (same heuristic as MorningRitual)
const computePrepareDurationSeconds = (config: PrepareCueConfig): number => {
  const totalTextLength = (config.line1 + ' ' + config.line2).length;
  let baseDuration: number;

  if (totalTextLength <= 60) baseDuration = 6;
  else if (totalTextLength <= 95) baseDuration = 7;
  else if (totalTextLength <= 130) baseDuration = 8;
  else baseDuration = 9;

  return baseDuration;
};

// ✅ EXACT FIRE PROTOCOL LADDER
const FIRE_LADDER: Record<
  number,
  { cycles: number; emptyHold: number; fullHold: number; benefit: string }
> = {
  1: { cycles: 24, emptyHold: 0, fullHold: 12, benefit: 'Foundation' },
  2: { cycles: 30, emptyHold: 9, fullHold: 21, benefit: 'Building Stamina' },
  3: { cycles: 36, emptyHold: 12, fullHold: 30, benefit: 'Energy Boost' },
  4: { cycles: 42, emptyHold: 15, fullHold: 39, benefit: 'Advanced Control' },
  5: { cycles: 48, emptyHold: 18, fullHold: 48, benefit: 'Master Breathwork' },
  6: { cycles: 48, emptyHold: 21, fullHold: 60, benefit: 'Ultimate Retention' },
};

// Box Breathing level completion phrases (spiritual/geometric theme)
const BOX_LEVEL_PHRASES: Record<number, string> = {
  1: '□ Foundation Established',
  2: '▢ Structure Strengthens',
  3: '⬚ Form Perfected',
  4: '🔲 Geometry of Breath',
};
const BOX_LEVEL_PHRASE_FINAL = 'Sacred Square Complete';

// Diaphragmatic Breathing level completion (nature/earth theme)
// Phrases cycle 1–4; level 12 adds final phrase
const CALM_LEVEL_PHRASES: Record<number, string> = {
  1: '🍃 Belly Wisdom Awakens',
  2: '🌳 Roots Deepen',
  3: '🌺 Breath Blossoms',
  4: '🌊 Diaphragm Flows',
};
const CALM_LEVEL_PHRASE_FINAL = '🌎 Natural Breathing Restored';
const CALM_LEVEL_DESCRIPTIONS: Record<number, string> = {
  5: 'The breath rises steadily through you — strength with serenity, power grounded in peace.',
  6: 'Your lungs bloom wide as branches spreading to meet sunlight — the breath a bridge between sky and soil.',
  7: 'A gentle rhythm emerges; your breathing synchronizes with nature\'s cadence.',
  8: 'Waves of air glide effortlessly through your body — calm, rhythmic, endless.',
  9: 'You breathe as the forest breathes — slow, alive, and deeply connected.',
  10: 'Each breath roots you in the moment, the inner soil rich with renewal and stability.',
  11: 'Your breath glows from within, infusing the body with warmth, peace, and wholeness.',
  12: 'Breath, body, and earth move as one — a seamless current of life restored to its natural rhythm.',
};

// 4-7-8 Breathing level completion (Nature-Inspired Journey)
// Same 4-phrase cycle; level 12 adds final phrase; level 13+ repeats
const REST_LEVEL_PHRASES: Record<number, string> = {
  1: '🍃 Belly Wisdom Awakens',
  2: '🌳 Roots Deepen',
  3: '🌺 Breath Blossoms',
  4: '🌊 Diaphragm Flows',
};
const REST_LEVEL_PHRASE_FINAL = '🌎 Natural Breathing Restored';
const REST_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Calm enters; stillness begins.',
  2: 'The earth receives your breath, grounding the flutter.',
  3: 'Tranquility rises like dawn mist through the chest.',
  4: 'A wave leaves the shore — tension dissolves, peace flows.',
  5: 'Breath finds rhythm, mind drifts to quiet waters.',
  6: 'You rest between breaths like roots in soft soil.',
  7: 'Each cycle opens you — gentle, effortless, whole.',
  8: 'Long exhale melts the day\'s weight into silence.',
  9: 'Breath and heartbeat align with the hush of trees.',
  10: 'Awareness softens; breath deepens into serenity.',
  11: 'Your breathing glows like warm dusk light.',
  12: 'Inhale, hold, exhale — body and nature move as one.',
};

type FirePhase =
  | 'INTRO'
  | 'ACTIVE'
  | 'FINAL_EXHALE'
  | 'EMPTY_HOLD'
  | 'DEEP_INHALE'
  | 'FULL_HOLD'
  | 'RECOVERY';

/**
 * RE-ADDED PRANA LIQUID TIMER COMPONENT
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

// --- ALTERNATE NOSTRIL VISUAL (matching MorningRitual style) ---
const AlternateNostrilVisual = ({
  phase,
  cycleCount,
  pattern,
  isRunning,
}: {
  phase: BreathPhase;
  cycleCount: number;
  pattern: any;
  isRunning: boolean;
}) => {
  // Definition: 1 Cycle = (In Left, Hold, Out Right) + (In Right, Hold, Out Left)
  const isLeftStartHalf = cycleCount % 2 === 0;

  // Determine which side is currently active
  const isLeftCurrentlyActive = (isLeftStartHalf && phase === BreathPhase.INHALE) || (!isLeftStartHalf && phase === BreathPhase.EXHALE);
  const isRightCurrentlyActive = (!isLeftStartHalf && phase === BreathPhase.INHALE) || (isLeftStartHalf && phase === BreathPhase.EXHALE);

  const getStatusText = () => {
    if (phase === BreathPhase.HOLD) return "hold";
    if (phase === BreathPhase.INHALE) return "inhale";
    if (phase === BreathPhase.EXHALE) return "exhale";
    return "balance";
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
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
            customText={getStatusText()}
          />
        </div>
        
        {/* Left/Right Text Indicators - Elegant & Symmetric */}
        <div className="flex justify-center gap-20 pointer-events-none mb-4">
          <span className={`text-[12px] font-bold tracking-[0.4em] uppercase transition-all duration-700 ${isLeftCurrentlyActive ? 'text-cyan-400 opacity-100 scale-110' : 'text-white/20'}`}>left</span>
          <span className={`text-[12px] font-bold tracking-[0.4em] uppercase transition-all duration-700 ${isRightCurrentlyActive ? 'text-amber-400 opacity-100 scale-110' : 'text-white/20'}`}>right</span>
        </div>
      </div>
    </div>
  );
};

const BoxBreathingVisual = ({
  phase,
  pattern,
  isRunning,
}: {
  phase: BreathPhase;
  pattern: any;
  isRunning: boolean;
}) => {
  const size = 140;
  const offset = 30;
  const cornerRadius = 24;

  const activeSide = useMemo(() => {
    switch (phase) {
      case BreathPhase.INHALE: return 0;
      case BreathPhase.HOLD: return 1;
      case BreathPhase.EXHALE: return 2;
      case BreathPhase.HOLD_EMPTY: return 3;
      default: return -1;
    }
  }, [phase]);

  const duration = useMemo(() => {
    switch (phase) {
      case BreathPhase.INHALE: return pattern.inhale;
      case BreathPhase.HOLD: return pattern.hold;
      case BreathPhase.EXHALE: return pattern.exhale;
      case BreathPhase.HOLD_EMPTY: return pattern.holdEmpty || 4;
      default: return 0.5;
    }
  }, [phase, pattern]);

  const dotTransform = useMemo(() => {
    switch (activeSide) {
      case 0: return `translate(${offset + size}px, ${offset}px)`;
      case 1: return `translate(${offset + size}px, ${offset + size}px)`;
      case 2: return `translate(${offset}px, ${offset + size}px)`;
      case 3: return `translate(${offset}px, ${offset}px)`;
      default: return `translate(${offset}px, ${offset}px)`;
    }
  }, [activeSide, offset, size]);

  const trailOffset = useMemo(() => {
    switch (activeSide) {
      case 0: return { x: -6, y: 0 };
      case 1: return { x: 0, y: -6 };
      case 2: return { x: 6, y: 0 };
      case 3: return { x: 0, y: 6 };
      default: return { x: 0, y: 0 };
    }
  }, [activeSide]);

  return (
    <div className="relative flex items-center justify-center h-96 w-96">
      {/* Soft gold ambient glow – inspired by Morning Ritual */}
      <div className="absolute inset-0 bg-[#D4A574]/10 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_32px_rgba(212,165,116,0.4)] overflow-visible">
        <defs>
          {/* Warm amber to golden border gradient */}
          <linearGradient id="boxBreathGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#FCD34D" />
          </linearGradient>
          {/* Subtle radial background: transparent center → slight teal at edges */}
          <radialGradient id="boxBgGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="transparent" stopOpacity="0" />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.06" />
          </radialGradient>
          {/* Inner glow: subtle amber inset glow */}
          <radialGradient id="boxInnerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
            <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.1" />
          </radialGradient>
          {/* Dot: warm orange to golden yellow gradient */}
          <radialGradient id="boxDotGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#FB923C" />
          </radialGradient>
          {/* Dot glow: 0 0 15px rgba(251,146,60,0.8), 0 0 30px rgba(251,146,60,0.4) */}
          <filter id="boxDotGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#FB923C" floodOpacity="0.8" />
            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#FB923C" floodOpacity="0.4" />
          </filter>
          {/* Trail: subtle motion blur for particle trail effect */}
          <filter id="boxDotTrailBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
        </defs>

        {/* Interior: background + inner glow (behind border) */}
        <rect
          x={offset}
          y={offset}
          width={size}
          height={size}
          fill="url(#boxBgGradient)"
          rx={cornerRadius}
        />
        <rect
          x={offset}
          y={offset}
          width={size}
          height={size}
          fill="url(#boxInnerGlow)"
          rx={cornerRadius}
        />

        {/* Base square – 4px border with warm amber-to-golden gradient */}
        <rect
          x={offset}
          y={offset}
          width={size}
          height={size}
          fill="none"
          stroke="url(#boxBreathGold)"
          strokeWidth="4"
          strokeOpacity="1"
          rx={cornerRadius}
        />

        {/* Active sides – vibrant gold, liquid-like fill */}
        <g className="transition-opacity duration-700">
          <path
            d={`M ${offset + cornerRadius} ${offset} H ${offset + size - cornerRadius}`}
            stroke="url(#boxBreathGold)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            className={activeSide === 0 ? 'opacity-100' : 'opacity-20'}
          />
          <path
            d={`M ${offset + size} ${offset + cornerRadius} V ${offset + size - cornerRadius}`}
            stroke="url(#boxBreathGold)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            className={activeSide === 1 ? 'opacity-100' : 'opacity-20'}
          />
          <path
            d={`M ${offset + size - cornerRadius} ${offset + size} H ${offset + cornerRadius}`}
            stroke="url(#boxBreathGold)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            className={activeSide === 2 ? 'opacity-100' : 'opacity-20'}
          />
          <path
            d={`M ${offset} ${offset + size - cornerRadius} V ${offset + cornerRadius}`}
            stroke="url(#boxBreathGold)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            className={activeSide === 3 ? 'opacity-100' : 'opacity-20'}
          />
        </g>

        {/* Subtle center glow – Morning Ritual style */}
        <circle cx="100" cy="100" r="30" fill="#D4A574" fillOpacity="0.04" className="animate-pulse" />

        {isRunning && (
          <g
            style={{
              transform: dotTransform,
              transition: `transform ${duration}s cubic-bezier(0.45, 0.05, 0.55, 0.95)`,
              transformOrigin: 'center',
              isolation: 'isolate',
            }}
          >
            {/* Trail: subtle motion blur behind dot */}
            <circle
              r="14"
              cx={trailOffset.x}
              cy={trailOffset.y}
              fill="#FB923C"
              fillOpacity="0.25"
              filter="url(#boxDotTrailBlur)"
            />
            {/* Main dot: 28px diameter, gradient fill, glow on top */}
            <circle r="14" fill="url(#boxDotGradient)" filter="url(#boxDotGlow)" />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {!isRunning ? (
          <span
            className="font-serif font-normal uppercase text-[#FDFCF8]/80 animate-tap-pulse"
            style={{ fontSize: '15px', letterSpacing: '3px' }}
          >
            tap to start
          </span>
        ) : (
          <h3 className="text-2xl font-serif font-bold text-white tracking-[0.1em] drop-shadow-2xl animate-fade-in" key={phase}>
            {phase === BreathPhase.INHALE ? 'inhale' : phase === BreathPhase.HOLD ? 'hold' : phase === BreathPhase.EXHALE ? 'exhale' : phase === BreathPhase.HOLD_EMPTY ? 'hold' : 'ready'}
          </h3>
        )}
      </div>
    </div>
  );
};

export const BreathingSession: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patternId = useMemo(() => (searchParams.get('pattern') || 'CALM').toUpperCase(), [searchParams]);

  const { patternProgress, registerBreathCycle, levelUpPattern, resetPatternLevel, addCalmPoints, incrementStreak } = useApp();

  const basePattern = PATTERNS[patternId] || PATTERNS.CALM;
  const progress = patternProgress[patternId] || { level: 1, isFrozen: false, cyclesInLevel: 0 };

  const isFireBreath = ['ENERGY', 'BHASTRIKA'].includes(patternId);
  const isBoxBreath = patternId === 'FOCUS';

  // ✅ Condition to show progress bar back on Relaxed, Sleepy, Balanced
  const showProgressBar = ['CALM', 'REST', 'BALANCE', 'BHRAMARI'].includes(patternId);

  const [freezeState, setFreezeState] = useState<{ isFrozen: boolean; level: number }>(() => {
    const saved = localStorage.getItem('breathing-freeze');
    return saved ? JSON.parse(saved) : { isFrozen: false, level: 1 };
  });

  useEffect(() => {
    localStorage.setItem('breathing-freeze', JSON.stringify(freezeState));
  }, [freezeState]);

  const toggleFreeze = useCallback(() => {
    setFreezeState((prev) => {
      const nextIsFrozen = !prev.isFrozen;
      return { isFrozen: nextIsFrozen, level: nextIsFrozen ? progress.level : prev.level };
    });
  }, [progress.level]);

  const [phase, setPhase] = useState<BreathPhase>(BreathPhase.IDLE);
  const [sessionCycles, setSessionCycles] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareTimeLeft, setPrepareTimeLeft] = useState(0);
  const [prepareDuration, setPrepareDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false); // Track if session has been started at least once
  const [firePhase, setFirePhase] = useState<FirePhase>('ACTIVE');
  const [fireIntroStep, setFireIntroStep] = useState(0);
  const [holdTimer, setHoldTimer] = useState(0);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [standardLevelUpToast, setStandardLevelUpToast] = useState<string | null>(null);
  const [uiVisible, setUiVisible] = useState(true);
  const [showSoundscapeMenu, setShowSoundscapeMenu] = useState(false);
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeMode | null>(null);
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [breathSoundEnabled, setBreathSoundEnabled] = useState(true);
  const [showIntroCard, setShowIntroCard] = useState(false);
  const [showIntroCardForced, setShowIntroCardForced] = useState(false);

  // ✅ Zen Mode: Auto-fade after 3 cycles, fade in on tap, auto-fade after inactivity
  const inactivityTimerRef = useRef<number | null>(null);
  const zenModeEnabledRef = useRef(false); // Track if zen mode has been activated (after 3 cycles)
  const CYCLES_BEFORE_ZEN_MODE = 3;
  const INACTIVITY_TIMEOUT_MS = 6000; // 6 seconds of inactivity before fade-out
  const FADE_DURATION_MS = 1800; // 1.8s smooth fade transition

  // Timer for preparation countdown
  const prepareTimerRef = useRef<number | null>(null);

  const clearPrepareTimer = useCallback(() => {
    if (prepareTimerRef.current) {
      window.clearTimeout(prepareTimerRef.current);
      prepareTimerRef.current = null;
    }
  }, []);

  // ✅ Subtle Level Reset Logic (now driven by custom modal)
  const handleConfirmResetLevel = useCallback(() => {
    resetPatternLevel(patternId);
    setFreezeState({ isFrozen: false, level: 1 });
    setStandardLevelUpToast('Level Reset to 1');
    window.setTimeout(() => setStandardLevelUpToast(null), 2000);
    setShowResetModal(false);
  }, [patternId, resetPatternLevel]);

  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const stopSoundscapeRef = useRef<() => void>(() => {});

  // ✅ CALM (Diaphragmatic) breath cue audio (inhale / hold / exhale)
  const calmAudioCtxRef = useRef<AudioContext | null>(null);
  const calmGainRef = useRef<GainNode | null>(null);
  const inhale6Ref = useRef<AudioBuffer | null>(null);
  const hold3Ref = useRef<AudioBuffer | null>(null);
  const exhale9Ref = useRef<AudioBuffer | null>(null);
  // CALM plain cues (Level 2+): Long_inhale, hold, exhalelast — word-only, no numbers
  const calmInhalePlainRef = useRef<AudioBuffer | null>(null);
  const calmHoldPlainRef = useRef<AudioBuffer | null>(null);
  const calmExhalePlainRef = useRef<AudioBuffer | null>(null);
  // CALM plain variety (Level 2+): InhaleInst, ExhaleInst — no inhaleleft/inhaleRight in diaphragmatic
  const calmInhaleInstRef = useRef<AudioBuffer | null>(null);
  const calmExhaleInstRef = useRef<AudioBuffer | null>(null);
  // Relaxation (REST – 4‑7‑8) cues
  const restInhale4Ref = useRef<AudioBuffer | null>(null);
  const restHold7Ref = useRef<AudioBuffer | null>(null);
  const restExhale8Ref = useRef<AudioBuffer | null>(null);

  // ✅ Humming Bee (BHRAMARI) cues
  const hummingInhaleRef = useRef<AudioBuffer | null>(null);
  const hummingExhaleRef = useRef<AudioBuffer | null>(null);
  // ✅ Alternate Nostril (BALANCE) audio cues (same URLs as MorningRitual)
  const inhaleLeftRef = useRef<AudioBuffer | null>(null);
  const exhaleRightRef = useRef<AudioBuffer | null>(null);
  const inhaleRightRef = useRef<AudioBuffer | null>(null);
  const exhaleLeftRef = useRef<AudioBuffer | null>(null);
  const genericHoldRef = useRef<AudioBuffer | null>(null);
  // ✅ Fire Breath (ENERGY) cues (same URLs as MorningRitual)
  const fireExhaleRef = useRef<AudioBuffer | null>(null);        // active exhale
  const fireLastExhaleRef = useRef<AudioBuffer | null>(null);    // last long exhale / exhale fully
  const fireDeepInhaleRef = useRef<AudioBuffer | null>(null);    // deep inhale before final hold
  const fireRecoveryExhaleRef = useRef<AudioBuffer | null>(null); // slow recovery exhale
  const fireIntroRef = useRef<AudioBuffer | null>(null);         // inhale fully (intro step 0)
  const fireInhaleHalfwayRef = useRef<AudioBuffer | null>(null); // inhale halfway (intro step 2)
  // ✅ Bhastrika cues (same URLs as MorningRitual)
  const bhastrikaInhaleRef = useRef<AudioBuffer | null>(null);
  const bhastrikaExhaleRef = useRef<AudioBuffer | null>(null);
  const bhastrikaLastExhaleRef = useRef<AudioBuffer | null>(null);
  const chimeBufferRef = useRef<AudioBuffer | null>(null);

  // ✅ BOX BREATHING (FOCUS) audio cues
  // Level 1 cycles 1–3: counted 4–4–4–4 cues
  const boxInhale4Ref = useRef<AudioBuffer | null>(null);
  const boxHold4TopRef = useRef<AudioBuffer | null>(null);
  const boxExhale4Ref = useRef<AudioBuffer | null>(null);
  const boxHold4BottomRef = useRef<AudioBuffer | null>(null);
  // Level 1 cycles 4–6: plain voice cues
  const boxHoldPlainRef = useRef<AudioBuffer | null>(null);
  const boxExhalePlainRef = useRef<AudioBuffer | null>(null);
  // Level 2+ : breath sounds only
  const boxLongInhaleRef = useRef<AudioBuffer | null>(null);
  const boxExhaleBreathRef = useRef<AudioBuffer | null>(null);
  // Track last inhale choice for hold-silence logic (when Long_inhale used, hold sometimes silent)
  const boxLastInhaleWasLongRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ✅ Clear inactivity timer helper (defined early to avoid initialization errors)
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  // ✅ Reset inactivity timer and fade in UI (defined early to avoid initialization errors)
  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    // Only auto-fade if zen mode has been activated (after 3 cycles)
    if (zenModeEnabledRef.current && isRunning) {
      setUiVisible(true);
      // Set timer to fade out after inactivity period
      inactivityTimerRef.current = window.setTimeout(() => {
        setUiVisible(false);
        inactivityTimerRef.current = null;
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [isRunning, clearInactivityTimer]);

  // Pause visuals & timers when the tab/app goes to background to avoid
  // desynced or "hallucinating" animations when coming back.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Stop running session and clear timers; user can resume intentionally.
        setIsRunning(false);
        setIsPreparing(false);
        clearTimer();
        clearInactivityTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearTimer, clearInactivityTimer]);

  // Reset hasStarted when pattern changes
  useEffect(() => {
    setHasStarted(false);
    setIsRunning(false);
    setIsPreparing(false);
    setPhase(BreathPhase.IDLE);
    setFirePhase('ACTIVE');
    setFireIntroStep(0);
    setUiVisible(true); // Reset UI visibility on pattern change
    zenModeEnabledRef.current = false; // Reset zen mode flag
    clearInactivityTimer();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (prepareTimerRef.current) {
      window.clearTimeout(prepareTimerRef.current);
      prepareTimerRef.current = null;
    }
  }, [patternId, clearInactivityTimer]);

  const sessionCadence = useMemo(() => {
    const effectiveLevel = freezeState.isFrozen ? freezeState.level : progress.level;
    const isBalance = patternId === 'BALANCE';

    if (!ADAPTIVE_PATTERN_IDS.includes(patternId)) return basePattern;

    // Alternate Nostril: only HOLD scales, with multiplier steps of 0.5 per level
    if (isBalance) {
      const holdMultiplier = 1 + 0.5 * (effectiveLevel - 1); // L1:1.0, L2:1.5, L3:2.0, ...
      return {
        inhale: basePattern.inhale,
        hold: Number((basePattern.hold * holdMultiplier).toFixed(1)),
        exhale: basePattern.exhale,
        holdEmpty: 0,
      };
    }

    // Other adaptive patterns: small incremental scaling
    const incrementStep = 0.03;
    const multiplier = 1 + (effectiveLevel - 1) * incrementStep;

    return {
      inhale: Number((basePattern.inhale * multiplier).toFixed(1)),
      hold: Number((basePattern.hold * multiplier).toFixed(1)),
      exhale: Number((basePattern.exhale * multiplier).toFixed(1)),
      holdEmpty: basePattern.holdEmpty ? Number((basePattern.holdEmpty * multiplier).toFixed(1)) : 0,
    };
  }, [basePattern, progress.level, patternId, freezeState]);

  const difficultyIncreasePct = useMemo(() => {
    if (!ADAPTIVE_PATTERN_IDS.includes(patternId)) return 0;
    const effectiveLevel = freezeState.isFrozen ? freezeState.level : progress.level;

    // For Alternate Nostril, difficulty % mirrors the hold multiplier
    if (patternId === 'BALANCE') {
      const holdMultiplier = 1 + 0.5 * (effectiveLevel - 1);
      return Math.round((holdMultiplier - 1) * 100);
    }

    const incrementStep = 0.03;
    const pct = (1 + (effectiveLevel - 1) * incrementStep - 1) * 100;
    return Math.round(pct);
  }, [patternId, progress.level, freezeState]);

  // ✅ Subtle 6‑cycle countdown dots towards next level (all adaptive patterns)
  const levelCycleDots = useMemo(() => {
    if (!ADAPTIVE_PATTERN_IDS.includes(patternId)) return null;
    if (freezeState.isFrozen) return null;
    const inLevel = progress.cyclesInLevel % CYCLES_TO_LEVEL_UP;
    // Map 0–5 completed cycles → 1–6 visible dots
    const visible = Math.max(1, Math.min(inLevel + 1, CYCLES_TO_LEVEL_UP));
    return visible;
  }, [patternId, progress.cyclesInLevel, freezeState]);

  const balanceOrbText = useMemo(() => {
    if (patternId !== 'BALANCE' || phase === BreathPhase.IDLE) return undefined;
    const isFirstHalf = sessionCycles % 2 === 0;
    // Short, single-line labels for smoother, less jumpy orb text
    if (phase === BreathPhase.INHALE) return isFirstHalf ? 'inhale L' : 'inhale R';
    if (phase === BreathPhase.HOLD) return 'hold';
    if (phase === BreathPhase.EXHALE) return isFirstHalf ? 'exhale R' : 'exhale L';
    return undefined;
  }, [patternId, phase, sessionCycles]);

  const fireConfig = useMemo(() => {
    const effectiveLevel = freezeState.isFrozen ? freezeState.level : progress.level;
    return FIRE_LADDER[Math.min(effectiveLevel, 6)] || FIRE_LADDER[1];
  }, [progress.level, freezeState]);

  // Special text for simplified Fire Breath phases
  const fireOrbText = useMemo(() => {
    if (!isFireBreath || phase === BreathPhase.IDLE) return undefined;
    if (firePhase === 'INTRO') {
      if (fireIntroStep === 0) return 'inhale fully';
      if (fireIntroStep === 1) return 'exhale fully';
      if (fireIntroStep === 2) return 'inhale halfway';
    }
    if (firePhase === 'EMPTY_HOLD') return 'hold (exhale)';
    if (firePhase === 'FULL_HOLD') return 'hold (inhale)';
    if (firePhase === 'DEEP_INHALE') return 'deep inhale';
    if (firePhase === 'FINAL_EXHALE') return 'final exhale';
    if (firePhase === 'RECOVERY') return 'recover';
    return undefined;
  }, [isFireBreath, phase, firePhase, fireIntroStep]);

  const ensureAudioReady = useCallback(async () => {
    if (!activeSoundscape) return;
    if (!audioContextRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
      audioContextRef.current = new Ctx({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      try { await audioContextRef.current.resume(); } catch {}
    }
    if (!gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = 0.5;
    }
  }, [activeSoundscape]);

  // --- CALM breath cue helpers (Inhale / Hold / Exhale like MorningRitual) ---
  const loadAudioBuffer = useCallback(async (ctx: AudioContext, url: string) => {
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      return await ctx.decodeAudioData(arr);
    } catch (e) {
      console.error('Failed to load CALM cue audio', e);
      return null;
    }
  }, []);

  useEffect(() => {
    // Only initialize when user visits this screen; reused for all CALM sessions.
    const initCalmAudio = async () => {
      try {
        if (!calmAudioCtxRef.current) {
          const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
          calmAudioCtxRef.current = new Ctx();
        }
        const ctx = calmAudioCtxRef.current!;
        if (!calmGainRef.current) {
          const gain = ctx.createGain();
          gain.gain.value = breathSoundEnabled ? 1 : 0;
          gain.connect(ctx.destination);
          calmGainRef.current = gain;
        }
        // Lazy-load buffers once
        if (!inhale6Ref.current) {
          inhale6Ref.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}Inhale6.mp3`);
        }
        if (!hold3Ref.current) {
          hold3Ref.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}hold3.mp3`);
        }
        if (!exhale9Ref.current) {
          exhale9Ref.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}Exhale9.mp3`);
        }
        // CALM plain cues (Level 2+): Long_inhale, hold, exhalelast — no numbers
        if (!calmInhalePlainRef.current) {
          calmInhalePlainRef.current = await loadAudioBuffer(ctx, 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/Long_inhale.mp3');
        }
        if (!calmHoldPlainRef.current) {
          calmHoldPlainRef.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}hold.mp3`);
        }
        if (!calmExhalePlainRef.current) {
          calmExhalePlainRef.current = await loadAudioBuffer(ctx, 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/exhalelast.mp3');
        }
        if (!calmInhaleInstRef.current) {
          calmInhaleInstRef.current = await loadAudioBuffer(ctx, 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/InhaleInst.mp3');
        }
        if (!calmExhaleInstRef.current) {
          calmExhaleInstRef.current = await loadAudioBuffer(ctx, 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/ExhaleInst.mp3');
        }
        // Relaxation (REST – 4‑7‑8) uses same files as MorningRitual
        if (!restInhale4Ref.current) {
          restInhale4Ref.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}Inhale4box.mp3`);
        }
        if (!restHold7Ref.current) {
          restHold7Ref.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}hold7.mp3`);
        }
        if (!restExhale8Ref.current) {
          restExhale8Ref.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}exhale8.mp3`);
        }
        // Humming Bee: inhale + humming exhale
        if (!hummingInhaleRef.current) {
          hummingInhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/inhalesoundlonghumming.mp3'
          );
        }
        if (!hummingExhaleRef.current) {
          hummingExhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/hummingbeev3.mp3'
          );
        }
        // Alternate Nostril: inhale L/R, exhale R/L, and generic hold (same as MorningRitual)
        if (!inhaleLeftRef.current) {
          inhaleLeftRef.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}inhaleleft.mp3`);
        }
        if (!exhaleRightRef.current) {
          exhaleRightRef.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}exhaleRightv2.mp3`);
        }
        if (!inhaleRightRef.current) {
          inhaleRightRef.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}inhaleRight.mp3`);
        }
        if (!exhaleLeftRef.current) {
          exhaleLeftRef.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}exhaleLeft.mp3`);
        }
        if (!genericHoldRef.current) {
          genericHoldRef.current = await loadAudioBuffer(ctx, `${ABHI_AUDIO_BASE}hold.mp3`);
        }
        // Fire Breath: sharp exhale cue (same as MorningRitual fire exhale)
        if (!fireExhaleRef.current) {
          fireExhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_exhalev2.mp3'
          );
        }
        // Fire Breath: long last exhale
        if (!fireLastExhaleRef.current) {
          fireLastExhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_last_exhale_spoken.mp3'
          );
        }
        // Fire Breath: deep inhale before final hold
        if (!fireDeepInhaleRef.current) {
          fireDeepInhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/Long_inhale.mp3'
          );
        }
        // Fire Breath: recovery slow exhale
        if (!fireRecoveryExhaleRef.current) {
          fireRecoveryExhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/exhalelast.mp3'
          );
        }
        // Fire Breath: intro sequence (inhale fully, exhale fully, inhale halfway)
        if (!fireIntroRef.current) {
          fireIntroRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/fire_breath_inhalefully_spoken.mp3'
          );
        }
        if (!fireInhaleHalfwayRef.current) {
          fireInhaleHalfwayRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/InhaleInst.mp3'
          );
        }
        // Bhastrika: force in / force out / last exhale
        if (!bhastrikaInhaleRef.current) {
          bhastrikaInhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/bhastrika_inhale.mp3'
          );
        }
        if (!bhastrikaExhaleRef.current) {
          bhastrikaExhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/bhastrika_exhale.mp3'
          );
        }
        if (!bhastrikaLastExhaleRef.current) {
          bhastrikaLastExhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/BreathSoundEffects/exhalelast.mp3'
          );
        }
        if (!chimeBufferRef.current) {
          chimeBufferRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/chimes.mp3'
          );
        }
      } catch (e) {
        console.error('Error initializing CALM cue audio', e);
      }
    };
    initCalmAudio();
  }, [breathSoundEnabled, loadAudioBuffer]);

  // Load Box Breathing cue audio when needed
  useEffect(() => {
    if (patternId !== 'FOCUS') return;
    const initBoxAudio = async () => {
      try {
        if (!calmAudioCtxRef.current) {
          const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
          calmAudioCtxRef.current = new Ctx();
        }
        const ctx = calmAudioCtxRef.current!;
        if (!calmGainRef.current) {
          const gain = ctx.createGain();
          gain.gain.value = breathSoundEnabled ? 1 : 1;
          gain.connect(ctx.destination);
          calmGainRef.current = gain;
        }
        // Level 1 counted cues (4–4–4–4)
        if (!boxInhale4Ref.current) {
          boxInhale4Ref.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Inhale4box.mp3'
          );
        }
        if (!boxHold4TopRef.current) {
          boxHold4TopRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Hold4box.mp3'
          );
        }
        if (!boxExhale4Ref.current) {
          boxExhale4Ref.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Exhale4Box.mp3'
          );
        }
        if (!boxHold4BottomRef.current) {
          boxHold4BottomRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Hold4box2.mp3'
          );
        }
        // Level 2+ plain cues (boxInhalePlain unused — Level 2+ inhale uses calmInhaleInstRef + boxLongInhaleRef)
        if (!boxHoldPlainRef.current) {
          boxHoldPlainRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/hold1.mp3'
          );
        }
        if (!boxExhalePlainRef.current) {
          boxExhalePlainRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Exhaleaudiospeak.mp3'
          );
        }
        // Level 2+ breath sounds
        if (!boxLongInhaleRef.current) {
          boxLongInhaleRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Long_inhale_tjanhab_svry2u.mp3'
          );
        }
        if (!boxExhaleBreathRef.current) {
          boxExhaleBreathRef.current = await loadAudioBuffer(
            ctx,
            'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/exhalesound.mp3'
          );
        }
      } catch (e) {
        console.error('Error initializing Box Breathing audio', e);
      }
    };
    initBoxAudio();
  }, [patternId, breathSoundEnabled, loadAudioBuffer]);

  useEffect(() => {
    // React to mute / unmute by adjusting gain only.
    const ctx = calmAudioCtxRef.current;
    const gain = calmGainRef.current;
    if (!ctx || !gain) return;
    if (breathSoundEnabled && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(breathSoundEnabled ? 1 : 0, t + 0.1);
  }, [breathSoundEnabled]);

  const playCalmBreathSound = useCallback(
    async (kind: 'INHALE' | 'HOLD' | 'EXHALE') => {
      if (!breathSoundEnabled) return;
      if (patternId !== 'CALM' && patternId !== 'BHRAMARI' && patternId !== 'BALANCE' && patternId !== 'REST') return;
      let ctx = calmAudioCtxRef.current;
      if (!ctx) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
        ctx = new Ctx();
        calmAudioCtxRef.current = ctx;
        const gain = ctx.createGain();
        gain.gain.value = 1;
        gain.connect(ctx.destination);
        calmGainRef.current = gain;
      }
      const gain = calmGainRef.current;
      if (!gain) return;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // ignore
        }
      }
      let buffer: AudioBuffer | null = null;
      if (patternId === 'CALM') {
        const effectiveLevel = freezeState.isFrozen ? freezeState.level : progress.level;
        const useCountedCues = effectiveLevel === 1 && sessionCycles <= 6; // Level 1, cycles 0–6
        if (useCountedCues) {
          // Level 1, cycles 0–6: Counted cues (Inhale6, hold3, Exhale9)
          if (kind === 'INHALE') buffer = inhale6Ref.current;
          else if (kind === 'HOLD') buffer = hold3Ref.current;
          else buffer = exhale9Ref.current;
        } else {
          // Level 2+ (or Level 1, cycles 7+): Plain cues with random variety
          if (kind === 'HOLD') {
            buffer = calmHoldPlainRef.current; // hold.mp3
          } else if (kind === 'INHALE') {
            // Long_inhale.mp3 mixed with InhaleInst.mp3 (no inhaleleft/inhaleRight in diaphragmatic)
            const pool = [calmInhalePlainRef.current, calmInhaleInstRef.current].filter(Boolean);
            buffer = pool[Math.floor(Math.random() * pool.length)] ?? calmInhalePlainRef.current;
          } else {
            // exhalelast.mp3 mixed with ExhaleInst.mp3 (no exhaleLeft/exhaleRight in diaphragmatic)
            const pool = [calmExhalePlainRef.current, calmExhaleInstRef.current].filter(Boolean);
            buffer = pool[Math.floor(Math.random() * pool.length)] ?? calmExhalePlainRef.current;
          }
        }
      } else if (patternId === 'REST') {
        // 4‑7‑8 Relaxation: same level/cycle logic as CALM
        const effectiveLevel = freezeState.isFrozen ? freezeState.level : progress.level;
        const useCountedCues = effectiveLevel === 1 && sessionCycles <= 6; // Level 1, cycles 0–6
        if (useCountedCues) {
          // Level 1, cycles 0–6: Inhale4, hold7, exhale8
          if (kind === 'INHALE') buffer = restInhale4Ref.current;
          else if (kind === 'HOLD') buffer = restHold7Ref.current;
          else buffer = restExhale8Ref.current;
        } else {
          // Level 2+ (or Level 1, cycles 7+): Plain cues — same as diaphragmatic (Long_inhale + InhaleInst, hold, exhalelast + ExhaleInst)
          if (kind === 'HOLD') buffer = calmHoldPlainRef.current;
          else if (kind === 'INHALE') {
            const pool = [calmInhalePlainRef.current, calmInhaleInstRef.current].filter(Boolean);
            buffer = pool[Math.floor(Math.random() * pool.length)] ?? calmInhalePlainRef.current;
          } else {
            const pool = [calmExhalePlainRef.current, calmExhaleInstRef.current].filter(Boolean);
            buffer = pool[Math.floor(Math.random() * pool.length)] ?? calmExhalePlainRef.current;
          }
        }
      } else if (patternId === 'BHRAMARI') {
        if (kind === 'INHALE') buffer = hummingInhaleRef.current;
        else if (kind === 'EXHALE') buffer = hummingExhaleRef.current;
        else return; // no hold sound for Humming Bee
      } else if (patternId === 'BALANCE') {
        const isFirstHalf = sessionCycles % 2 === 0;
        if (kind === 'INHALE') {
          buffer = isFirstHalf ? inhaleLeftRef.current : inhaleRightRef.current;
        } else if (kind === 'HOLD') {
          buffer = genericHoldRef.current;
        } else if (kind === 'EXHALE') {
          buffer = isFirstHalf ? exhaleRightRef.current : exhaleLeftRef.current;
        }
      }
      if (!buffer) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.start();
      } catch (e) {
        console.error('Error playing CALM cue', e);
      }
    },
    [breathSoundEnabled, patternId, sessionCycles, progress.level, freezeState]
  );

  // Fire Breath (ENERGY) cues
  const playFireCue = useCallback(
    async (kind: 'ACTIVE_EXHALE' | 'LAST_EXHALE' | 'DEEP_INHALE' | 'RECOVERY_EXHALE' | 'FIRE_INTRO' | 'FIRE_EXHALE_FULLY' | 'FIRE_INHALE_HALFWAY') => {
      if (!breathSoundEnabled) return;
      if (!isFireBreath || patternId !== 'ENERGY') return;
      let ctx = calmAudioCtxRef.current;
      if (!ctx) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
        ctx = new Ctx();
        calmAudioCtxRef.current = ctx;
        const gain = ctx.createGain();
        gain.gain.value = 1;
        gain.connect(ctx.destination);
        calmGainRef.current = gain;
      }
      const gain = calmGainRef.current;
      if (!gain) return;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // ignore
        }
      }

      let buffer: AudioBuffer | null = null;
      if (kind === 'ACTIVE_EXHALE') buffer = fireExhaleRef.current;
      else if (kind === 'LAST_EXHALE' || kind === 'FIRE_EXHALE_FULLY') buffer = fireLastExhaleRef.current;
      else if (kind === 'DEEP_INHALE') buffer = fireDeepInhaleRef.current;
      else if (kind === 'RECOVERY_EXHALE') buffer = fireRecoveryExhaleRef.current;
      else if (kind === 'FIRE_INTRO') buffer = fireIntroRef.current;
      else if (kind === 'FIRE_INHALE_HALFWAY') buffer = fireInhaleHalfwayRef.current;

      if (!buffer) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.start();
      } catch (e) {
        console.error('Error playing Fire Breath cue', e);
      }
    },
    [breathSoundEnabled, isFireBreath, patternId]
  );

  // Bhastrika cues (force in / force out / last exhale / recovery)
  const playBhastrikaCue = useCallback(
    async (kind: 'ACTIVE_EXHALE' | 'LAST_EXHALE' | 'DEEP_INHALE' | 'RECOVERY_EXHALE' | 'INHALE') => {
      if (!breathSoundEnabled) return;
      if (!isFireBreath || patternId !== 'BHASTRIKA') return;
      let ctx = calmAudioCtxRef.current;
      if (!ctx) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
        ctx = new Ctx();
        calmAudioCtxRef.current = ctx;
        const gain = ctx.createGain();
        gain.gain.value = 1;
        gain.connect(ctx.destination);
        calmGainRef.current = gain;
      }
      const gain = calmGainRef.current;
      if (!gain) return;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // ignore
        }
      }

      let buffer: AudioBuffer | null = null;
      if (kind === 'INHALE') buffer = bhastrikaInhaleRef.current;
      else if (kind === 'ACTIVE_EXHALE') buffer = bhastrikaExhaleRef.current;
      else if (kind === 'LAST_EXHALE' || kind === 'RECOVERY_EXHALE') buffer = bhastrikaLastExhaleRef.current;
      else if (kind === 'DEEP_INHALE') buffer = fireDeepInhaleRef.current; // shared long inhale

      if (!buffer) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.start();
      } catch (e) {
        console.error('Error playing Bhastrika cue', e);
      }
    },
    [breathSoundEnabled, isFireBreath, patternId]
  );

  // Box Breathing (FOCUS) cue selector
  const playBoxBreathSound = useCallback(
    async (kind: 'INHALE' | 'HOLD_TOP' | 'EXHALE' | 'HOLD_BOTTOM') => {
      if (patternId !== 'FOCUS') return;
      let ctx = calmAudioCtxRef.current;
      if (!ctx) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
        ctx = new Ctx();
        calmAudioCtxRef.current = ctx;
        const gain = ctx.createGain();
        gain.gain.value = 1;
        gain.connect(ctx.destination);
        calmGainRef.current = gain;
      }
      const gain = calmGainRef.current;
      if (!gain) return;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // ignore
        }
      }

      const effectiveLevel = freezeState.isFrozen ? freezeState.level : progress.level;
      const useCountedCues = effectiveLevel === 1 && sessionCycles <= 6; // Level 1, cycles 0–6

      let buffer: AudioBuffer | null = null;

      if (useCountedCues) {
        // Level 1, cycles 0–6: Inhale4, hold4, exhale4, hold4 (counted)
        if (kind === 'INHALE') buffer = boxInhale4Ref.current;
        else if (kind === 'EXHALE') buffer = boxExhale4Ref.current;
        else if (kind === 'HOLD_TOP') buffer = boxHold4TopRef.current;
        else if (kind === 'HOLD_BOTTOM') buffer = boxHold4BottomRef.current;
      } else {
        // Level 2+ (or Level 1, cycles 7+): Plain cues — InhaleInst + Long_inhale / ExhaleInst + exhalesound / hold1 or silence (no Level 1 cues)
        if (kind === 'INHALE') {
          const pool = [calmInhaleInstRef.current, boxLongInhaleRef.current].filter(Boolean);
          const chosen = pool[Math.floor(Math.random() * pool.length)] ?? calmInhaleInstRef.current;
          buffer = chosen;
          boxLastInhaleWasLongRef.current = chosen === boxLongInhaleRef.current;
        } else if (kind === 'EXHALE') {
          const pool = [calmExhaleInstRef.current, boxExhaleBreathRef.current].filter(Boolean);
          buffer = pool[Math.floor(Math.random() * pool.length)] ?? calmExhaleInstRef.current;
        } else if (kind === 'HOLD_TOP' || kind === 'HOLD_BOTTOM') {
          // When last inhale was Long_inhale, sometimes hold is silent (unpredictable human effect)
          if (boxLastInhaleWasLongRef.current && Math.random() < 0.45) {
            return; // silence — no hold cue
          }
          buffer = boxHoldPlainRef.current; // hold1.mp3
        }
      }

      if (!buffer) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.start();
      } catch (e) {
        console.error('Error playing Box Breathing cue', e);
      }
    },
    [patternId, progress.level, sessionCycles, freezeState]
  );

  // When Diaphragmatic (CALM) is running, play gentle inhale / hold / exhale cues on phase changes
  useEffect(() => {
    if (patternId !== 'CALM') return;
    if (!isRunning) return;
    if (phase === BreathPhase.INHALE) {
      playCalmBreathSound('INHALE');
      triggerHaptic('light'); // Subtle haptic on inhale
    } else if (phase === BreathPhase.HOLD) {
      playCalmBreathSound('HOLD');
    } else if (phase === BreathPhase.EXHALE) {
      playCalmBreathSound('EXHALE');
      triggerHaptic('light'); // Subtle haptic on exhale
    }
  }, [patternId, phase, isRunning, playCalmBreathSound]);

  // Relaxation (REST – 4‑7‑8) inhale / hold / exhale cues
  useEffect(() => {
    if (patternId !== 'REST') return;
    if (!isRunning) return;
    if (phase === BreathPhase.INHALE) {
      playCalmBreathSound('INHALE');
      triggerHaptic('light');
    } else if (phase === BreathPhase.HOLD) {
      playCalmBreathSound('HOLD');
    } else if (phase === BreathPhase.EXHALE) {
      playCalmBreathSound('EXHALE');
      triggerHaptic('light');
    }
  }, [patternId, phase, isRunning, playCalmBreathSound]);

  // Humming Bee (BHRAMARI) – inhale + humming exhale cues
  useEffect(() => {
    if (patternId !== 'BHRAMARI') return;
    if (!isRunning) return;
    if (phase === BreathPhase.INHALE) {
      playCalmBreathSound('INHALE');
      triggerHaptic('light');
    } else if (phase === BreathPhase.EXHALE) {
      playCalmBreathSound('EXHALE');
      triggerHaptic('medium'); // Stronger haptic for humming vibration
    }
  }, [patternId, phase, isRunning, playCalmBreathSound]);

  // Alternate Nostril (BALANCE) – inhale L/R, hold, exhale R/L cues
  useEffect(() => {
    if (patternId !== 'BALANCE') return;
    if (!isRunning) return;
    if (phase === BreathPhase.INHALE) {
      playCalmBreathSound('INHALE');
      triggerHaptic('light');
    } else if (phase === BreathPhase.HOLD) {
      playCalmBreathSound('HOLD');
    } else if (phase === BreathPhase.EXHALE) {
      playCalmBreathSound('EXHALE');
      triggerHaptic('light');
    }
  }, [patternId, phase, isRunning, playCalmBreathSound]);

  // Fire Breath (ENERGY) – phase-specific cues (active exhale, last exhale, deep inhale, recovery)
  useEffect(() => {
    if (!isFireBreath || patternId !== 'ENERGY') return;
    if (!isRunning) return;

    if (firePhase === 'ACTIVE' && phase === BreathPhase.EXHALE) {
      playFireCue('ACTIVE_EXHALE');
      triggerHaptic('medium'); // Energetic haptic for fire breath
    } else if (firePhase === 'FINAL_EXHALE' && phase === BreathPhase.EXHALE) {
      playFireCue('LAST_EXHALE');
      triggerHaptic('medium');
    } else if (firePhase === 'DEEP_INHALE' && phase === BreathPhase.INHALE) {
      playFireCue('DEEP_INHALE');
      triggerHaptic('light');
    } else if (firePhase === 'RECOVERY' && phase === BreathPhase.EXHALE) {
      playFireCue('RECOVERY_EXHALE');
      triggerHaptic('light');
    }
  }, [isFireBreath, patternId, isRunning, firePhase, phase, playFireCue]);

  // Bhastrika – phase-specific cues (force in/out, last exhale, deep inhale, recovery)
  useEffect(() => {
    if (!isFireBreath || patternId !== 'BHASTRIKA') return;
    if (!isRunning) return;

    if (firePhase === 'ACTIVE') {
      if (phase === BreathPhase.INHALE) {
        playBhastrikaCue('INHALE');          // force in
        triggerHaptic('medium');
      } else if (phase === BreathPhase.EXHALE) {
        playBhastrikaCue('ACTIVE_EXHALE');   // force out
        triggerHaptic('medium');
      }
    } else if (firePhase === 'FINAL_EXHALE' && phase === BreathPhase.EXHALE) {
      playBhastrikaCue('LAST_EXHALE');       // last exhale
      triggerHaptic('medium');
    } else if (firePhase === 'DEEP_INHALE' && phase === BreathPhase.INHALE) {
      playBhastrikaCue('DEEP_INHALE');       // deep inhale before hold
      triggerHaptic('light');
    } else if (firePhase === 'RECOVERY' && phase === BreathPhase.EXHALE) {
      playBhastrikaCue('RECOVERY_EXHALE');   // recovery slow exhale
      triggerHaptic('light');
    }
  }, [isFireBreath, patternId, isRunning, firePhase, phase, playBhastrikaCue]);

  // Box Breathing phase → cue mapping
  useEffect(() => {
    if (patternId !== 'FOCUS') return;
    if (!isRunning) return;
    if (phase === BreathPhase.INHALE) {
      playBoxBreathSound('INHALE');
      triggerHaptic('light');
    } else if (phase === BreathPhase.HOLD) {
      playBoxBreathSound('HOLD_TOP');
    } else if (phase === BreathPhase.EXHALE) {
      playBoxBreathSound('EXHALE');
      triggerHaptic('light');
    } else if (phase === BreathPhase.HOLD_EMPTY) {
      playBoxBreathSound('HOLD_BOTTOM');
    }
  }, [patternId, phase, isRunning, playBoxBreathSound]);

  useEffect(() => {
    if (!activeSoundscape) {
      if (stopSoundscapeRef.current) stopSoundscapeRef.current();
      return;
    }
    if (!audioContextRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
      audioContextRef.current = new Ctx({ sampleRate: 24000 });
    }
    if (!gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = 0.5;
    }
    if (stopSoundscapeRef.current) stopSoundscapeRef.current();
    stopSoundscapeRef.current = playSoundscape(activeSoundscape, audioContextRef.current!, gainNodeRef.current!);
  }, [activeSoundscape]);

  const completeCycle = useCallback(() => {
    const next = sessionCycles + 1;
    setSessionCycles(next);
    registerBreathCycle(patternId);
    const threshold = CYCLES_TO_LEVEL_UP;
    const willLevelUp = !freezeState.isFrozen && ADAPTIVE_PATTERN_IDS.includes(patternId) && progress.cyclesInLevel + 1 >= threshold;
    if (willLevelUp) {
      const nextLevel = progress.level + 1;
      levelUpPattern(patternId);
      if (patternId === 'FOCUS') {
        setCelebration(JSON.stringify({ type: 'box', level: nextLevel }));
        window.setTimeout(() => setCelebration(null), 3500);
      } else if (patternId === 'CALM') {
        setCelebration(JSON.stringify({ type: 'calm', level: nextLevel }));
        window.setTimeout(() => setCelebration(null), 3500);
      } else if (patternId === 'REST') {
        setCelebration(JSON.stringify({ type: 'rest', level: nextLevel }));
        window.setTimeout(() => setCelebration(null), 3500);
      } else {
        setStandardLevelUpToast(`✨ Level ${nextLevel} Unlocked`);
        window.setTimeout(() => setStandardLevelUpToast(null), 2500);
      }
    }
  }, [sessionCycles, registerBreathCycle, patternId, progress.cyclesInLevel, progress.level, levelUpPattern, freezeState.isFrozen]);

  const completeFireLevel = useCallback(() => {
    addCalmPoints(100);
    if (!freezeState.isFrozen && progress.level < 6) {
      const nextLevel = progress.level + 1;
      const cfg = FIRE_LADDER[nextLevel];
      // Zen-style celebration message
      setCelebration(JSON.stringify({
        level: nextLevel,
        cycles: cfg.cycles,
        hold: cfg.fullHold,
        benefit: cfg.benefit
      }));
      levelUpPattern(patternId);
      setFirePhase('ACTIVE');
      setSessionCycles(0);
      setIsRunning(false);
      window.setTimeout(() => setCelebration(null), 3500);
    } else {
      incrementStreak();
      setIsRunning(false);
    }
  }, [addCalmPoints, progress.level, levelUpPattern, patternId, incrementStreak, freezeState.isFrozen]);

  const playChime = useCallback(() => {
    try {
      const ctx = calmAudioCtxRef.current;
      if (!ctx || !chimeBufferRef.current || !calmGainRef.current) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const source = ctx.createBufferSource();
      source.buffer = chimeBufferRef.current;
      source.connect(calmGainRef.current);
      source.start(0);
    } catch (e) { console.error('Error playing chime', e); }
  }, []);

  useEffect(() => {
    if (celebration && breathSoundEnabled) playChime();
  }, [celebration, breathSoundEnabled, playChime]);

  const runStandardLogic = useCallback(() => {
    clearTimer();
    if (phase === BreathPhase.IDLE) { setPhase(BreathPhase.INHALE); return; }
    const duration = phase === BreathPhase.INHALE ? sessionCadence.inhale : phase === BreathPhase.HOLD ? sessionCadence.hold : phase === BreathPhase.EXHALE ? sessionCadence.exhale : sessionCadence.holdEmpty;
    timerRef.current = window.setTimeout(() => {
      if (phase === BreathPhase.INHALE) { setPhase(sessionCadence.hold > 0 ? BreathPhase.HOLD : BreathPhase.EXHALE); }
      else if (phase === BreathPhase.HOLD) { setPhase(BreathPhase.EXHALE); }
      else if (phase === BreathPhase.EXHALE) {
        if (sessionCadence.holdEmpty > 0) { setPhase(BreathPhase.HOLD_EMPTY); }
        else { completeCycle(); setPhase(BreathPhase.INHALE); }
      } else { completeCycle(); setPhase(BreathPhase.INHALE); }
    }, duration * 1000);
  }, [clearTimer, phase, sessionCadence, completeCycle]);

  const runFireLogic = useCallback(() => {
    clearTimer();
    // Breath of Fire INTRO: inhale fully → exhale fully → inhale halfway, then ACTIVE
    if (firePhase === 'INTRO') {
      if (fireIntroStep === 0) {
        setPhase(BreathPhase.INHALE);
        playFireCue('FIRE_INTRO');
        timerRef.current = window.setTimeout(() => setFireIntroStep(1), 3500);
      } else if (fireIntroStep === 1) {
        setPhase(BreathPhase.EXHALE);
        playFireCue('FIRE_EXHALE_FULLY');
        timerRef.current = window.setTimeout(() => setFireIntroStep(2), 3500);
      } else if (fireIntroStep === 2) {
        setPhase(BreathPhase.INHALE);
        playFireCue('FIRE_INHALE_HALFWAY');
        timerRef.current = window.setTimeout(() => {
          setFireIntroStep(0);
          setFirePhase('ACTIVE');
          setPhase(BreathPhase.EXHALE); // First rapid breath is exhale
        }, 3000);
      }
      return;
    }
    if (firePhase === 'ACTIVE') {
      if (phase === BreathPhase.IDLE) { setPhase(BreathPhase.INHALE); return; }
      const duration = phase === BreathPhase.INHALE ? basePattern.inhale : basePattern.exhale;
      timerRef.current = window.setTimeout(() => {
        if (phase === BreathPhase.INHALE) { setPhase(BreathPhase.EXHALE); }
        else {
          const next = sessionCycles + 1;
          setSessionCycles(next);
          registerBreathCycle(patternId);
          if (next >= fireConfig.cycles) { setFirePhase('FINAL_EXHALE'); setPhase(BreathPhase.IDLE); }
          else { setPhase(BreathPhase.INHALE); }
        }
      }, duration * 1000);
      return;
    }
    if (firePhase === 'FINAL_EXHALE') {
      setPhase(BreathPhase.EXHALE);
      timerRef.current = window.setTimeout(() => {
        if (fireConfig.emptyHold > 0) { setHoldTimer(fireConfig.emptyHold); setFirePhase('EMPTY_HOLD'); setPhase(BreathPhase.HOLD_EMPTY); }
        else { setFirePhase('DEEP_INHALE'); }
      }, 1500);
      return;
    }
    if (firePhase === 'EMPTY_HOLD') {
      if (holdTimer > 0) { timerRef.current = window.setTimeout(() => setHoldTimer((t) => t - 1), 1000); }
      else { setFirePhase('DEEP_INHALE'); }
      return;
    }
    if (firePhase === 'DEEP_INHALE') {
      setPhase(BreathPhase.INHALE);
      timerRef.current = window.setTimeout(() => { setHoldTimer(fireConfig.fullHold); setFirePhase('FULL_HOLD'); setPhase(BreathPhase.HOLD); }, 3000);
      return;
    }
    if (firePhase === 'FULL_HOLD') {
      if (holdTimer > 0) { timerRef.current = window.setTimeout(() => setHoldTimer((t) => t - 1), 1000); }
      else { setFirePhase('RECOVERY'); }
      return;
    }
    if (firePhase === 'RECOVERY') {
      setPhase(BreathPhase.EXHALE);
      timerRef.current = window.setTimeout(() => completeFireLevel(), 3000);
      return;
    }
  }, [clearTimer, firePhase, fireIntroStep, phase, basePattern, sessionCycles, registerBreathCycle, patternId, fireConfig, holdTimer, completeFireLevel, playFireCue]);

  useEffect(() => {
    if (!isRunning) { clearTimer(); setPhase(BreathPhase.IDLE); return; }
    if (isFireBreath) runFireLogic();
    else runStandardLogic();
    return () => clearTimer();
  }, [isRunning, isFireBreath, runFireLogic, runStandardLogic, clearTimer]);

  // Start / stop breathing timer (used after preparation completes)
  const toggleBreathing = useCallback(
    async (forceOn?: boolean) => {
      await ensureAudioReady();
      setIsRunning((prev) => {
        const nextRunning = forceOn !== undefined ? forceOn : !prev;
        if (nextRunning && isFireBreath) {
          setFirePhase(patternId === 'ENERGY' ? 'INTRO' : 'ACTIVE');
          setFireIntroStep(0);
          setSessionCycles(0);
          setHoldTimer(0);
          setPhase(BreathPhase.IDLE);
        }
        if (!nextRunning) {
          clearTimer();
          setPhase(BreathPhase.IDLE);
        }
        return nextRunning;
      });
    },
    [ensureAudioReady, isFireBreath, patternId, clearTimer]
  );

  // Skip preparation and start breathing immediately
  const handleSkipPreparation = useCallback(() => {
    clearPrepareTimer();
    setIsPreparing(false);
    setHasStarted(true);
    toggleBreathing(true);
  }, [clearPrepareTimer, toggleBreathing]);

  // Handle tap on orb / start button with 6–9s preparation like MorningRitual
  const handleStart = useCallback(() => {
    triggerHaptic('medium');
    
    // ✅ Zen Mode: If UI is hidden and session is running, fade in UI and reset inactivity timer
    if (isRunning && !uiVisible) {
      resetInactivityTimer();
      return;
    }

    setUiVisible(true);
    setShowLevelMenu(false);
    resetInactivityTimer(); // Reset inactivity timer on any interaction

    // If session is already running, pause it
    if (isRunning) {
      toggleBreathing(false);
      return;
    }

    // If session has been started before (paused state), resume immediately without intro/preparation
    if (hasStarted) {
      toggleBreathing(true);
      return;
    }

    // If we are in preparation, tapping again skips instructions and starts breathing
    if (isPreparing) {
      handleSkipPreparation();
      return;
    }

    // Fresh start → show preparation screen if we have copy for this pattern
    const config = PREPARE_CUES[patternId];
    if (!config) {
      // Fallback: start breathing immediately (should not happen for our 7 patterns)
      setHasStarted(true);
      toggleBreathing(true);
      return;
    }

    const duration = computePrepareDurationSeconds(config);
    setPrepareDuration(duration);
    setPrepareTimeLeft(duration);
    setIsPreparing(true);
  }, [
    isRunning,
    isPreparing,
    hasStarted,
    patternId,
    toggleBreathing,
    handleSkipPreparation,
    uiVisible,
    resetInactivityTimer,
  ]);

  const handleIntroStart = useCallback(() => {
    setShowIntroCard(false);
    setShowIntroCardForced(false);
    
    // Proceed to preparation screen
    const config = PREPARE_CUES[patternId];
    if (config) {
      const duration = computePrepareDurationSeconds(config);
      setPrepareDuration(duration);
      setPrepareTimeLeft(duration);
      setIsPreparing(true);
    } else {
      setHasStarted(true);
      toggleBreathing(true);
    }
  }, [patternId, toggleBreathing]);

  const handleShowIntroInfo = useCallback(() => {
    const techniqueInfo = getTechniqueInfo(patternId);
    if (techniqueInfo) {
      setShowIntroCardForced(true);
      setShowIntroCard(true);
    }
  }, [patternId]);

  const getBgGradient = useCallback(() => {
    if (!isRunning || !isFireBreath) return 'from-[#0f2f3c] via-[#16536a] to-[#0f2735]';
    if (firePhase === 'EMPTY_HOLD') return 'from-[#1e3a5f] to-[#0B1121]';
    if (firePhase === 'DEEP_INHALE') return 'from-[#4c1d95] via-[#1e1b4b] to-[#0f172a]';
    if (firePhase === 'FULL_HOLD') return 'from-[#0d9488] to-[#0f172a]';
    return 'from-[#1A4D5C] via-[#2F5A6C] to-[#0f172a]';
  }, [isRunning, isFireBreath, firePhase]);

  const currentPhaseDuration = useMemo(() => {
    if (isFireBreath) {
      if (firePhase === 'INTRO') {
        if (fireIntroStep === 0) return 3.5;
        if (fireIntroStep === 1) return 3.5;
        if (fireIntroStep === 2) return 3;
      }
      if (firePhase === 'ACTIVE') return phase === BreathPhase.INHALE ? basePattern.inhale : basePattern.exhale;
      if (firePhase === 'EMPTY_HOLD' || firePhase === 'FULL_HOLD') return Math.max(1, holdTimer);
      return 3;
    }
    if (phase === BreathPhase.INHALE) return sessionCadence.inhale;
    if (phase === BreathPhase.HOLD) return sessionCadence.hold;
    if (phase === BreathPhase.EXHALE) return sessionCadence.exhale;
    if (phase === BreathPhase.HOLD_EMPTY) return sessionCadence.holdEmpty;
    return 1;
  }, [phase, sessionCadence, isFireBreath, firePhase, fireIntroStep, holdTimer, basePattern]);

  const currentHoldValue = useMemo(() => {
    if (isFireBreath && (firePhase === 'EMPTY_HOLD' || firePhase === 'FULL_HOLD')) return holdTimer;
    return undefined;
  }, [isFireBreath, firePhase, holdTimer]);

  const effectiveLevel = useMemo(() => freezeState.isFrozen ? freezeState.level : progress.level, [freezeState, progress]);

  // ✅ Zen Mode: Auto-fade after 3 cycles
  useEffect(() => {
    if (!isRunning) {
      zenModeEnabledRef.current = false;
      clearInactivityTimer();
      // Ensure UI is visible when session is not running
      setUiVisible(true);
      return;
    }

    // After 3 cycles, enable zen mode and fade out UI
    // Only trigger if we've actually completed cycles (not on initial load)
    if (sessionCycles >= CYCLES_BEFORE_ZEN_MODE && !zenModeEnabledRef.current && hasStarted) {
      zenModeEnabledRef.current = true;
      // Smooth fade out after a brief delay
      const fadeOutTimer = setTimeout(() => {
        setUiVisible(false);
        // Start inactivity timer for auto-fade after interaction
        inactivityTimerRef.current = window.setTimeout(() => {
          // Already faded out, so this is just cleanup
          inactivityTimerRef.current = null;
        }, INACTIVITY_TIMEOUT_MS);
      }, 500); // Small delay after cycle completes

      return () => {
        clearTimeout(fadeOutTimer);
        clearInactivityTimer();
      };
    }
  }, [sessionCycles, isRunning, hasStarted, clearInactivityTimer]);

  // ✅ Cleanup inactivity timer when session stops
  useEffect(() => {
    if (!isRunning) {
      clearInactivityTimer();
      zenModeEnabledRef.current = false;
    }
  }, [isRunning, clearInactivityTimer]);

  // Drive 6–9s preparation countdown (instructions only; breathing logic unchanged)
  useEffect(() => {
    if (!isPreparing) return;
    if (prepareTimeLeft <= 0) {
      setIsPreparing(false);
      // Start breathing automatically after preparation
      setHasStarted(true);
      toggleBreathing(true);
      return;
    }

    prepareTimerRef.current = window.setTimeout(() => {
      setPrepareTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (prepareTimerRef.current) {
        window.clearTimeout(prepareTimerRef.current);
      }
    };
  }, [isPreparing, prepareTimeLeft, toggleBreathing]);

  // ✅ Handle screen tap for zen mode (fade in UI on tap)
  const handleScreenTap = useCallback((e: React.MouseEvent) => {
    // Only handle taps on the main container, not on interactive elements
    if ((e.target as HTMLElement).closest('button, a, [role="button"]')) {
      return;
    }
    
    // If UI is hidden and session is running, fade in and reset timer
    if (isRunning && !uiVisible) {
      resetInactivityTimer();
      return;
    }
    
    // Reset inactivity timer on any tap
    if (isRunning) {
      resetInactivityTimer();
    }
    
    setShowLevelMenu(false);
  }, [isRunning, uiVisible, resetInactivityTimer]);

  const boxBgGlowOpacity = useMemo(() => {
    if (!isBoxBreath) return 0;
    switch (phase) {
      case BreathPhase.INHALE: return 0.12;
      case BreathPhase.HOLD: return 0.08;
      case BreathPhase.EXHALE: return 0.04;
      case BreathPhase.HOLD_EMPTY: return 0.02;
      default: return 0.06;
    }
  }, [isBoxBreath, phase]);

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col relative overflow-hidden bg-gradient-to-b transition-all duration-1000 ${getBgGradient()} text-white animate-fade-in`}
      style={{ animationDuration: '0.35s' }}
      onClick={handleScreenTap}
    >
      {/* Box Breathing: subtle animated background (only when FOCUS pattern) */}
      {isBoxBreath && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Slow-moving gradient (teal to darker teal) - very subtle overlay */}
          <div
            className="absolute inset-0 bg-[length:200%_200%] animate-box-bg-gradient"
            style={{
              backgroundImage: 'linear-gradient(135deg, rgba(13,148,136,0.25) 0%, rgba(15,118,110,0.2) 25%, rgba(17,94,89,0.15) 50%, rgba(15,118,110,0.2) 75%, rgba(13,148,136,0.25) 100%)',
              backgroundPosition: '0% 50%',
            }}
          />
          {/* Geometric particles (squares/rectangles, 5% opacity) */}
          <div className="absolute inset-0">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-sm bg-teal-400 animate-box-bg-particle"
                style={{
                  left: `${(i * 7 + 13) % 92}%`,
                  top: `${(i * 11 + 17) % 88}%`,
                  width: i % 3 === 0 ? 6 : i % 3 === 1 ? 8 : 10,
                  height: i % 2 === 0 ? 6 : 10,
                  animationDelay: `${(i / 12) * 12}s`,
                  opacity: 0.05,
                }}
              />
            ))}
          </div>
          {/* Breath-synced glow pulse (brightens on inhale, dims on exhale) */}
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(13,148,136,0.4),transparent_70%)] ease-in-out"
            style={{
              opacity: boxBgGlowOpacity,
              transition: `opacity ${Math.max(2000, (currentPhaseDuration || 4) * 600)}ms`,
            }}
          />
        </div>
      )}
      {standardLevelUpToast && (
        <div className="fixed left-0 right-0 z-[110] flex justify-center px-6 pointer-events-none" style={{ top: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}>
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold animate-fade-in shadow-2xl">{standardLevelUpToast}</div>
        </div>
      )}
      {celebration && (() => {
        try {
          const data = JSON.parse(celebration);
          if (data.type === 'box') {
            const phrase = BOX_LEVEL_PHRASES[data.level] ?? BOX_LEVEL_PHRASE_FINAL;
            return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden animate-fade-in">
                {/* Minimal dark overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                {/* Single subtle teal glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(13,148,136,0.08),transparent_70%)] pointer-events-none" />
                {/* Content: clean, minimal */}
                <div className="relative flex flex-col items-center justify-center px-8 text-center animate-scale-in">
                  <div className="mb-3 w-8 h-8 rounded-lg border border-teal-400/40 bg-teal-500/5" />
                  <h1 className="text-xl sm:text-2xl font-serif font-medium text-white/95 tracking-wide">
                    {phrase}
                  </h1>
                  <p className="mt-2 text-[11px] font-medium text-teal-400/70 tracking-[0.2em] uppercase">
                    Level {data.level}
                  </p>
                </div>
              </div>
            );
          }
          if (data.type === 'calm') {
            const completedLevel = data.level - 1;
            const phraseIdx = ((completedLevel - 1) % 4) + 1;
            const phrase = CALM_LEVEL_PHRASES[phraseIdx] ?? CALM_LEVEL_PHRASES[1];
            const descKey = data.level >= 6 ? 5 + ((data.level - 6) % 8) : 0;
            const description = descKey ? CALM_LEVEL_DESCRIPTIONS[descKey] : undefined;
            const showFinal = completedLevel === 12;
            return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden animate-fade-in">
                {/* Minimal dark overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                {/* Organic green/teal glow (nature theme) */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(5,150,105,0.12),rgba(13,148,136,0.06),transparent_70%)] pointer-events-none" />
                {/* Breathing wave gradient */}
                <div
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(180deg, transparent 0%, rgba(5,150,105,0.08) 40%, rgba(13,148,136,0.06) 60%, transparent 100%)',
                    backgroundSize: '100% 200%',
                    animation: 'calm-wave-breathe 4s ease-in-out infinite',
                  }}
                />
                {/* Soft particles: leaves, light rays, air wisps */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-emerald-400/40 animate-calm-particle-rise"
                      style={{
                        left: `${((i * 13 + 19) % 92)}%`,
                        bottom: '-5%',
                        animationDelay: `${(i / 12) * 2}s`,
                        animationDuration: `${3 + (i % 4) * 0.5}s`,
                      }}
                    />
                  ))}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`leaf-${i}`}
                      className="absolute text-emerald-500/30 animate-calm-leaf-sway"
                      style={{
                        left: `${(i * 18 + 5) % 92}%`,
                        top: `${(i * 11 + 15) % 85}%`,
                        fontSize: 14 + (i % 3) * 4,
                        animationDelay: `${i * 0.4}s`,
                      }}
                    >
                      🍃
                    </div>
                  ))}
                </div>
                {/* Content: clean, minimal (like Box) */}
                <div className="relative flex flex-col items-center justify-center px-8 text-center animate-scale-in max-w-sm">
                  <div className="mb-3 w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-400/40 animate-prepare-leaf-sway">
                    <Leaf className="w-6 h-6 text-emerald-400/80" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-serif font-medium text-white/95 tracking-wide">
                    {phrase}
                  </h1>
                  {showFinal && (
                    <p className="mt-2 text-base font-serif text-emerald-300/90 font-medium">
                      {CALM_LEVEL_PHRASE_FINAL}
                    </p>
                  )}
                  {description && (
                    <p className="mt-3 text-sm font-serif text-white/70 leading-relaxed">
                      {description}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] font-medium text-emerald-400/70 tracking-[0.2em] uppercase">
                    Level {data.level}
                  </p>
                </div>
              </div>
            );
          }
          if (data.type === 'rest') {
            const completedLevel = data.level - 1;
            const phraseIdx = ((completedLevel - 1) % 4) + 1;
            const phrase = REST_LEVEL_PHRASES[phraseIdx] ?? REST_LEVEL_PHRASES[1];
            const descKey = ((completedLevel - 1) % 12) + 1;
            const description = REST_LEVEL_DESCRIPTIONS[descKey];
            const showFinal = completedLevel === 12;
            return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden animate-fade-in">
                {/* Minimal dark overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                {/* Organic green/teal glow (nature theme) */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(5,150,105,0.12),rgba(13,148,136,0.06),transparent_70%)] pointer-events-none" />
                {/* Breathing wave gradient */}
                <div
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(180deg, transparent 0%, rgba(5,150,105,0.08) 40%, rgba(13,148,136,0.06) 60%, transparent 100%)',
                    backgroundSize: '100% 200%',
                    animation: 'calm-wave-breathe 4s ease-in-out infinite',
                  }}
                />
                {/* Soft particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-emerald-400/40 animate-calm-particle-rise"
                      style={{
                        left: `${((i * 13 + 19) % 92)}%`,
                        bottom: '-5%',
                        animationDelay: `${(i / 12) * 2}s`,
                        animationDuration: `${3 + (i % 4) * 0.5}s`,
                      }}
                    />
                  ))}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`leaf-${i}`}
                      className="absolute text-emerald-500/30 animate-calm-leaf-sway"
                      style={{
                        left: `${(i * 18 + 5) % 92}%`,
                        top: `${(i * 11 + 15) % 85}%`,
                        fontSize: 14 + (i % 3) * 4,
                        animationDelay: `${i * 0.4}s`,
                      }}
                    >
                      🍃
                    </div>
                  ))}
                </div>
                {/* Content */}
                <div className="relative flex flex-col items-center justify-center px-8 text-center animate-scale-in max-w-sm">
                  <p className="text-[10px] font-medium text-emerald-400/60 tracking-[0.25em] uppercase mb-1">
                    Nature‑Inspired 4‑7‑8 Breathing Journey
                  </p>
                  <div className="mb-3 w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-400/40 animate-prepare-leaf-sway">
                    <Leaf className="w-6 h-6 text-emerald-400/80" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-serif font-medium text-white/95 tracking-wide">
                    {phrase}
                  </h1>
                  {showFinal && (
                    <p className="mt-2 text-base font-serif text-emerald-300/90 font-medium">
                      {REST_LEVEL_PHRASE_FINAL}
                    </p>
                  )}
                  {description && (
                    <p className="mt-3 text-sm font-serif text-white/70 leading-relaxed">
                      {description}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] font-medium text-emerald-400/70 tracking-[0.2em] uppercase">
                    Level {data.level}
                  </p>
                </div>
              </div>
            );
          }
          const completedCycles = FIRE_LADDER[data.level - 1]?.cycles ?? data.cycles;
          const titleText = data.level === 2 ? '🔥 Fire Ignited' : `Level ${data.level - 1} Mastered`;
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden animate-fade-in">
              {/* Golden/amber glow background */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-950/40 via-amber-900/20 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(245,158,11,0.25),transparent_70%)]" />
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              {/* Flame particles rising */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-amber-400/70 animate-rise-up"
                    style={{
                      left: `${((i * 17 + 31) % 95)}%`,
                      bottom: '-10%',
                      animationDelay: `${(i / 24) * 1.5}s`,
                      animationDuration: `${3.5 + (i % 3) * 0.5}s`,
                      opacity: 0.5 + (i % 5) * 0.1,
                    }}
                  />
                ))}
              </div>
              {/* Content */}
              <div className="relative flex flex-col items-center justify-center px-8 text-center animate-scale-in">
                <h1 className="text-4xl sm:text-5xl font-serif font-bold text-[#F59E0B] drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                  {titleText}
                </h1>
                <p className="mt-3 text-lg font-serif text-amber-200/90 tracking-wide">
                  Your inner flame grows stronger
                </p>
                <p className="mt-6 text-sm font-serif text-white/70 max-w-xs leading-relaxed">
                  You completed {completedCycles} cycles. Prepare for deeper intensity.
                </p>
                <p className="mt-4 text-sm font-serif italic text-amber-300/80">
                  {data.benefit}
                </p>
              </div>
            </div>
          );
        } catch {
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-2xl animate-fade-in p-6">
              <div className="bg-gradient-to-br from-white/5 to-white/0 p-12 rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full backdrop-blur-sm">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                    <Sparkles size={32} className="text-brand-gold/80" />
                  </div>
                  <div className="text-lg font-serif font-light text-white/90 text-center leading-relaxed">
                    {celebration.replace('🎉 ', '').replace('!', '')}
                  </div>
                </div>
              </div>
            </div>
          );
        }
      })()}
      {/* 6–9s preparation overlay (text + soft progress bar, before breathing starts) */}
      {isPreparing && (
        <div
          className={`absolute inset-0 z-30 flex flex-col items-center justify-center px-8 text-center backdrop-blur-xl animate-fade-in ${
            patternId === 'FOCUS'
              ? 'bg-[#0f766e]/30'
              : patternId === 'CALM'
              ? 'bg-[#0d4f4a]/95'
              : patternId === 'REST'
              ? 'bg-[#1e1b4b]/95'
              : patternId === 'BALANCE'
              ? 'bg-[#0f4d4a]/95'
              : isFireBreath
              ? 'bg-[#2a1f0f]/95'
              : 'bg-[#1A4D5C]/95'
          }`}
        >
          {/* Teal glow for Box Breathing */}
          {patternId === 'FOCUS' && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(13,148,136,0.15),transparent_70%)] pointer-events-none" />
          )}
          {/* Green/teal glow for Diaphragmatic Breathing */}
          {patternId === 'CALM' && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(16,185,129,0.2),rgba(13,148,136,0.08),transparent_70%)] pointer-events-none" />
          )}
          {/* Warm amber/orange glow for Breath of Fire / Bhastrika */}
          {isFireBreath && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(251,146,60,0.25),rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />
          )}
          {/* Deep blue to purple glow for 4-7-8 Breathing */}
          {patternId === 'REST' && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(76,29,149,0.35),rgba(49,46,129,0.2),transparent_70%)] pointer-events-none" />
          )}
          {/* Teal gradient glow for Alternate Nostril (equilibrium) */}
          {patternId === 'BALANCE' && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(20,184,166,0.25),rgba(13,148,136,0.12),transparent_70%)] pointer-events-none" />
          )}
          <div
            className={`relative flex flex-col items-center max-w-sm ${
              patternId === 'FOCUS' ? 'animate-prepare-card-pulse' : patternId === 'CALM' ? 'animate-prepare-card-scale-pulse' : patternId === 'REST' ? 'animate-prepare-rest-card-pulse rounded-2xl px-5 py-3 bg-indigo-950/20' : patternId === 'BALANCE' ? 'animate-prepare-balance-card-pulse rounded-2xl px-5 py-3 bg-teal-950/20' : isFireBreath ? 'animate-prepare-flame-card-pulse rounded-2xl px-5 py-3 bg-amber-950/15' : ''
            }`}
          >
            <div className={`text-[10px] font-bold tracking-[0.35em] uppercase mb-4 ${
              patternId === 'CALM' ? 'text-emerald-400/80' : patternId === 'REST' ? 'text-indigo-300/90' : patternId === 'BALANCE' ? 'text-teal-300/90' : isFireBreath ? 'text-amber-400/90' : 'text-brand-gold/70'
            }`}>
              PREPARE
            </div>
            {patternId === 'FOCUS' ? (
              <div className="w-10 h-10 rounded-lg border-2 border-teal-400/50 mb-4 animate-prepare-square-icon bg-teal-500/5" />
            ) : patternId === 'CALM' ? (
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center bg-emerald-500/15 border border-emerald-400/40 animate-prepare-leaf-sway">
                <Leaf size={24} className="text-emerald-300" strokeWidth={2} />
              </div>
            ) : patternId === 'REST' ? (
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center bg-indigo-500/20 border border-indigo-400/40 animate-prepare-moon-glow-pulse">
                <Moon size={24} className="text-indigo-300" strokeWidth={2} />
              </div>
            ) : patternId === 'BALANCE' ? (
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center bg-teal-600/20 border border-teal-400/50 animate-prepare-scale-balance-tip">
                <Scale size={24} className="text-teal-300" strokeWidth={2} />
              </div>
            ) : isFireBreath ? (
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center bg-amber-500/20 border border-amber-400/50 animate-prepare-flame-flicker">
                <Flame size={24} className="text-amber-400" strokeWidth={2} fill="currentColor" />
              </div>
            ) : null}
            <div className="text-xl font-serif font-light text-white/80 tracking-wide mb-2">
              {PREPARE_CUES[patternId]?.techniqueName}
            </div>
            {PATTERN_RECOMMENDATIONS[patternId] && (
              <div className="mt-3 text-xs font-light text-white/50 tracking-wide">
                {PATTERN_RECOMMENDATIONS[patternId].duration} · {PATTERN_RECOMMENDATIONS[patternId].bestTime}
              </div>
            )}
            <div className="mt-6 space-y-3 max-w-sm">
              <div className="text-lg md:text-xl font-serif font-light text-white/95 leading-relaxed">
                {PREPARE_CUES[patternId]?.line1}
              </div>
              {PREPARE_CUES[patternId]?.line2 ? (
                <div className="text-base md:text-lg font-serif font-light text-white/80 leading-relaxed">
                  {PREPARE_CUES[patternId]?.line2}
                </div>
              ) : null}
            </div>
            {/* Safety disclaimer for Fire Breath and Bhastrika on prepare screen */}
            {isFireBreath && (
              <div className="mt-8 max-w-sm px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl backdrop-blur-sm">
                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-orange-400/90 mb-1.5">
                  Important Note
                </div>
                <div className="text-[10px] font-light text-white/80 leading-relaxed">
                  Fire breathing practices such as Bhastrika / Breath of Fire are energizing and intense. If you have high blood pressure, heart conditions, dizziness, or are pregnant, please avoid or modify these practices. Always use your own judgment and stop if you feel discomfort.
                </div>
              </div>
            )}
            <div className="mt-10 w-full max-w-xs">
              <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ease-linear rounded-full ${
                    patternId === 'FOCUS' ? 'bg-teal-400/70' : patternId === 'CALM' ? 'bg-emerald-400/70' : patternId === 'REST' ? 'bg-indigo-400/70' : patternId === 'BALANCE' ? 'bg-teal-400/70' : isFireBreath ? 'bg-amber-400/80' : 'bg-brand-gold/70'
                  }`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        1,
                        (prepareDuration - prepareTimeLeft) / Math.max(1, prepareDuration)
                      )
                    ) * 100}%`,
                  }}
                />
              </div>
              <div
                className={`mt-3 font-mono font-medium tracking-[0.25em] uppercase ${
                  patternId === 'REST'
                    ? 'animate-countdown-dreamy-fade text-indigo-200/95'
                    : patternId === 'BALANCE'
                    ? 'animate-countdown-balance-fade text-teal-200/95'
                    : 'animate-countdown-pulse'
                } ${
                  patternId === 'REST' ? '' : patternId === 'BALANCE' ? '' : isFireBreath ? 'text-amber-300/95' : 'text-white/80'
                }`}
                style={{ fontSize: '16px' }}
                key={prepareTimeLeft}
              >
                STARTING IN {prepareTimeLeft}S
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`relative flex items-center justify-between px-6 z-20 transition-opacity shrink-0 ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem', transitionDuration: `${FADE_DURATION_MS}ms` }}
      >
        <button onClick={(e) => { e.stopPropagation(); resetInactivityTimer(); navigate(-1); }} className="p-3 rounded-full bg-white/10 backdrop-blur"><ArrowLeft size={22} /></button>
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-2 ">
            <h2 className="text-xl font-serif font-bold text-brand-gold mt-4">{basePattern.name}</h2>
            <button
              onClick={(e) => { e.stopPropagation(); resetInactivityTimer(); handleShowIntroInfo(); }}
              className="p-1.5 mt-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
              aria-label="Learn about this technique"
            >
              <Info size={16} className="text-brand-gold" />
            </button>
          </div>
          
          {patternId !== 'BHRAMARI' && (
            <div className="flex items-center gap-2 mt-2 relative">
              <button 
                  onClick={(e) => { e.stopPropagation(); resetInactivityTimer(); setShowLevelMenu(!showLevelMenu); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300 border backdrop-blur-md shadow-xl
                      ${freezeState.isFrozen ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}
              >
                  Level {effectiveLevel}
                  {freezeState.isFrozen ? <Snowflake size={10} className="animate-pulse" /> : <ChevronDown size={10} className={`transition-transform duration-300 ${showLevelMenu ? 'rotate-180' : ''}`} />}
              </button>

              {showLevelMenu && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-brand-darkSurface/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-30 animate-fade-in overflow-hidden" onClick={e => e.stopPropagation()}>
                      <button 
                          onClick={() => { resetInactivityTimer(); toggleFreeze(); setShowLevelMenu(false); }}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors text-xs font-medium text-white/90"
                      >
                          <span>{freezeState.isFrozen ? 'Unfreeze Level' : 'Freeze Level'}</span>
                          <Snowflake size={14} className={freezeState.isFrozen ? 'text-blue-400' : 'text-white/20'} />
                      </button>
                      <div className="h-px bg-white/5 my-1 mx-2" />
                      <button 
                          onClick={() => { resetInactivityTimer(); setShowResetModal(true); setShowLevelMenu(false); }}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-500/10 transition-colors text-xs font-medium text-red-400/80"
                      >
                          <span>Reset to Level 1</span>
                          <RotateCcw size={14} />
                      </button>
                  </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetInactivityTimer();
            setBreathSoundEnabled((v) => !v);
          }}
          className="p-3 rounded-full bg-white/10 backdrop-blur"
        >
          {breathSoundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} className="text-white/50" />}
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col relative z-10 px-6 items-center" style={{ minHeight: 360, paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Orb container: takes available vertical space and centers the orb */}
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
          <div
            onClick={handleStart}
            className="cursor-pointer transition-all duration-700 flex flex-col items-center"
          >
            {isBoxBreath ? (
              <BoxBreathingVisual phase={phase} pattern={sessionCadence} isRunning={isRunning} />
            ) : patternId === 'BALANCE' ? (
              <AlternateNostrilVisual 
                phase={phase}
                cycleCount={sessionCycles}
                pattern={{ ...basePattern, ...sessionCadence }}
                isRunning={isRunning}
              />
            ) : (
              <BreathingOrb 
                phase={phase} 
                pattern={{ ...basePattern, ...sessionCadence }} 
                cyclesCompleted={sessionCycles} 
                customText={isFireBreath ? fireOrbText : balanceOrbText}
                countdown={currentHoldValue}
                maintainScale={isFireBreath && firePhase === 'FULL_HOLD'}
                isRecovery={isFireBreath && firePhase === 'RECOVERY'}
              />
            )}
          </div>
        </div>
        {/* Breaths remaining: in flow below orb (like MorningRitual), never overlaps */}
        {isFireBreath && (
          <div className="flex flex-col items-center shrink-0" style={{ marginTop: '32px', minHeight: '88px' }}>
            {isRunning && firePhase === 'ACTIVE' ? (
              <div className="text-center animate-fade-in">
                <div className="text-6xl font-serif font-bold tabular-nums">{Math.max(0, fireConfig.cycles - sessionCycles)}</div>
                <div className="text-[10px] font-bold tracking-[0.4em] opacity-40 uppercase mt-1">Breaths Remaining</div>
              </div>
            ) : (
              <div className="invisible flex flex-col items-center pointer-events-none" aria-hidden="true" style={{ height: '88px', justifyContent: 'center' }}>
                <div className="font-serif font-bold text-6xl tabular-nums">0</div>
                <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase mt-1">remaining</div>
              </div>
            )}
          </div>
        )}
        <div className="mt-2 text-center w-full max-w-sm flex flex-col items-center">
          {/* ✅ 6‑cycle level‑up dots (subtle, above progress line) */}
          {levelCycleDots !== null && (
            <div className="mb-3 flex justify-center gap-1.5">
              {Array.from({ length: CYCLES_TO_LEVEL_UP }).map((_, idx) => {
                const isActive = idx < (levelCycleDots || 0);
                return (
                  <span
                    key={idx}
                    className={`w-[9px] h-[9px] rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-brand-gold shadow-[0_0_10px_rgba(212,163,115,0.7)] scale-100'
                        : 'bg-white/10 scale-75'
                    }`}
                  />
                );
              })}
            </div>
          )}

          {/* ✅ Restored PranaLiquidTimer for Calm, Rest, Balance */}
          {isRunning && showProgressBar && <PranaLiquidTimer duration={currentPhaseDuration} isRunning={isRunning} phase={phase} cyclesCompleted={sessionCycles} />}
          
          {/* ✅ Difficulty and Timing Text - fades out in zen mode */}
          <div 
            className={`transition-opacity ${uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
          >
          {!isFireBreath && ADAPTIVE_PATTERN_IDS.includes(patternId) && (
            <div className="mt-4 flex flex-col items-center gap-2 animate-fade-in">
              {patternId !== 'BALANCE' && (
                <div className="text-xs font-bold uppercase tracking-[0.35em] text-white/35">
                  Difficulty +{difficultyIncreasePct}%
                </div>
              )}
              {/* ✅ Adaptive Timing Display (Small Case & Lowercase 's') */}
              <div className="text-xs font-bold tracking-[0.15em] text-brand-gold flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                      <span>↑ <span className="opacity-60">inhale</span> {sessionCadence.inhale}s</span>
                      <span className="opacity-20">•</span>
                      <span> <span className="opacity-60">hold</span> {sessionCadence.hold}s</span>
                      <span className="opacity-20">•</span>
                      <span>↓ <span className="opacity-60">exhale</span> {sessionCadence.exhale}s</span>
                      {sessionCadence.holdEmpty > 0 && (
                        <>
                          <span className="opacity-20">•</span>
                          <span> <span className="opacity-60">hold</span> {sessionCadence.holdEmpty}s</span>
                        </>
                      )}
                  </span>
              </div>
            </div>
          )}
          <div className="mt-12">
            {isFireBreath && (
              <div className="inline-block bg-white/5 backdrop-blur border border-white/10 px-5 py-2.5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{fireConfig.cycles} cycles • {fireConfig.fullHold}s retention</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      
      {/* Technique Intro Card */}
      {showIntroCard && getTechniqueInfo(patternId) && (
        <TechniqueIntroCard
          technique={getTechniqueInfo(patternId)!}
          onStart={handleIntroStart}
          onClose={() => {
            setShowIntroCard(false);
            setShowIntroCardForced(false);
          }}
          forceShow={showIntroCardForced}
        />
      )}

      <ResetLevelModal
        open={showResetModal}
        patternName={basePattern.name}
        onCancel={() => setShowResetModal(false)}
        onConfirm={handleConfirmResetLevel}
      />
      {showSoundscapeMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSoundscapeMenu(false)} />
          <div className="relative bg-brand-darkSurface border border-white/10 rounded-[32px] p-6 w-full max-w-xs animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xs font-bold text-brand-gold uppercase tracking-[0.2em] mb-6 text-center">Ambience</h3>
            <div className="grid grid-cols-1 gap-3">
              {AVAILABLE_SOUNDSCAPES.map((s) => (
                <button key={s.id} onClick={() => { setActiveSoundscape(s.id); setShowSoundscapeMenu(false); }} className={`p-4 rounded-2xl flex items-center gap-4 transition-all ${activeSoundscape === s.id ? 'bg-white/20 border-white/20' : 'bg-white/5 border-transparent'} border`}>
                  <s.icon size={18} className={s.color} />
                  <span className="text-sm font-bold">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
