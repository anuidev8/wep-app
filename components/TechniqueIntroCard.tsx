import React, { useState, useEffect } from 'react';
import { X, Info, AlertTriangle, Check } from 'lucide-react';
import { triggerHaptic } from '../utils/hapticFeedback';
import { TechniqueInfo } from '../data/techniques';

interface TechniqueIntroCardProps {
  technique: TechniqueInfo;
  onStart: () => void;
  onClose: () => void;
  forceShow?: boolean; // If true, shows even if user selected "don't show again"
}

export const TechniqueIntroCard: React.FC<TechniqueIntroCardProps> = ({
  technique,
  onStart,
  onClose,
  forceShow = false
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Handle keyboard navigation (Escape key)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleStart = () => {
    triggerHaptic('medium');
    onStart();
  };

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  const intensityColors = {
    HIGH: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    MEDIUM: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    LOW: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
  };

  // Handle keyboard navigation (Escape key)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto"
        onClick={handleClose}
        onKeyDown={(e) => e.key === 'Enter' && handleClose()}
        aria-hidden="true"
        tabIndex={-1}
      />
      
      {/* Card */}
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-brand-darkSurface rounded-t-[32px] shadow-2xl pointer-events-auto animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="dialog"
        aria-labelledby="technique-title"
        aria-describedby="technique-description"
        aria-modal="true"
      >
        {/* Handle bar */}
        <div className="sticky top-0 bg-white dark:bg-brand-darkSurface pt-4 pb-2 z-10">
          <div className="w-12 h-1 bg-brand-medium/30 dark:bg-brand-darkTextMuted/30 rounded-full mx-auto mb-4"></div>
          
          {/* Header */}
          <div className="flex items-start justify-between px-6 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{technique.icon}</span>
                <div>
                  <h2 id="technique-title" className="text-2xl font-serif font-bold text-brand-dark dark:text-white">
                    {technique.name}
                  </h2>
                  {technique.sanskritName && (
                    <p className="text-xs text-brand-medium/60 dark:text-brand-darkTextMuted italic">
                      {technique.sanskritName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${intensityColors[technique.intensity]}`}>
                  {technique.intensity} INTENSITY
                </span>
                <span className="text-xs text-brand-medium/60 dark:text-brand-darkTextMuted">
                  {technique.duration}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              onTouchStart={() => triggerHaptic('light')}
              className="relative w-12 h-12 flex items-center justify-center rounded-full bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold active:scale-95 backdrop-blur-md border border-white/10 dark:border-white/10 shadow-[0_0_20px_rgba(212,165,116,0.2)]"
              aria-label="Close"
              tabIndex={0}
            >
              {/* Glow circle effect */}
              <div className="absolute inset-0 rounded-full bg-brand-gold/10 dark:bg-brand-gold/5 blur-xl animate-pulse-slow"></div>
              <X size={24} className="text-brand-medium dark:text-brand-darkTextMuted relative z-10" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          {/* Description */}
          <p id="technique-description" className="text-base text-brand-dark/80 dark:text-brand-darkText/80 leading-relaxed">
            {technique.description}
          </p>

          {/* Benefits */}
          <div>
            <h3 className="text-sm font-bold text-brand-dark dark:text-white mb-3 uppercase tracking-wider">
              Benefits
            </h3>
            <ul className="space-y-2">
              {technique.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check size={18} className="text-brand-gold shrink-0 mt-0.5" />
                  <span className="text-sm text-brand-dark/70 dark:text-brand-darkText/70">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cautions */}
          {technique.cautions && technique.cautions.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">
                    Please Note
                  </h4>
                  <ul className="space-y-1.5">
                    {technique.cautions.map((caution, idx) => (
                      <li key={idx} className="text-xs text-amber-800 dark:text-amber-300">
                        • {caution}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Instructions (Expandable) */}
          {technique.detailedInstructions && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between p-4 bg-brand-light/50 dark:bg-white/5 rounded-2xl hover:bg-brand-light dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold"
                aria-expanded={showDetails}
                aria-controls="detailed-instructions"
                tabIndex={0}
              >
                <span className="text-sm font-bold text-brand-dark dark:text-white flex items-center gap-2">
                  <Info size={16} />
                  {showDetails ? 'Hide' : 'Learn More'} Instructions
                </span>
                <span className={`text-brand-medium dark:text-brand-darkTextMuted transition-transform ${showDetails ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {showDetails && (
                <div id="detailed-instructions" className="mt-4 p-4 bg-brand-light/30 dark:bg-white/5 rounded-2xl animate-fade-in" role="region" aria-label="Detailed instructions">
                  <p className="text-sm text-brand-dark/80 dark:text-brand-darkText/80 leading-relaxed whitespace-pre-line">
                    {technique.detailedInstructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-4 px-6 bg-brand-light dark:bg-white/10 text-brand-dark dark:text-white rounded-2xl font-bold text-sm hover:bg-brand-light/80 dark:hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold"
              tabIndex={0}
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="flex-1 py-4 px-6 bg-brand-dark dark:bg-brand-gold text-white dark:text-brand-dark rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-gold"
              tabIndex={0}
              autoFocus
            >
              Start Now
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

