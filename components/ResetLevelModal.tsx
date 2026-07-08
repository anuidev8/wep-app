import React from 'react';

interface ResetLevelModalProps {
  open: boolean;
  patternName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetLevelModal: React.FC<ResetLevelModalProps> = ({
  open,
  patternName,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm bg-white/5 border border-white/15 rounded-[32px] shadow-2xl backdrop-blur-2xl p-6 animate-fade-in">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/30 shadow-[0_0_25px_rgba(212,163,115,0.5)]">
            <span className="text-brand-gold text-2xl font-serif">↺</span>
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-white mb-1">
              Reset {patternName} to Level 1?
            </h2>
            <p className="text-xs text-white/60 leading-relaxed">
              This will set the difficulty back to the starting level and clear
              any freeze for this pattern. Your overall stats and streak stay
              safe.
            </p>
          </div>
          <div className="flex w-full gap-3 mt-2">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-full border border-white/20 text-xs font-semibold text-white/80 bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-10 rounded-full bg-red-500/80 hover:bg-red-500 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(248,113,113,0.45)] transition-colors"
            >
              Reset Level
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


