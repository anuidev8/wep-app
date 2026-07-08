import React, { useState, useEffect } from 'react';
import { useCourseAudioPlayer } from '../context/CourseAudioPlayerContext';

interface ZenLoadingScreenProps {
  messages?: string[];
  fullScreen?: boolean;
}

export const ZenLoadingScreen: React.FC<ZenLoadingScreenProps> = ({ 
  messages,
  fullScreen = false 
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const { suppressMiniPlayer } = useCourseAudioPlayer();
  
  const defaultMessages = [
    "Preparing your sacred space...",
    "Connecting to inner stillness...",
    "Awakening the breath...",
    "Entering the present moment...",
    "Finding your center...",
    "Opening to tranquility...",
  ];

  const meditativeMessages = messages || defaultMessages;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % meditativeMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [meditativeMessages.length]);

  useEffect(() => {
    if (!fullScreen) return;
    suppressMiniPlayer(true);
    return () => suppressMiniPlayer(false);
  }, [fullScreen, suppressMiniPlayer]);

  const containerClass = fullScreen 
    ? "fixed inset-0 w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#053445] flex items-center justify-center touch-none"
    : "relative min-h-[60vh] w-full overflow-hidden bg-[#053445] flex items-center justify-center rounded-[24px]";

  return (
    <div className={containerClass}>
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.2)_0%,_transparent_60%)]" />
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(15,118,110,0.45)_0%,_transparent_70%)] blur-[4px] opacity-70" />
      </div>

      {/* Main Content - safe area when fullScreen */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-8 flex-1 min-h-0 w-full"
        style={fullScreen ? {
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        } : undefined}
      >
        {/* Om Symbol with concentric circles */}
        <div className="mb-16 relative w-64 h-64 flex items-center justify-center">
          {/* Outer subtle halo */}
          <div className="absolute inset-[-40px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.2)_0%,_transparent_65%)] opacity-70" />

          {/* Concentric rings */}
          <div className="absolute inset-6 rounded-full border border-white/10" />
          <div className="absolute inset-11 rounded-full border border-brand-gold/60" />
          <div className="absolute inset-[72px] rounded-full border border-white/15" />

          {/* Inner glowing core */}
          <div className="absolute w-24 h-24 rounded-full bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.35)_0%,_transparent_70%)] blur-[2px]" />

          {/* Om glyph */}
          <div className="relative text-7xl font-serif text-brand-gold/90 tracking-wide">
            ॐ
          </div>
        </div>

        {/* Rotating Meditative Message */}
        <div className="h-16 mb-8 flex items-center justify-center">
          <p 
            key={messageIndex}
            className="text-xl font-serif text-white/80 animate-fade-in"
          >
            {meditativeMessages[messageIndex]}
          </p>
        </div>

        {/* Breathing Dots */}
        <div className="flex items-center gap-3 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-gold/60"
              style={{
                animation: `breathe 2s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS Animation for Breathing Dots */}
      <style>{`
        @keyframes breathe {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  );
};
