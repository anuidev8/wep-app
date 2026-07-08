import React from 'react';
import { RelaxationTriangleTutorial } from './RelaxationTriangleTutorial';

/**
 * Shared tutorial visuals for breath patterns used in MorningRitual TRANSITION view.
 * - FOCUS (Box Breathing)
 * - REST (Relaxation triangle from separate file)
 */

const BoxBreathingTutorial: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-brand-dark/40 relative group">
    <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-2xl">
      {/* Background Square */}
      <rect
        x="40"
        y="40"
        width="120"
        height="120"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="4"
        rx="12"
      />

      {/* Animated Path */}
      <rect
        x="40"
        y="40"
        width="120"
        height="120"
        fill="none"
        stroke="#D4A574"
        strokeWidth="4"
        rx="12"
        strokeDasharray="480"
        strokeDashoffset="480"
        className="animate-[dash_6s_linear_infinite]"
      />

      {/* Labels */}
      <g className="text-[10px] font-bold fill-white/80 uppercase tracking-widest font-sans">
        <text x="100" y="30" textAnchor="middle" className="animate-[pulse_1.5s_infinite_0s]">
          inhale 4
        </text>
        <text
          x="175"
          y="105"
          textAnchor="start"
          className="animate-[pulse_1.5s_infinite_1.5s]"
          transform="rotate(90 175 105)"
        >
          hold 4
        </text>
        <text x="100" y="185" textAnchor="middle" className="animate-[pulse_1.5s_infinite_3s]">
          exhale 4
        </text>
        <text
          x="25"
          y="105"
          textAnchor="middle"
          className="animate-[pulse_1.5s_infinite_4.5s]"
          transform="rotate(-90 25 105)"
        >
          hold 4
        </text>
      </g>

      {/* Traveling Point */}
      <circle
        r="6"
        fill="#D4A574"
        className="animate-[movePoint_6s_linear_infinite] shadow-lg shadow-brand-gold/50"
      />
    </svg>

    <style>{`
      @keyframes dash {
        0% { stroke-dashoffset: 480; }
        100% { stroke-dashoffset: 0; }
      }
      @keyframes movePoint {
        0% { transform: translate(40px, 40px); }
        25% { transform: translate(160px, 40px); }
        50% { transform: translate(160px, 160px); }
        75% { transform: translate(40px, 160px); }
        100% { transform: translate(40px, 40px); }
      }
    `}</style>
  </div>
);

interface PatternTutorialProps {
  patternId: string;
  videoUrl: string;
  muted?: boolean;
  onToggleMute?: () => void;
  onSkip?: () => void;
  onLoadedData?: () => void;
  onError?: () => void;
}

export const PatternTutorial: React.FC<PatternTutorialProps> = ({
  patternId,
  videoUrl,
  muted = false,
  onToggleMute,
  onSkip,
  onLoadedData,
  onError,
}) => {
  if (patternId === 'FOCUS') {
    return <BoxBreathingTutorial />;
  }
  if (patternId === 'REST') {
    return <RelaxationTriangleTutorial />;
  }

  // Only render video if videoUrl is valid (not empty or null)
  if (!videoUrl || videoUrl.trim() === '') {
    return null;
  }

  return (
    <div className="w-full h-full relative group">
      <video
        src={videoUrl}
        autoPlay
        loop
        muted={muted}
        playsInline
        preload="auto"
        onLoadedData={onLoadedData}
        onError={onError}
        className="w-full h-full object-cover"
      />

      {/* Overlay controls: mute + skip */}
      <div className="absolute inset-0 flex items-start justify-end p-3 pointer-events-none">
        <div className="flex gap-2">
          {onToggleMute && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute();
              }}
              className="pointer-events-auto px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-xs font-semibold tracking-wide text-white border border-white/20 backdrop-blur-sm"
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
          )}
          {onSkip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSkip();
              }}
              className="pointer-events-auto px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-xs font-semibold tracking-wide text-white border border-white/20 backdrop-blur-sm"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export { BoxBreathingTutorial, RelaxationTriangleTutorial };

