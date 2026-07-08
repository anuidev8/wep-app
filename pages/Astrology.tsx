import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DailyHoroscopeForm } from '../components/DailyHoroscopeForm';
import { checkDailyHoroscope, getLatestHoroscope } from '../services/horoscopeService';
import { DailyPersonalHoroscopeResponse } from '../services/astroApi';

type DailyHoroscopeData = DailyPersonalHoroscopeResponse['data'];

const parseStoredHoroscope = (stored: any): DailyHoroscopeData | null => {
  if (!stored?.content) return null;
  try {
    const parsed = typeof stored.content === 'string' ? JSON.parse(stored.content) : stored.content;
    if (stored.localDate) {
      parsed.date = stored.localDate;
    }
    return parsed as DailyHoroscopeData;
  } catch {
    return null;
  }
};

export const Astrology: React.FC = () => {
  const navigate = useNavigate();
  // State to track the loading phase
  // 'initial': Component mounted, starting check
  // 'checking': Calling checkDailyHoroscope
  // 'loading_result': User has result, fetching it with delay
  // 'ready_for_form': User can generate new horoscope
  const [loadingState, setLoadingState] = useState<'initial' | 'checking' | 'loading_result' | 'ready_for_form'>('initial');
  const [localDate, setLocalDate] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const getLocalTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  };

  const formatLocalDate = (value: string | null) => {
    if (!value) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const [year, month, day] = value.split('-').map((part) => Number(part));
    if (!year || !month || !day) {
      return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[month - 1]} ${day}`;
  };

  useEffect(() => {
    const init = async () => {
      if (!isMounted.current) return;
      setLoadingState('checking');
      const startTime = Date.now();

      try {
        const timezone = getLocalTimezone();
        const response = await checkDailyHoroscope(timezone);
        
        if (!isMounted.current) return;

        if (response?.localDate) {
          setLocalDate(response.localDate);
        }

        if (response && response.allowed === false) {
          // User has existing horoscope.
          setLoadingState('loading_result');
          
          // Fetch the data while waiting for the minimum 3s delay
          const [latest] = await Promise.all([
            getLatestHoroscope(),
            // Ensure minimum 3 seconds total wait time from start to prevent flashing
            new Promise(resolve => setTimeout(resolve, Math.max(0, 3000 - (Date.now() - startTime))))
          ]);

          if (!isMounted.current) return;

          // Parse and prepare navigation
          const parsed = parseStoredHoroscope(latest);
          
          if (parsed) {
            // Get name from local storage
            let firstName = '';
            let lastName = '';
            try {
               const savedBirthRaw = localStorage.getItem('daily_horoscope_birth_v1');
               if (savedBirthRaw) {
                 const savedBirth = JSON.parse(savedBirthRaw);
                 firstName = savedBirth.firstName || '';
                 lastName = savedBirth.lastName || '';
               }
            } catch (e) {
              // Ignore storage errors
            }
            
            navigate('/horoscope-result', { 
              replace: true,
              state: { 
                result: parsed,
                firstName,
                lastName
              }
            });
            return;
          } else {
            // Fallback: If we can't parse the result, go to result page and let it handle/fail gracefully
            navigate('/horoscope-result', { replace: true });
            return;
          }
        } else {
          // User needs to generate a horoscope
          if (isMounted.current) {
            setLoadingState('ready_for_form');
          }
        }
      } catch (error) {
        console.warn('[Astrology] Failed to check horoscope availability', error);
        // On error, default to showing form so user isn't stuck
        if (isMounted.current) {
          setLoadingState('ready_for_form');
        }
      }
    };

    init();
  }, [navigate]);

  return (
    <div className="h-[100dvh] bg-brand-dark text-white flex flex-col relative font-sans overflow-hidden">
      <div className="fixed inset-0 bg-[#070b14] z-0"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_#1A4D5C_0%,_transparent_60%)] z-0 opacity-40"></div>

      {/* Header - Mobile Optimized with More Top Margin */}
      <div className="relative z-10 px-4 pt-safe pb-4">
        <div className="pt-8 pb-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="p-3 bg-white/5 rounded-full hover:bg-white/10 border border-white/10 transition-all active:scale-95 touch-manipulation"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-center flex-1">
            <h2 className="text-[11px] font-black tracking-[0.3em] text-brand-gold uppercase">
              Daily Horoscope
            </h2>
            <p className="text-xs text-white/40 font-medium">
              {formatLocalDate(localDate)}
            </p>
          </div>
          <div className="w-11 h-11" />
        </div>
      </div>

      {/* Content - Mobile Optimized */}
      <div className="relative z-10 px-4 flex-1 flex flex-col gap-6 pb-6 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <div className="space-y-6 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <Sparkles size={16} className="text-brand-gold" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-brand-gold font-semibold">
              Personal Vedic Insight
            </span>
          </div>
        </div>

        {loadingState !== 'ready_for_form' ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-2 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin" />
            <p className="text-white/30 text-xs uppercase tracking-widest animate-pulse">
              {loadingState === 'loading_result' ? 'Loading your reading...' : 'Checking Access...'}
            </p>
          </div>
        ) : (
          <DailyHoroscopeForm />
        )}
      </div>

    </div>
  );
};
