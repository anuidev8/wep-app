import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useElevenLabsTTS } from '../hooks/useElevenLabsTTS';
import { Square, Mic, X, MoreHorizontal } from 'lucide-react';
import { Conversation } from '@11labs/client';
import { Capacitor } from '@capacitor/core';

// NOTE: Replace this with your actual Agent ID from ElevenLabs Dashboard
const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_5501k1s0gkw4f1ctrmsccp67sk84';

export const MeditationVoiceChat: React.FC = () => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<string>('Tap to speak');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Conversation Cleanup
  useEffect(() => {
    return () => {
      if (conversation) {
        conversation.endSession();
      }
    };
  }, [conversation]);

  const startSession = useCallback(async () => {
    try {
      setErrorMessage(null);
      setStatus('Connecting...');
      
      // Request mic permission first via browser API (works in Capacitor WebView)
      // This is crucial for the Conversational AI SDK to access audio stream
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const conv = await Conversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => {
          setIsConnected(true);
          setStatus('Listening...');
        },
        onDisconnect: () => {
          setIsConnected(false);
          setStatus('Tap to speak');
          setIsSpeaking(false);
        },
        onError: (error) => {
          console.error('Conversation error:', error);
          setErrorMessage('Connection failed');
          setIsConnected(false);
          setStatus('Tap to speak');
        },
        onModeChange: (mode) => {
          if (mode.mode === 'speaking') {
            setIsSpeaking(true);
            setStatus('Abhi is speaking...');
          } else {
            setIsSpeaking(false);
            setStatus('Listening...');
          }
        }
      });

      setConversation(conv);

    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
         setErrorMessage('Microphone permission required');
      } else {
         setErrorMessage('Failed to connect. Check Agent ID.');
      }
      setStatus('Tap to speak');
    }
  }, []);

  const stopSession = useCallback(async () => {
    if (conversation) {
      await conversation.endSession();
      setConversation(null);
      setIsConnected(false);
      setStatus('Tap to speak');
    }
  }, [conversation]);

  return (
    <div className="flex flex-col h-full bg-brand-cream dark:bg-brand-darkBase relative overflow-hidden">
      {/* Background Ambient Animation */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] transition-all duration-1000 ${
          isConnected && !isSpeaking
            ? 'bg-brand-primary/10 dark:bg-brand-gold/10 scale-110' 
            : isSpeaking
              ? 'bg-brand-medium/10 dark:bg-brand-gold/10 scale-125 animate-pulse-slow'
              : 'bg-brand-light/20 dark:bg-white/5 scale-100'
        }`} />
      </div>

      {/* Main Content - Centered Interaction */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        {/* Status Text */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-serif text-brand-dark dark:text-brand-gold mb-2 transition-opacity duration-300">
            {status}
          </h2>
          {errorMessage && (
            <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">{errorMessage}</p>
          )}
        </div>

        {/* Central Interaction Orb */}
        <div className="relative">
          {/* Ripple Effects */}
          {isConnected && !isSpeaking && (
            <>
              <div className="absolute inset-0 bg-brand-primary/20 dark:bg-brand-gold/20 rounded-full animate-ping scale-150 duration-1000" />
              <div className="absolute inset-0 bg-brand-primary/10 dark:bg-brand-gold/10 rounded-full animate-ping scale-125 duration-1500 delay-100" />
            </>
          )}

          {/* Main Button */}
          <button
            onClick={isConnected ? stopSession : startSession}
            className={`w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 transform hover:scale-105 active:scale-95 ${
              isConnected && !isSpeaking
                ? 'bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark scale-110'
                : isSpeaking
                  ? 'bg-brand-medium dark:bg-brand-gold/80 text-white dark:text-brand-dark animate-pulse-slow'
                  : 'bg-white dark:bg-brand-darkSurface text-brand-dark dark:text-brand-gold border-2 border-brand-light dark:border-brand-gold/30'
            }`}
          >
            {isConnected && !isSpeaking ? (
               <div className="relative">
                 <Mic size={40} className="animate-pulse" />
                 <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Stop</span>
               </div>
            ) : isSpeaking ? (
              <div className="flex items-center gap-1.5 h-12">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1.5 bg-current rounded-full animate-[bounce_1s_infinite]" 
                    style={{ animationDelay: `${i * 0.15}s`, height: '60%' }} 
                  />
                ))}
              </div>
            ) : status === 'Connecting...' ? (
              <MoreHorizontal size={40} className="animate-pulse" />
            ) : (
              <Mic size={40} strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Hints */}
        {!isConnected && (
          <p className="mt-12 text-sm text-brand-medium/60 dark:text-brand-darkTextMuted/60 animate-fade-in max-w-xs text-center">
            "Tap to start a real-time conversation with Abhi"
          </p>
        )}
      </div>
    </div>
  );
};
