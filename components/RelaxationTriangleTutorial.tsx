import React, { useMemo } from 'react';
import { BreathPhase, BreathingPattern } from '../types';

/**
 * Relaxation triangle visual for BREATHE view - responds to real-time phases like BoxBreathingVisual.
 * Triangle sides: INHALE (left), HOLD (right), EXHALE (bottom).
 * Ball and path fill follow the current phase with smooth transitions.
 */
interface RelaxationTriangleVisualProps {
  phase: BreathPhase;
  pattern: BreathingPattern;
  /** Whether to show the edge labels (inhale / hold / exhale). Defaults to true. */
  showLabels?: boolean;
}

export const RelaxationTriangleVisual: React.FC<RelaxationTriangleVisualProps> = ({
  phase,
  pattern,
  showLabels = true,
}) => {
  // Triangle vertices: Bottom-left: 35,170 | Top: 100,20 | Bottom-right: 165,170
  // Path lengths: left ≈ 163.5, right ≈ 163.5, bottom = 130, total ≈ 457
  const LEFT_LEN = 163.5;
  const RIGHT_LEN = 163.5;
  const BOTTOM_LEN = 130;

  const activeSide = useMemo(() => {
    switch (phase) {
      case BreathPhase.INHALE:
        return 0; // Left side
      case BreathPhase.HOLD:
        return 1; // Right side
      case BreathPhase.EXHALE:
        return 2; // Bottom side
      default:
        return -1;
    }
  }, [phase]);

  const duration = useMemo(() => {
    switch (phase) {
      case BreathPhase.INHALE:
        return pattern.inhale;
      case BreathPhase.HOLD:
        return pattern.hold || 0;
      case BreathPhase.EXHALE:
        return pattern.exhale;
      default:
        return 0.5;
    }
  }, [phase, pattern]);

  const isInhalePhase = phase === BreathPhase.INHALE;
  const isHoldPhase = phase === BreathPhase.HOLD;
  const isExhalePhase = phase === BreathPhase.EXHALE;

  // Which sides should remain filled (like BoxBreathingVisual: previous sides stay lit)
  const fillLeft = isInhalePhase || isHoldPhase || isExhalePhase;
  const fillRight = isHoldPhase || isExhalePhase;
  const fillBottom = isExhalePhase; // Bottom fills during EXHALE phase (8s for REST pattern)

  // Transition durations: only animate the active side, previous sides stay filled instantly
  const leftTransitionDuration = isInhalePhase ? duration : 0;
  const rightTransitionDuration = isHoldPhase ? duration : 0;
  const bottomTransitionDuration = isExhalePhase ? duration : 0; // 8s for REST pattern - completes fully

  // Ball position based on phase
  const ballPosition = useMemo(() => {
    switch (activeSide) {
      case 0: // INHALE - at top (end of left side)
        return { x: 100, y: 20 };
      case 1: // HOLD - at bottom-right (end of right side)
        return { x: 165, y: 170 };
      case 2: // EXHALE - at bottom-left (end of bottom side)
        return { x: 35, y: 170 };
      default:
        return { x: 35, y: 170 }; // Start position
    }
  }, [activeSide]);

  return (
    <div className="relative flex items-center justify-center h-80 w-80">
      <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-[100px] animate-pulse-slow pointer-events-none"></div>

      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl overflow-visible">
        {/* Background Triangle */}
        <polygon
          points="100,20 35,170 165,170"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />

        {/* Active path segments - line fill animates in sync with the ball, previous sides stay filled */}
        <g>
          {/* Left side - INHALE */}
          <path
            d="M 35,170 L 100,20"
            fill="none"
            stroke="#D4A574"
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              strokeDasharray: LEFT_LEN,
              strokeDashoffset: fillLeft ? 0 : LEFT_LEN,
              transition: `stroke-dashoffset ${leftTransitionDuration}s linear`,
            }}
          />
          {/* Right side - HOLD */}
          <path
            d="M 100,20 L 165,170"
            fill="none"
            stroke="#D4A574"
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              strokeDasharray: RIGHT_LEN,
              strokeDashoffset: fillRight ? 0 : RIGHT_LEN,
              transition: `stroke-dashoffset ${rightTransitionDuration}s linear`,
            }}
          />
          {/* Bottom side - EXHALE */}
          <path
            d="M 165,170 L 35,170"
            fill="none"
            stroke="#D4A574"
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              strokeDasharray: BOTTOM_LEN,
              strokeDashoffset: fillBottom ? 0 : BOTTOM_LEN,
              transition: `stroke-dashoffset ${bottomTransitionDuration}s linear`,
            }}
          />
        </g>

        {/* Traveling Pearl */}
        <circle
          r="9"
          fill="#D4A574"
          filter="drop-shadow(0 0 8px rgba(245,176,37,0.7))"
          className="shadow-lg shadow-brand-gold/50 transition-all"
          style={{
            transitionDuration: `${duration}s`,
            transitionTimingFunction: 'linear',
            transform: `translate(${ballPosition.x}px, ${ballPosition.y}px)`,
          }}
        />

        {/* Labels on each edge (gentle fade, no pop) */}
        {showLabels && (
          <g className="text-[11px] font-bold tracking-[0.08em] font-sans">
            {/* Left edge - INHALE */}
            <text
              x="52"
              y="95"
              textAnchor="middle"
              transform="rotate(-66.5 52 95)"
              className="transition-opacity duration-700"
              style={{
                opacity: activeSide === 0 ? 1 : 0.45,
                fill: activeSide === 0 ? '#C9A85D' : 'rgba(255,255,255,0.55)',
              }}
            >
              inhale {pattern.inhale}
            </text>
            {/* Right edge - HOLD */}
            <text
              x="148"
              y="95"
              textAnchor="middle"
              transform="rotate(66.5 148 95)"
              className="transition-opacity duration-700"
              style={{
                opacity: activeSide === 1 ? 1 : 0.45,
                fill: activeSide === 1 ? '#C9A85D' : 'rgba(255,255,255,0.55)',
              }}
            >
              hold {pattern.hold}
            </text>
            {/* Bottom edge - EXHALE */}
            <text
              x="100"
              y="193"
              textAnchor="middle"
              className="transition-opacity duration-700"
              style={{
                opacity: activeSide === 2 ? 1 : 0.45,
                fill: activeSide === 2 ? '#C9A85D' : 'rgba(255,255,255,0.55)',
              }}
            >
              exhale {pattern.exhale}
            </text>
          </g>
        )}

        {/* Subtle center glow */}
        <circle cx="100" cy="120" r="30" fill="#D4A574" fillOpacity="0.03" className="animate-pulse" />
      </svg>

      {/* Phase label overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h3
          className="text-2xl font-serif font-bold text-white tracking-[0.1em] drop-shadow-2xl animate-fade-in mt-[100px] transition-all duration-1000"
          key={phase}
        >
          {phase === BreathPhase.INHALE
            ? 'inhale'
            : phase === BreathPhase.HOLD
              ? 'hold'
              : phase === BreathPhase.EXHALE
                ? 'exhale'
                : 'ready'}
        </h3>
      </div>
    </div>
  );
};

/**
 * Relaxation triangle tutorial used in TRANSITION view for the REST pattern.
 * This version uses looping animations for preview purposes.
 */
interface RelaxationTriangleTutorialProps {
  /** Speed multiplier for animations. Higher = faster. Default 1.0 for normal speed, 2.0 for instructions view. */
  speedMultiplier?: number;
}

export const RelaxationTriangleTutorial: React.FC<RelaxationTriangleTutorialProps> = ({ 
  speedMultiplier = 2.7 // Default to 2x speed for instructions view video cues
}) => {
  // Triangle vertices
  // Bottom-left: 35,170 | Top: 100,20 | Bottom-right: 165,170
  // Center: 100, 120

  // Calculate animation duration based on speed multiplier
  // Base duration is 19s (inhale 4s + hold 7s + exhale 8s)
  const baseDuration = 19;
  const animationDuration = baseDuration / speedMultiplier;

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#063244] relative">
      <svg viewBox="0 0 200 200" className="w-52 h-52 drop-shadow-2xl">
        {/* Background Triangle */}
        <polygon
          points="100,20 35,170 165,170"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="4"
        />

        {/* Animated Triangle Path - starts from bottom-left */}
        <path
          d="M 35,170 L 100,20 L 165,170 L 35,170"
          fill="none"
          stroke="#D4A574"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="457"
          strokeDashoffset="457"
          style={{
            animation: `triangleDash ${animationDuration}s ease-in-out infinite`
          }}
        />

        {/* Traveling Pearl - starts at bottom-left */}
        <circle
          r="9"
          fill="#D4A574"
          filter="drop-shadow(0 0 8px rgba(245,176,37,0.7))"
          style={{
            animation: `trianglePoint ${animationDuration}s ease-in-out infinite`
          }}
        />

        {/* Labels on each edge - positioned outside triangle with more spacing */}
        {/* Left edge - INHALE 4 (rotated along edge, outside) */}
        <text
          x="52"
          y="95"
          textAnchor="middle"
          transform="rotate(-66.5 52 95)"
          className="text-[11px] font-bold fill-white/70 uppercase tracking-[0.12em] font-sans"
          style={{
            animation: `phaseInhale ${animationDuration}s ease-in-out infinite`
          }}
        >
          INHALE 4
        </text>

        {/* Right edge - HOLD 7 (rotated along edge, outside) */}
        <text
          x="148"
          y="95"
          textAnchor="middle"
          transform="rotate(66.5 148 95)"
          className="text-[11px] font-bold fill-white/70 uppercase tracking-[0.12em] font-sans"
          style={{
            animation: `phaseHold ${animationDuration}s ease-in-out infinite`
          }}
        >
          HOLD 7
        </text>

        {/* Bottom edge - EXHALE 8 */}
        <text
          x="100"
          y="193"
          textAnchor="middle"
          className="text-[11px] font-bold fill-white/70 uppercase tracking-[0.12em] font-sans"
          style={{
            animation: `phaseExhale ${animationDuration}s ease-in-out infinite`
          }}
        >
          EXHALE 8
        </text>
      </svg>

      <style>{`
        /* Total cycle is 19s: inhale 4s (21%), hold 7s (37%), exhale 8s (42%) */
        /* Stroke fills to match ball position along the path */
        @keyframes triangleDash {
          0%      { stroke-dashoffset: 457; }
          21.05%  { stroke-dashoffset: 293.5; }
          57.9%   { stroke-dashoffset: 130; }
          100%    { stroke-dashoffset: 0; }
        }

        /* Move the pearl along the triangle path starting from bottom-left */
        @keyframes trianglePoint {
          0%      { transform: translate(35px, 170px); }
          21.05%  { transform: translate(100px, 20px); }
          57.9%   { transform: translate(165px, 170px); }
          100%    { transform: translate(35px, 170px); }
        }

        /* Phase text highlight synced to animation rhythm */
        @keyframes phaseInhale {
          0%       { opacity: 1; fill: #D4A574; }
          20%      { opacity: 1; fill: #D4A574; }
          21%      { opacity: 0.4; fill: rgba(255,255,255,0.7); }
          99%      { opacity: 0.4; fill: rgba(255,255,255,0.7); }
          100%     { opacity: 1; fill: #D4A574; }
        }
        @keyframes phaseHold {
          0%, 20%  { opacity: 0.4; fill: rgba(255,255,255,0.7); }
          21%      { opacity: 1; fill: #D4A574; }
          57%      { opacity: 1; fill: #D4A574; }
          58%, 100% { opacity: 0.4; fill: rgba(255,255,255,0.7); }
        }
        @keyframes phaseExhale {
          0%, 57%  { opacity: 0.4; fill: rgba(255,255,255,0.7); }
          58%      { opacity: 1; fill: #D4A574; }
          100%     { opacity: 1; fill: #D4A574; }
        }
      `}</style>
    </div>
  );
};

