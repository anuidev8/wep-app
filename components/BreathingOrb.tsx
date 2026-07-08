import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BreathPhase, BreathingPattern } from '../types';

interface BreathingOrbProps {
  phase: BreathPhase;
  pattern: BreathingPattern;
  cyclesCompleted: number;
  customText?: string;
  /** Optional extra classes for the center text (color/weight/etc). */
  textClassName?: string;
  isImmersive?: boolean;
  hideText?: boolean;
  countdown?: number;
  isRecovery?: boolean; // smooth contraction during "slow exhale & recover"
  /** When true (e.g. last cycle), keep orb blue/neutral; avoid red/orange. */
  isLastBreath?: boolean;
  /** When true, maintain current scale (prevents vertical movement during recovery) */
  maintainScale?: boolean;
}

const RECOVERY_CONTRACTION_MS = 5000;

const BreathingOrbComponent: React.FC<BreathingOrbProps> = ({ 
  phase, 
  pattern, 
  cyclesCompleted, 
  customText, 
  textClassName,
  isImmersive = false, 
  hideText = false,
  countdown,
  isRecovery = false,
  isLastBreath = false,
  maintainScale = false,
}) => {
  const [scale, setScale] = useState(1);
  const [displayText, setDisplayText] = useState('ready');
  const [isGolden, setIsGolden] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(1000);
  const [stableText, setStableText] = useState('ready'); // Stable text to prevent flickering during holds
  const prevPhaseRef = useRef<BreathPhase>(BreathPhase.IDLE);

  const isFastPattern = pattern.id === 'ENERGY' || pattern.id === 'BHASTRIKA';
  const isDiaphragmatic = pattern.id === 'CALM';

  useEffect(() => {
    if (cyclesCompleted > 0 && cyclesCompleted % 6 === 0) {
        setIsGolden(true);
        const t = setTimeout(() => setIsGolden(false), (pattern.inhale + (pattern.hold || 0) + pattern.exhale) * 1000);
        return () => clearTimeout(t);
    }
  }, [cyclesCompleted, pattern]);

  useEffect(() => {
    let duration = 1000;
    if (isRecovery && phase === BreathPhase.EXHALE) {
      duration = RECOVERY_CONTRACTION_MS;
    } else if (phase === BreathPhase.INHALE) duration = pattern.inhale * 1000;
    else if (phase === BreathPhase.EXHALE) duration = pattern.exhale * 1000;
    else if (phase === BreathPhase.HOLD) duration = (pattern.hold || 1) * 1000;
    else if (phase === BreathPhase.HOLD_EMPTY) duration = (pattern.holdEmpty || 1) * 1000;
    
    setTransitionDuration(duration);

    if (customText !== undefined) {
        // Only update text when phase actually changes, not on every render
        // This prevents flickering during hold countdowns
        const phaseChanged = prevPhaseRef.current !== phase;
        const isHoldPhase = phase === BreathPhase.HOLD || phase === BreathPhase.HOLD_EMPTY;
        
        if (phaseChanged || (!isHoldPhase && stableText !== customText)) {
          setStableText(customText);
        setDisplayText(customText);
        }
        prevPhaseRef.current = phase;
        
        // If maintainScale is true, keep the scale at HOLD level (1.2) to prevent vertical movement
        // This is used during FULL_HOLD and RECOVERY phases to maintain consistent position
        if (maintainScale) {
          setScale(1.2); // Maintain the same scale as HOLD phase
          return;
        }
        
        if (isRecovery && phase === BreathPhase.EXHALE) {
          setScale(0.85);
          return;
        }
        switch (phase) {
          case BreathPhase.INHALE: setScale(isFastPattern ? 1.3 : 1.2); break; 
          case BreathPhase.HOLD: setScale(1.2); break;
          case BreathPhase.EXHALE: setScale(isFastPattern ? 0.9 : 1); break;
          case BreathPhase.HOLD_EMPTY: setScale(0.85); break; 
          default: setScale(1); break;
        }
        return;
    }

    const phaseChanged = prevPhaseRef.current !== phase;
    prevPhaseRef.current = phase;

    switch (phase) {
      case BreathPhase.IDLE:
        setScale(1);
        if (phaseChanged) {
          setStableText('tap to start');
        setDisplayText('tap to start');
        }
        break;
      case BreathPhase.INHALE:
        setScale(isFastPattern ? 1.3 : 1.2);
        if (phaseChanged) {
          const inhaleText = pattern.labels?.INHALE || 'inhale';
          setStableText(inhaleText);
          setDisplayText(inhaleText);
        }
        break;
      case BreathPhase.HOLD:
        setScale(1.2);
        // Only update text when phase changes, not on every render
        if (phaseChanged) {
          const holdText = pattern.labels?.HOLD || 'hold';
          setStableText(holdText);
          setDisplayText(holdText);
        }
        break;
      case BreathPhase.EXHALE:
        setScale(isFastPattern ? 0.9 : 1);
        if (phaseChanged) {
          const exhaleText = pattern.labels?.EXHALE || 'exhale';
          setStableText(exhaleText);
          setDisplayText(exhaleText);
        }
        break;
      case BreathPhase.HOLD_EMPTY:
        setScale(0.85);
        // Only update text when phase changes, not on every render
        if (phaseChanged) {
          const holdEmptyText = pattern.labels?.HOLD_EMPTY || 'hold';
          setStableText(holdEmptyText);
          setDisplayText(holdEmptyText);
        }
        break;
      default:
        setScale(1);
        if (phaseChanged) {
          setStableText('');
        setDisplayText('');
        }
        break;
    }
  }, [phase, pattern, customText, isRecovery, isFastPattern]);

  const orbAppearance = useMemo(() => {
    if (isGolden && !isLastBreath) return 'bg-gradient-to-tr from-amber-200 via-yellow-400 to-orange-500';
    if (isFastPattern && !isLastBreath) {
        // Smooth color transitions for Fire Breath / Bhastrika
        // During hold phases, use warmer, more stable colors (yellow-orange) without harsh red
        if (phase === BreathPhase.HOLD || phase === BreathPhase.HOLD_EMPTY) {
          // Smooth yellow-to-orange gradient for holds (no red)
          return 'bg-gradient-to-tr from-yellow-300 via-amber-400 to-orange-500';
        }
        // Active phases use the standard fire gradient
        return 'bg-gradient-to-tr from-orange-300 via-orange-500 to-orange-600';
    }
    // Diaphragmatic (CALM): organic green/teal/cyan theme — handled via diaphragmaticOrbStyle
    if (isDiaphragmatic) return null;
    switch (phase) {
        case BreathPhase.INHALE: return 'bg-gradient-to-tr from-cyan-200 via-sky-300 to-blue-400';
        case BreathPhase.HOLD: return 'bg-gradient-to-t from-blue-400 to-indigo-300'; 
        case BreathPhase.EXHALE: return 'bg-gradient-to-bl from-teal-600 to-emerald-800'; 
        case BreathPhase.HOLD_EMPTY: return 'bg-gradient-to-b from-slate-700 to-slate-900'; 
        default: return 'bg-gradient-to-br from-slate-400 to-slate-500'; 
    }
  }, [isGolden, isLastBreath, isFastPattern, isDiaphragmatic, phase]);

  // Diaphragmatic orb: forest green → teal → sky cyan, with smooth transitions and hold shimmer
  const diaphragmaticOrbStyle = useMemo((): React.CSSProperties | null => {
    if (!isDiaphragmatic) return null;
    const radial = (stops: string) =>
      `radial-gradient(ellipse 100% 100% at 30% 30%, ${stops})`;
    switch (phase) {
      case BreathPhase.EXHALE:
        return {
          background: radial('#059669 0%, #047857 50%, #065f46 100%'),
        };
      case BreathPhase.INHALE:
        return {
          background: radial('#67E8F9 0%, #2DD4BF 40%, #0D9488 80%, #059669 100%'),
        };
      case BreathPhase.HOLD:
        return {
          background: radial('#67E8F9 0%, #2DD4BF 40%, #0D9488 80%, #059669 100%'),
        };
      case BreathPhase.HOLD_EMPTY:
        return {
          background: radial('#059669 0%, #047857 50%, #065f46 100%'),
        };
      default:
        return {
          background: radial('#059669 0%, #047857 50%, #065f46 100%'),
        };
    }
  }, [isDiaphragmatic, phase]);

  // Enhanced glow effects based on phase
  const glowEffect = useMemo(() => {
    if (isGolden && !isLastBreath) {
      return {
        boxShadow: '0 0 60px rgba(251,191,36,0.8), 0 0 100px rgba(251,191,36,0.5), 0 0 140px rgba(251,191,36,0.3), inset 0 0 40px rgba(251,191,36,0.2)',
        filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.6))'
      };
    }
    if (isDiaphragmatic) {
      const isInhaleOrHold = phase === BreathPhase.INHALE || phase === BreathPhase.HOLD;
      return isInhaleOrHold
        ? {
            boxShadow: '0 0 50px rgba(103,232,249,0.5), 0 0 80px rgba(45,212,191,0.3), 0 0 120px rgba(13,148,136,0.15), inset 0 0 30px rgba(103,232,249,0.12)',
            filter: 'drop-shadow(0 0 15px rgba(103,232,249,0.4))'
          }
        : {
            boxShadow: '0 0 40px rgba(5,150,105,0.5), 0 0 70px rgba(5,150,105,0.3), 0 0 100px rgba(4,120,87,0.15), inset 0 0 25px rgba(5,150,105,0.1)',
            filter: 'drop-shadow(0 0 12px rgba(5,150,105,0.35))'
          };
    }
    if (isFastPattern && !isLastBreath) {
      // Softer glow for hold phases, standard for active phases
      if (phase === BreathPhase.HOLD || phase === BreathPhase.HOLD_EMPTY) {
        return {
          boxShadow: '0 0 50px rgba(251,191,36,0.6), 0 0 90px rgba(251,191,36,0.35), 0 0 130px rgba(251,191,36,0.2), inset 0 0 30px rgba(251,191,36,0.12)',
          filter: 'drop-shadow(0 0 15px rgba(251,191,36,0.4))'
        };
      }
      return {
        boxShadow: '0 0 50px rgba(249,115,22,0.7), 0 0 90px rgba(249,115,22,0.4), 0 0 130px rgba(249,115,22,0.2), inset 0 0 30px rgba(249,115,22,0.15)',
        filter: 'drop-shadow(0 0 15px rgba(249,115,22,0.5))'
      };
    }
    switch (phase) {
      case BreathPhase.INHALE:
        return {
          boxShadow: '0 0 50px rgba(14,165,233,0.6), 0 0 80px rgba(14,165,233,0.4), 0 0 120px rgba(14,165,233,0.2), inset 0 0 30px rgba(14,165,233,0.15)',
          filter: 'drop-shadow(0 0 15px rgba(14,165,233,0.5))'
        };
      case BreathPhase.HOLD:
        return {
          boxShadow: '0 0 60px rgba(96,165,250,0.5), 0 0 100px rgba(96,165,250,0.3), 0 0 140px rgba(96,165,250,0.15), inset 0 0 35px rgba(96,165,250,0.1)',
          filter: 'drop-shadow(0 0 18px rgba(96,165,250,0.4))'
        };
      case BreathPhase.EXHALE:
        return {
          boxShadow: '0 0 40px rgba(20,184,166,0.4), 0 0 70px rgba(20,184,166,0.25), 0 0 100px rgba(20,184,166,0.15), inset 0 0 25px rgba(20,184,166,0.1)',
          filter: 'drop-shadow(0 0 12px rgba(20,184,166,0.3))'
        };
      case BreathPhase.HOLD_EMPTY:
        return {
          boxShadow: '0 0 25px rgba(148,163,184,0.2), 0 0 50px rgba(148,163,184,0.1), inset 0 0 20px rgba(148,163,184,0.05)',
          filter: 'drop-shadow(0 0 8px rgba(148,163,184,0.15))'
        };
      default:
        return {
          boxShadow: '0 0 30px rgba(255,255,255,0.2), 0 0 60px rgba(255,255,255,0.1), inset 0 0 20px rgba(255,255,255,0.05)',
          filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.15))'
        };
    }
  }, [isGolden, isLastBreath, isFastPattern, isDiaphragmatic, phase]);

  const shownText = stableText || displayText;
  const isOmSymbol = shownText.trim() === 'ॐ';
  const isExhaleText = displayText.toLowerCase().includes('exhale') || displayText.toLowerCase().includes('out') || displayText.toLowerCase().includes('hmmm');
  const useSmoothRecovery = isRecovery && phase === BreathPhase.EXHALE;
  
  // Enhanced fluid and energetic timing curves for smoother, more natural breathing animations
  const timing = useSmoothRecovery 
    ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' // Smooth recovery
    : isFastPattern 
        ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // Energetic but smooth for fast patterns
        : phase === BreathPhase.INHALE 
            ? 'cubic-bezier(0.33, 1, 0.68, 1)' // Smooth expansion with slight ease-out
            : phase === BreathPhase.EXHALE
                ? 'cubic-bezier(0.4, 0, 0.2, 1)' // Gentle contraction
                : 'cubic-bezier(0.4, 0.0, 0.2, 1)'; // Smooth holds

  // Detect BHRAMARI (Humming Bee) vibration phase
  const isHumming = pattern.id === 'BHRAMARI' && phase === BreathPhase.EXHALE;

  return (
    <div className="relative flex items-center justify-center h-80 w-80 shrink-0 pointer-events-none" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
      <style>{`
        @keyframes humming-ripple {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes humming-vibrate {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(1px, -1px) scale(1.005); }
          50% { transform: translate(-1px, 1px) scale(0.995); }
          75% { transform: translate(1px, 1px) scale(1.005); }
        }
        @keyframes fire-glow {
          0%, 100% { opacity: 0.2; transform: scale(1.1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
        @keyframes orb-hold-shimmer {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Vibration Ripples for Humming Bee */}
      {isHumming && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-44 h-44 rounded-full border-2 border-indigo-400/60"
              style={{
                animation: 'humming-ripple 0.8s ease-out infinite',
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Extra Fire Glow Layer */}
      {isFastPattern && phase === BreathPhase.INHALE && (
        <div 
            className="absolute rounded-full bg-orange-500/20 blur-3xl pointer-events-none"
            style={{ 
              width: '160%', 
              height: '160%', 
              animation: 'fire-glow 0.5s ease-in-out infinite'
            }}
        />
      )}

      {/* Enhanced Outer Glow Layer with animated pulse - GPU accelerated */}
      <div 
          className="absolute rounded-full bg-white/15 blur-3xl pointer-events-none transition-all"
          style={{ 
            width: '140%', 
            height: '140%', 
            transform: `scale(${scale * 1.15}) translateZ(0)`, 
            willChange: 'transform, opacity',
            opacity: isImmersive ? 0 : (phase === BreathPhase.INHALE ? 0.3 : phase === BreathPhase.HOLD ? 0.25 : 0.15),
            transitionDuration: `${transitionDuration}ms`,
            transitionTimingFunction: timing
          }}
      />
      
      {/* Secondary Glow Layer for depth - GPU accelerated */}
      <div 
          className="absolute rounded-full bg-white/5 blur-xl pointer-events-none transition-all"
          style={{ 
            width: '120%', 
            height: '120%', 
            transform: `scale(${scale * 1.05}) translateZ(0)`, 
            willChange: 'transform, opacity',
            opacity: isImmersive ? 0 : 0.4,
            transitionDuration: `${transitionDuration}ms`,
            transitionTimingFunction: timing
          }}
      />
      
      {/* Main Orb Container - GPU accelerated for smooth animations */}
      <div
        className={`rounded-full flex items-center justify-center z-10 relative overflow-hidden border-2 border-white/30 pointer-events-auto transition-all`}
        style={{ 
          width: '180px', 
          height: '180px', 
          transform: `scale(${scale}) translateZ(0)`,
          willChange: 'transform',
          transitionDuration: `${transitionDuration}ms`,
          transitionTimingFunction: timing,
          ...glowEffect
        }}
      >
        {/* Vibrating Background Layer (for Humming effect) - GPU accelerated */}
        <div 
          className={`absolute inset-0 w-full h-full ${orbAppearance || ''} transition-all`}
          style={{
            ...(isHumming ? { animation: 'humming-vibrate 0.08s linear infinite' } : {}),
            ...(diaphragmaticOrbStyle || {}),
            transform: 'translateZ(0)',
            willChange: isHumming ? 'transform' : 'background-color, opacity',
            // Diaphragmatic: 1.5s organic gradient transition; hold phases get shimmer pulse
            ...(isDiaphragmatic ? {
              transitionDuration: '1500ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
              ...(phase === BreathPhase.HOLD || phase === BreathPhase.HOLD_EMPTY
                ? { animation: 'orb-hold-shimmer 2s ease-in-out infinite' }
                : {}),
            } : {
              transitionDuration: phase === BreathPhase.HOLD || phase === BreathPhase.HOLD_EMPTY 
                ? `${Math.max(transitionDuration, 800)}ms` 
                : `${transitionDuration}ms`,
              transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
            }),
          }}
        />

        {/* Stationary Content Layer */}
        <div className="w-full h-full flex flex-col items-center justify-center relative z-20">
          <div className="absolute top-0 w-full h-2/3 bg-gradient-to-b from-white/30 to-transparent pointer-none" />
          {!hideText && (
              <div className={`flex flex-col items-center justify-center transition-opacity duration-1000 ${isImmersive ? 'opacity-0' : 'opacity-100'} pointer-events-none`}>
                  <div
                    className={`font-serif drop-shadow-md text-center px-4 leading-tight transition-opacity duration-300 ${
                      isOmSymbol
                        ? 'text-6xl tracking-normal font-semibold text-brand-gold'
                        : `${isExhaleText ? 'text-lg opacity-80' : 'text-2xl'} tracking-widest font-bold ${textClassName || 'text-white'}`
                    }`}
                  >
                      {/* Use stableText to prevent flickering during countdown updates */}
                      <span className="inline-block">{shownText}</span>
                      {countdown !== undefined && countdown > 0 && (
                          <span className="tabular-nums ml-1">
                              ({countdown}s)
                          </span>
                      )}
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const BreathingOrb = React.memo(BreathingOrbComponent);