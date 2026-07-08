import React from 'react';
import { ArrowLeft, Music2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { triggerHaptic } from '../../utils/hapticFeedback';

interface Props {
  trackTitle?: string;
  /** Title shown in modal header (e.g. "Mantra Unavailable", "Guided Meditation Unavailable") */
  variant?: 'mantra' | 'guided' | 'chakra';
  /** Called when the user taps "Try Again". If omitted, the button is hidden. */
  onRetry?: () => void;
}

/**
 * Full-screen modal shown inside the mantra player when audio cannot be loaded.
 * Covers two cases:
 *   1. track.audioUrl is missing/empty — shown immediately.
 *   2. audioUrl present but failed to load / never started — shown after the
 *      6-second audioReady fallback fires with no playback detected.
 */
const VARIANT_TITLES: Record<NonNullable<Props['variant']>, string> = {
  mantra: 'Mantra Unavailable',
  guided: 'Guided Meditation Unavailable',
  chakra: 'Chakra Unavailable',
};

export const AudioUnavailableModal: React.FC<Props> = ({ trackTitle, variant = 'mantra', onRetry }) => {
  const title = VARIANT_TITLES[variant];
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-[28px] bg-[#0f172a] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header gradient strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-gold/60 via-brand-gold to-brand-gold/60" />

        <div className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
              <Music2 size={32} className="text-brand-gold/50" />
            </div>
            {/* Error badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-red-500 border-2 border-[#0f172a] flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold leading-none">!</span>
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-xl font-serif font-bold text-white">
              {title}
            </h2>
            {trackTitle && (
              <p className="text-sm font-semibold text-brand-gold/70 truncate px-4">
                {trackTitle}
              </p>
            )}
            <p className="text-sm text-white/50 leading-relaxed">
              This track couldn't be loaded right now. It may still be processing or
              temporarily unavailable. Please try again later.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {onRetry && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onRetry();
                }}
                className="w-full py-3.5 rounded-2xl bg-brand-gold text-brand-dark font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-brand-gold/20"
              >
                <RefreshCw size={15} />
                Try Again
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                navigate(-1);
              }}
              className="w-full py-3.5 rounded-2xl bg-white/8 border border-white/10 text-white/80 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <ArrowLeft size={15} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
