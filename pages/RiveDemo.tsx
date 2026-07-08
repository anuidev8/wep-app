import React, { useState, useCallback } from 'react';
import { VoiceAgentIndicator, type VoiceState } from '../components/VoiceAgentIndicator';
import { Mic } from 'lucide-react';

/** Background gradient: DDD2D9 → D7D8EE → D7D8EE */
const SCREEN_BG = 'linear-gradient(180deg, #DDD2D9 0%, #D7D8EE 50%, #D7D8EE 100%)';
const VIEWER_SIZE = 'min(80vmin, 58vh, 380px)';

/**
 * Real-app UI: header, Rive voice indicator in the main area, input bar with mic at bottom.
 * Keeps all existing state logic (idle → ready → listening → thinking).
 */
export const RiveDemo: React.FC = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [inputValue, setInputValue] = useState('');

  const handleMicPress = useCallback(() => {
    if (voiceState === 'listening') {
      setVoiceState('thinking');
      setTimeout(() => setVoiceState('idle'), 1500);
      return;
    }
    if (voiceState === 'idle' || voiceState === 'ready') {
      setVoiceState('listening');
      return;
    }
  }, [voiceState]);

  const handleInputFocus = useCallback(() => {
    if (voiceState === 'idle') setVoiceState('ready');
  }, [voiceState]);

  const handleInputBlur = useCallback(() => {
    if (voiceState === 'ready') setVoiceState('idle');
  }, [voiceState]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden pt-safe pb-safe"
      style={{ background: SCREEN_BG }}
    >
      {/* Main: absolute title + centered Rive */}
      <main className="flex-1 min-h-0 relative flex flex-col items-center justify-center px-4">
        {/* Big title in absolute position – gallery / AI suggestion hierarchy */}
        <div
          className="absolute left-0 right-0 top-[10%] sm:top-[12%] px-4 sm:px-6 text-center pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <h2 className="text-[clamp(2rem,8vw,3.5rem)] font-bold tracking-tight text-[#2d3142] leading-[1.1]">
            AI Suggestions
          </h2>
          <p className="mt-1.5 sm:mt-2 text-[clamp(0.9rem,2.5vw,1.1rem)] font-medium text-[#5c5f75] tracking-wide">
            Your voice-powered ideas
          </p>
        </div>

        <VoiceAgentIndicator
          state={voiceState}
          width={VIEWER_SIZE}
          height={VIEWER_SIZE}
          style={{ flexShrink: 0 }}
        />
      </main>

      {/* Bottom input bar (real-app style) */}
      <div
        className="flex-shrink-0 px-4 pb-6 pt-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-xl mx-auto flex items-center gap-2 bg-white rounded-2xl shadow-lg shadow-[#c4b8e0]/25 border border-white/80 px-4 py-3 min-h-[56px]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Show me the last Christmas memories"
            className="flex-1 min-w-0 bg-transparent text-[#3d4168] placeholder:text-[#9a9eb8] text-[15px] outline-none"
            aria-label="Voice or text input"
          />
          <button
            type="button"
            onClick={handleMicPress}
            aria-label={voiceState === 'listening' ? 'Stop listening' : 'Start voice'}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              voiceState === 'listening'
                ? 'bg-[#7c6bb8] text-white'
                : 'bg-[#E8ECFC] text-[#6b6f8a] hover:bg-[#DAD6F0]'
            }`}
          >
            <Mic size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};
