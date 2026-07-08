
import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
// TTS playback helper (browser / Capacitor-friendly, no API key required)
import { playGeminiTts, stopTtsPlayback } from '../services/ttsPlayback';
import { generateSpeech } from '../services/geminiService';
import { ChatMessage, AssistantResponse } from '../types';
import { MeditationVoiceChat } from '../components/MeditationVoiceChat';
import { 
    Send, ArrowLeft, Wind, Sparkles, Moon, Volume2, 
    Loader2, ExternalLink, Globe, Headphones, Leaf, 
    Flame, Zap, Heart, MessageSquare, AlertCircle, Mic
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { sendAssistantMessage, initAssistantSession, getStoredThreadId } from '../services/chatAssistantService';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChatErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Chat] Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col h-screen bg-brand-cream dark:bg-brand-darkBase items-center justify-center p-6">
          <div className="text-center max-w-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="font-bold text-red-900 dark:text-red-200 mb-2">Something went wrong</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              The chat interface encountered an error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Assistant with error handling
    const initializeChat = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);
        await initAssistantSession();
        const existingThread = getStoredThreadId();
        if (existingThread) {
          setThreadId(existingThread);
        }
        
        // Initial greeting
        setMessages([{
          id: '1',
          role: 'model',
          text: "Namaste. 🙏 How can I support your flow today?",
        }]);
        
        setIsInitializing(false);
      } catch (error: any) {
        console.error('[Chat] Initialization error:', error);
        setInitError(error?.message || 'Failed to initialize chat. Please try refreshing the page.');
        setIsInitializing(false);
      }
    };

    initializeChat();

    return () => {
      stopTtsPlayback();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSubmit = textOverride || inputValue;
    if (!textToSubmit.trim() || isLoading) return;

    setInputValue('');
    setDynamicSuggestions([]); // Clear old suggestions when new query starts
    setIsLoading(true);

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    // Add user message + assistant placeholder
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', text: textToSubmit },
      { id: assistantMsgId, role: 'model', text: '', isTyping: true },
    ]);

    try {
      const response: AssistantResponse = await sendAssistantMessage(textToSubmit, threadId || undefined);

      if (response.threadId && !threadId) {
        setThreadId(response.threadId);
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                text: response.answer,
                bullets: response.bullets,
                steps: response.steps,
                shortcuts: response.shortcuts,
                backgroundColor: response.backgroundColor,
                isTyping: false,
              }
            : msg
        )
      );

      if (response.shortcuts && response.shortcuts.length > 0) {
        setDynamicSuggestions(response.shortcuts);
      }

      if (response.source === 'navigation' && response.destination) {
        const routes: Record<string, string> = {
          HOME: '/',
          COURSES: '/courses',
          BREATH_TRAINING: `/breathe?pattern=CALM`,
          GUIDED_MEDITATION: '/meditate?tab=guided',
          SLEEP_MUSIC: '/sleep-music',
          MANTRAS: '/meditate?tab=mantra',
          CHAKRAS: '/meditate?tab=chakra',
          ASTROLOGY: '/astrology',
          MORNING_RITUAL: '/morning-ritual',
          GRATITUDE_JOURNAL: '/gratitude',
          SANCTUARY_STUDIO: '/studio',
          LIVE_SESSIONS: '/live',
          MANTRA_EXPLORER: '/mantra-explorer',
        };
        const targetPath = routes[response.destination];
        if (targetPath) {
          setTimeout(() => navigate(targetPath), 1800);
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg = error?.message?.includes("Requested entity was not found") 
        ? "I'm having a connection issue with the cosmic server. Please try refreshing." 
        : "The flow was interrupted. Let's try that again in a moment.";

      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: errorMsg 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const playTTS = async (text: string, messageId: string) => {
    if (playingMessageId === messageId || !text) return;

    try {
      setPlayingMessageId(messageId);
      // Generate speech using Gemini TTS with Kore voice
      const audioData = await generateSpeech(text);
      // Play the generated audio
      await playGeminiTts(audioData, 24000);
    } catch (error) {
      console.error("TTS Error", error);
      // Fallback: show error message to user
      alert("Unable to play audio. Please try again.");
    } finally {
      setPlayingMessageId(null);
    }
  };

  const handleQuickAction = (action: string) => {
      if (action === 'BREATH') navigate('/breathe?pattern=CALM');
      if (action === 'MANTRA') navigate('/meditate?tab=mantra');
      if (action === 'SLEEP') navigate('/sleep-music');
      if (action === 'VIBES') handleSend("Tell me about the health benefits of diaphragmatic breathing.");
  };

  // Loading Skeleton Component
  const LoadingSkeleton = () => (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-40">
      {/* Skeleton for initial message */}
      <div className="flex flex-col items-start animate-fade-in">
        <span className="text-[9px] font-bold text-brand-medium/50 dark:text-brand-darkTextMuted/50 uppercase tracking-[0.2em] mb-1.5 ml-2">Abhi</span>
        <div className="max-w-[85%] p-4 rounded-3xl rounded-bl-none bg-white dark:bg-brand-darkSurface border border-brand-light dark:border-brand-darkBorder shadow-sm">
          <div className="space-y-2">
            <div className="h-4 bg-brand-light dark:bg-brand-darkBase rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-brand-light dark:bg-brand-darkBase rounded w-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-4 bg-brand-light dark:bg-brand-darkBase rounded w-5/6 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Fallback Component with Animated Dots
  const FallbackMessage = () => (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-brand-gold/20 blur-xl animate-pulse-slow"></div>
          </div>
          <div className="relative text-6xl font-serif text-brand-gold/90 animate-pulse-slow">
            ॐ
          </div>
        </div>
        <h3 className="text-xl font-serif text-brand-dark dark:text-white mb-3">
          The coach will be with you shortly
        </h3>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-2 h-2 rounded-full bg-brand-gold animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-brand-gold animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-brand-gold animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <p className="text-sm text-brand-primary dark:text-brand-darkTextMuted mt-6">
          Preparing your sacred space for connection...
        </p>
      </div>
    </div>
  );

  // Error State Component
  const ErrorState = ({ message }: { message: string }) => (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="font-bold text-red-900 dark:text-red-200 mb-2">Connection Issue</h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );

  return (
    <ChatErrorBoundary>
      <div className="flex flex-col h-screen bg-brand-cream dark:bg-brand-darkBase transition-colors duration-300">
        {/* HEADER */}
        <div className="bg-white/80 dark:bg-brand-darkSurface/80 backdrop-blur-xl border-b border-brand-light dark:border-brand-darkBorder p-4 flex items-center sticky top-0 z-30 transition-colors duration-300">
            <button 
              onClick={() => navigate('/')} 
              className="relative mr-4 p-3 bg-white/80 dark:bg-white/10 rounded-full text-brand-dark dark:text-white hover:bg-white dark:hover:bg-white/20 transition-all duration-300 border-2 border-brand-gold/30 dark:border-brand-gold/20 shadow-lg shadow-brand-gold/10 dark:shadow-brand-gold/5 active:scale-95 group"
              style={{
                boxShadow: '0 4px 20px rgba(212, 165, 116, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="absolute inset-0 rounded-full bg-brand-gold/5 dark:bg-brand-gold/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <ArrowLeft size={20} className="relative z-10 group-hover:text-brand-gold dark:group-hover:text-brand-gold transition-colors duration-300" strokeWidth={2.5} />
            </button>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-brand-primary rounded-[14px] flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                        <Wind size={20} />
                    </div>
                    <div>
                        <h1 className="font-serif font-bold text-brand-dark dark:text-brand-darkText leading-none">Abhi</h1>
                        <p className="text-[10px] text-brand-medium dark:text-brand-darkTextMuted font-bold uppercase tracking-widest mt-0.5">Expert Breathing Coach</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={`p-2 rounded-full transition-all duration-300 ${
                  isVoiceMode 
                    ? 'bg-brand-gold text-brand-dark shadow-glow-gold animate-pulse-slow' 
                    : 'bg-white/50 dark:bg-white/10 text-brand-medium dark:text-brand-darkTextMuted hover:bg-brand-primary/10 dark:hover:bg-white/20'
                }`}
                title={isVoiceMode ? "Switch to Text" : "Switch to Voice"}
              >
                {isVoiceMode ? <MessageSquare size={18} /> : <Mic size={18} />}
              </button>
              
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-500/20">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Present</span>
            </div>
            </div>
        </div>

        {/* CHAT AREA & INPUT */}
        {isVoiceMode ? (
          <div className="flex-1 overflow-hidden relative z-0">
             <MeditationVoiceChat />
          </div>
        ) : (
          <>
            {initError ? (
              <ErrorState message={initError} />
            ) : isInitializing ? (
              <LoadingSkeleton />
            ) : messages.length === 0 ? (
              <FallbackMessage />
            ) : (
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 no-scrollbar pb-40">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                        {msg.role === 'model' && (
                            <span className="text-[9px] font-bold text-brand-medium/50 dark:text-brand-darkTextMuted/50 uppercase tracking-[0.2em] mb-1.5 ml-2">Abhi</span>
                        )}
                        <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-[1.6] shadow-sm relative group transition-all duration-300 ${
                            msg.role === 'user' 
                            ? 'bg-brand-dark text-white rounded-br-none shadow-brand-dark/10' 
                            : 'bg-white dark:bg-brand-darkSurface text-brand-dark dark:text-brand-darkText rounded-bl-none border border-brand-light dark:border-brand-darkBorder shadow-brand-primary/5'
                        }`}>
                            <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
                            
                            {msg.isTyping && (
                                 <div className="flex gap-1 mt-3">
                                     <div className="w-1.5 h-1.5 bg-brand-medium dark:bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                     <div className="w-1.5 h-1.5 bg-brand-medium dark:bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                     <div className="w-1.5 h-1.5 bg-brand-medium dark:bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                 </div>
                            )}
                            
                            {/* Grounding Metadata section removed to comply with App Store policy against external links */}
                            
                            {/* TTS Button for Model messages */}
                            {msg.role === 'model' && !msg.isTyping && (
                              <button 
                                onClick={() => playTTS(msg.text, msg.id)}
                                className={`absolute -right-10 bottom-0 p-2 rounded-full hover:bg-brand-light dark:hover:bg-white/5 text-brand-medium/40 hover:text-brand-primary dark:hover:text-brand-gold transition-all active:scale-90 ${playingMessageId === msg.id ? 'text-brand-primary dark:text-brand-gold animate-pulse' : ''}`}
                                disabled={!!playingMessageId && playingMessageId !== msg.id}
                              >
                                {playingMessageId === msg.id ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={18} />}
                              </button>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            )}

            {/* INPUT & ACTIONS AREA */}
            <div className={`bg-white dark:bg-brand-darkSurface border-t border-brand-light dark:border-brand-darkBorder fixed bottom-24 w-full z-40 transition-colors duration-300 ${isInitializing || initError ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Contextual / Quick Suggestion Chips */}
                <div className="flex gap-2 px-3 py-3 overflow-x-auto no-scrollbar border-b border-brand-light dark:border-white/5 bg-brand-cream/30 dark:bg-brand-darkBase/30 min-h-[52px] scroll-smooth">
                    <div className="flex gap-2 flex-nowrap min-w-max pr-3">
                        {dynamicSuggestions.length > 0 ? (
                            dynamicSuggestions.map((suggestion, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => handleSend(suggestion)} 
                                    className="flex items-center gap-1.5 bg-brand-dark text-white dark:bg-brand-gold dark:text-brand-dark px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shadow-sm transition-all hover:scale-105 active:scale-95 animate-fade-in shrink-0"
                                >
                                    <Sparkles size={14} className="animate-pulse" /> {suggestion}
                                </button>
                            ))
                        ) : (
                            <>
                                <button onClick={() => handleQuickAction('BREATH')} className="group relative flex items-center gap-2 h-[42px] pl-3 pr-4 rounded-xl text-xs font-bold whitespace-nowrap border border-brand-light dark:border-brand-darkBorder border-l-[3px] border-l-blue-500 bg-brand-sage/10 dark:bg-brand-sage/5 text-brand-primary dark:text-emerald-400 transition-all hover:bg-brand-sage/20 dark:hover:bg-brand-sage/10 active:scale-[0.98] overflow-hidden shrink-0">
                                    <span className="absolute inset-0 bg-blue-500/0 group-active:bg-blue-500/10 transition-opacity duration-150" />
                                    <span className="relative z-10">🧘</span>
                                    <span className="relative z-10">Calm me</span>
                                </button>
                                <button onClick={() => handleQuickAction('VIBES')} className="group relative flex items-center gap-2 h-[42px] pl-3 pr-4 rounded-xl text-xs font-bold whitespace-nowrap border border-brand-light dark:border-brand-darkBorder border-l-[3px] border-l-purple-500 bg-brand-gold/10 dark:bg-brand-gold/5 text-brand-dark dark:text-brand-gold transition-all hover:bg-brand-gold/20 dark:hover:bg-brand-gold/10 active:scale-[0.98] overflow-hidden shrink-0">
                                    <span className="absolute inset-0 bg-purple-500/0 group-active:bg-purple-500/10 transition-opacity duration-150" />
                                    <span className="relative z-10">🔬</span>
                                    <span className="relative z-10">Breath Science</span>
                                </button>
                                <button onClick={() => handleQuickAction('MANTRA')} className="group relative flex items-center gap-2 h-[42px] pl-3 pr-4 rounded-xl text-xs font-bold whitespace-nowrap border border-brand-light dark:border-brand-darkBorder border-l-[3px] border-l-amber-500 bg-brand-lavender/10 dark:bg-brand-lavender/5 text-[#5D3E91] dark:text-brand-lavender transition-all hover:bg-brand-lavender/20 dark:hover:bg-brand-lavender/10 active:scale-[0.98] overflow-hidden shrink-0">
                                    <span className="absolute inset-0 bg-amber-500/0 group-active:bg-amber-500/10 transition-opacity duration-150" />
                                    <span className="relative z-10">✨</span>
                                    <span className="relative z-10">Spiritual Path</span>
                                </button>
                                <button onClick={() => handleQuickAction('SLEEP')} className="group relative flex items-center gap-2 h-[42px] pl-3 pr-4 rounded-xl text-xs font-bold whitespace-nowrap border border-brand-light dark:border-brand-darkBorder border-l-[3px] border-l-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-all hover:bg-indigo-100/30 dark:hover:bg-indigo-500/20 active:scale-[0.98] overflow-hidden shrink-0">
                                    <span className="absolute inset-0 bg-indigo-500/0 group-active:bg-indigo-500/10 transition-opacity duration-150" />
                                    <span className="relative z-10">🌙</span>
                                    <span className="relative z-10">Sleep Support</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-4 flex gap-3 items-center">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask Abhi anything..."
                            className="w-full bg-brand-light dark:bg-brand-darkBase rounded-2xl px-5 py-4 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:focus:ring-brand-gold/20 transition-all placeholder:text-brand-primary/70 dark:placeholder:text-brand-darkTextMuted border border-transparent dark:border-brand-darkBorder"
                            disabled={isLoading}
                        />
                        {isLoading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 size={18} className="animate-spin text-brand-medium" />
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => handleSend()}
                        disabled={isLoading || !inputValue.trim()}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all shadow-lg active:scale-90 ${
                            isLoading || !inputValue.trim() 
                            ? 'bg-brand-light dark:bg-white/5 text-brand-medium/30 cursor-not-allowed' 
                            : 'bg-brand-dark dark:bg-brand-gold dark:text-brand-dark hover:bg-brand-primary dark:hover:bg-brand-gold/80 shadow-brand-dark/20 dark:shadow-glow-dark'
                        }`}
                    >
                        <Send size={24} />
                    </button>
                </div>
            </div>
          </>
        )}
      </div>
    </ChatErrorBoundary>
  );
};
