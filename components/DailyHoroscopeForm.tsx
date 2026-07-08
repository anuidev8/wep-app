import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDailyPersonalHoroscope, DailyPersonalHoroscopeResponse } from '../services/astroApi';
import { checkDailyHoroscope, getLatestHoroscope, storeDailyHoroscope } from '../services/horoscopeService';
import { useApp } from '../context/AppContext';

type DailyHoroscopeData = DailyPersonalHoroscopeResponse['data'];

interface BirthFormState {
  firstName: string;
  lastName: string;
  year: string;
  month: string;
  day: string;
}

const STORAGE_BIRTH_KEY = 'daily_horoscope_birth_v1';

const getLocalTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

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

/**
 * Validate if a date is valid (e.g., prevents February 30th, April 31st, etc.)
 */
const isValidDate = (year: number, month: number, day: number): boolean => {
  if (!year || !month || !day) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Create a date object and check if it's valid
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

/**
 * Convert 12-hour format to 24-hour format
 */
const convertTo24Hour = (hour: number, minute: number, ampm: 'AM' | 'PM'): { hour: number; minute: number } => {
  let hour24 = hour;
  if (ampm === 'PM' && hour !== 12) {
    hour24 = hour + 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour24 = 0;
  }
  return { hour: hour24, minute };
};

/**
 * Validate time inputs (12-hour format)
 */
const isValidTime = (hour: number, minute: number): boolean => {
  return hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59;
};

export const DailyHoroscopeForm: React.FC = () => {
  const navigate = useNavigate();
  const { membershipStatus } = useApp();
  const isPremium = membershipStatus === 'Premium Membership';
  
  const [birth, setBirth] = useState<BirthFormState>({
    firstName: '',
    lastName: '',
    year: '',
    month: '',
    day: '',
  });
  const [date, setDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRunHoroscope, setHasRunHoroscope] = useState(false);
  const [alreadyGeneratedToday, setAlreadyGeneratedToday] = useState(false);

  useEffect(() => {
    try {
      const savedBirthRaw = localStorage.getItem(STORAGE_BIRTH_KEY);
      if (savedBirthRaw) {
        const savedBirth: any = JSON.parse(savedBirthRaw);
        // Only load essential fields (firstName, lastName, year, month, day)
        setBirth({
          firstName: savedBirth.firstName || '',
          lastName: savedBirth.lastName || '',
          year: savedBirth.year || '',
          month: savedBirth.month || '',
          day: savedBirth.day || '',
        });
        
      }
    } catch {
      // Ignore corrupted data
    }
  }, []);

  const hasBirthData =
    !!birth.firstName && !!birth.lastName && !!birth.year && !!birth.month && !!birth.day;

  if (!isPremium) {
    return (
      <div className="space-y-8 relative py-4">
         {/* Premium CTA Card */}
         <div className="relative z-20 bg-gradient-to-b from-brand-darkSurface to-[#0A101D] border border-brand-gold/20 rounded-[32px] p-8 text-center shadow-2xl overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-gold/10 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-brand-gold/30 shadow-lg shadow-brand-gold/5 group-hover:scale-105 transition-transform duration-500">
                 <Lock className="text-brand-gold drop-shadow-md" size={28} />
              </div>
              
              <h3 className="font-serif text-2xl text-white mb-3 tracking-wide">Unlock Daily Insights</h3>
              
              <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                 Get personalized Vedic astrology readings tailored to your birth chart. Reveal your daily cosmic guidance with Premium.
              </p>
              
              <button
                 onClick={() => navigate('/subscription')}
                 className="w-full py-4 rounded-2xl font-bold text-brand-dark shadow-lg shadow-brand-gold/20 text-sm uppercase tracking-widest bg-gradient-to-r from-brand-gold to-[#F59E0B] hover:to-[#D97706] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                 <span>Upgrade to Premium</span>
                 <Sparkles size={16} className="text-brand-dark/70" />
              </button>
            </div>
         </div>

         {/* Blurred/Faded Form Preview (Visual Context) */}
         <div className="opacity-40 blur-[3px] pointer-events-none select-none grayscale-[0.5] scale-[0.98] origin-top">
            <div className="space-y-5">
               <div className="space-y-3">
                  <label className="text-[11px] font-bold text-brand-gold/50 uppercase tracking-[0.2em] block">Your Name</label>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-4 h-14"></div>
                     <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-4 h-14"></div>
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="text-[11px] font-bold text-brand-gold/50 uppercase tracking-[0.2em] block">Birth Date</label>
                  <div className="grid grid-cols-3 gap-3">
                     <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-4 h-14"></div>
                     <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-4 h-14"></div>
                     <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-4 h-14"></div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasBirthData) {
      setError('Please fill all birth details to get your horoscope.');
      return;
    }

    // Validate date inputs
    const year = Number(birth.year);
    const month = Number(birth.month);
    const day = Number(birth.day);

    if (!isValidDate(year, month, day)) {
      setError(`Invalid birth date: ${month}/${day}/${year}. Please check that the day exists for that month (e.g., February has 28-29 days, April has 30 days).`);
      return;
    }

    let localDate = date;

    try {
      setLoading(true);

      // Cache birth details
      localStorage.setItem(STORAGE_BIRTH_KEY, JSON.stringify(birth));

      const userTimezone = getLocalTimezone();
      const checkResponse = await checkDailyHoroscope(userTimezone);
      localDate = checkResponse?.localDate || date;
      if (localDate) {
        setDate(localDate);
      }

      if (!checkResponse?.allowed) {
        setAlreadyGeneratedToday(true);
        const message = checkResponse?.message || 'You have already generated your horoscope today. Please come back tomorrow after 12:01 AM to generate a new one.';
        setError(message);

        return;
      }

      setAlreadyGeneratedToday(false);

      // Log the request payload for debugging
      const requestPayload = {
        birth: {
          year,
          month,
          day,
        },
        date: localDate || date,
        tz_str: userTimezone,
      };
      
      console.log('Horoscope Request (Gemini):', requestPayload);

      const response = await getDailyPersonalHoroscope(requestPayload);

      // Validate response data
      if (!response || !response.data) {
        throw new Error('Invalid response from horoscope API. Please try again.');
      }

      // Check if response has meaningful data (not default/error values)
      if (!response.data.sign || !response.data.content || !response.data.scores) {
        throw new Error('Incomplete data received from horoscope API. The backend may not be processing your birth details correctly.');
      }

      // Log response for debugging
      console.log('Horoscope Response (Gemini):', {
        sign: response.data.sign,
        theme: response.data.content.theme,
        luckyColor: response.data.lucky.color.label,
        luckyNumber: response.data.lucky.number,
        scores: response.data.scores,
        requestBirthDate: `${year}-${month}-${day}`
      });

      // Check if response seems generic/default (same lucky color/number for everyone would indicate backend issue)
      // This is a heuristic check - if scores are all exactly the same or lucky number is always the same, might be an issue
      const responseHash = `${response.data.lucky.color.label}-${response.data.lucky.number}-${response.data.scores.overall}-${response.data.scores.love}-${response.data.scores.career}`;
      console.log('Response uniqueness hash:', responseHash);

      const serializedContent = JSON.stringify(response.data);
      const stored = await storeDailyHoroscope(serializedContent, userTimezone);
      
      // Update local date if backend normalized it
      if (stored?.localDate) {
        response.data.date = stored.localDate;
        localDate = stored.localDate;
        setDate(stored.localDate);
      }

      // CRITICAL: Cache result to localStorage so AppContext can detect "Completed" status immediately
      try {
        // 1. Save the full result content keyed by date
        localStorage.setItem(`daily_horoscope_result_v1_${localDate}`, JSON.stringify(response.data));
        
        // 2. Update the "last generated" metadata
        localStorage.setItem('daily_horoscope_last_generated_v1', JSON.stringify({
          date: localDate,
          timestamp: Date.now()
        }));

        // 3. Dispatch events to notify AppContext (Home header & Side Menu)
        window.dispatchEvent(new Event('horoscope_generated'));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.warn('Failed to cache horoscope to localStorage', e);
      }
      
      // Mark that horoscope has been run and generated today
      setHasRunHoroscope(true);
      setAlreadyGeneratedToday(true);
      
      // Navigate to results page
      navigate('/horoscope-result', { 
        state: { 
          result: response.data,
          firstName: birth.firstName,
          lastName: birth.lastName
        } 
      });
    } catch (err: any) {
      console.error('Daily horoscope error:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to fetch horoscope.';
      
      // Provide user-friendly error messages for common API errors
      if (errorMessage.includes('already generated your horoscope today')) {
        setAlreadyGeneratedToday(true);
        setError(errorMessage);
      } else if (errorMessage.includes('day is out of range for month')) {
        setError('Invalid birth date: The day you entered doesn\'t exist for that month. Please check your birth date (e.g., February has 28-29 days, April has 30 days).');
      } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
        setError('The horoscope service is currently unavailable or experiencing issues. Please try again in a few moments.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Network error: Unable to connect to the horoscope service. Please check your internet connection and try again.');
      } else if (errorMessage.includes('Invalid response') || errorMessage.includes('Incomplete data')) {
        setError(errorMessage);
      } else {
        setError(`Error: ${errorMessage}\n\nIf this persists, please verify your birth date is correct and try again in a few moments.`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Inputs - Mobile Optimized */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-brand-gold uppercase tracking-[0.2em] block">
            Your Name
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First Name"
              value={birth.firstName}
              onChange={(e) => setBirth((b) => ({ ...b, firstName: e.target.value }))}
              disabled={hasRunHoroscope}
              className={`bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-base placeholder-white/30 focus:outline-none transition-transform touch-manipulation ${
                hasRunHoroscope
                  ? 'text-white/40 cursor-not-allowed opacity-50'
                  : 'text-white focus:border-brand-gold/60 active:scale-[0.98]'
              }`}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={birth.lastName}
              onChange={(e) => setBirth((b) => ({ ...b, lastName: e.target.value }))}
              disabled={hasRunHoroscope}
              className={`bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-base placeholder-white/30 focus:outline-none transition-transform touch-manipulation ${
                hasRunHoroscope
                  ? 'text-white/40 cursor-not-allowed opacity-50'
                  : 'text-white focus:border-brand-gold/60 active:scale-[0.98]'
              }`}
            />
          </div>
        </div>

        {/* Birth Date - Mobile Optimized */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-brand-gold uppercase tracking-[0.2em] block">
            Birth Date
          </label>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              placeholder="Year"
              value={birth.year}
              onChange={(e) => setBirth((b) => ({ ...b, year: e.target.value }))}
              disabled={hasRunHoroscope}
              className={`bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-base placeholder-white/30 focus:outline-none transition-transform touch-manipulation ${
                hasRunHoroscope
                  ? 'text-white/40 cursor-not-allowed opacity-50'
                  : 'text-white focus:border-brand-gold/60 active:scale-[0.98]'
              }`}
              inputMode="numeric"
            />
            <input
              type="number"
              placeholder="Month"
              min="1"
              max="12"
              value={birth.month}
              onChange={(e) => setBirth((b) => ({ ...b, month: e.target.value }))}
              disabled={hasRunHoroscope}
              className={`bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-base placeholder-white/30 focus:outline-none transition-transform touch-manipulation ${
                hasRunHoroscope
                  ? 'text-white/40 cursor-not-allowed opacity-50'
                  : 'text-white focus:border-brand-gold/60 active:scale-[0.98]'
              }`}
              inputMode="numeric"
            />
            <input
              type="number"
              placeholder="Day"
              min="1"
              max="31"
              value={birth.day}
              onChange={(e) => setBirth((b) => ({ ...b, day: e.target.value }))}
              disabled={hasRunHoroscope}
              className={`bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-base placeholder-white/30 focus:outline-none transition-transform touch-manipulation ${
                hasRunHoroscope
                  ? 'text-white/40 cursor-not-allowed opacity-50'
                  : 'text-white focus:border-brand-gold/60 active:scale-[0.98]'
              }`}
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Error Message - Mobile Optimized */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-200 text-sm rounded-2xl px-5 py-4 leading-relaxed">
            {error}
          </div>
        )}

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col gap-3 pt-2">
          {alreadyGeneratedToday || hasRunHoroscope ? (
            <>
              <div className="bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm rounded-2xl px-5 py-4 text-center">
                You've already generated your horoscope today. Come back tomorrow after 12:01 AM for a new reading.
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const latest = await getLatestHoroscope();
                    const parsed = parseStoredHoroscope(latest);
                    if (!parsed) {
                      setError('Horoscope data not found. Please generate a new horoscope.');
                      setAlreadyGeneratedToday(false);
                      setHasRunHoroscope(false);
                      return;
                    }

                    setHasRunHoroscope(true);
                    if (latest?.localDate) {
                      setDate(latest.localDate);
                    }

                    navigate('/horoscope-result', { 
                      state: { 
                        result: parsed,
                        firstName: birth.firstName,
                        lastName: birth.lastName
                      } 
                    });
                  } catch (err) {
                    console.error('Error loading cached horoscope:', err);
                    setError('Error loading horoscope. Please try generating a new one.');
                  }
                }}
                className="w-full py-5 rounded-2xl font-bold text-white shadow-2xl text-base uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all touch-manipulation bg-gradient-to-r from-brand-gold to-orange-400 active:scale-[0.97]"
              >
                View Today's Horoscope
                <Sparkles size={18} />
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={loading || !hasBirthData}
              className={`w-full py-5 rounded-2xl font-bold text-brand-dark shadow-2xl text-base uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all touch-manipulation ${
                loading || !hasBirthData
                  ? 'bg-gray-700 text-white/40 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-brand-gold to-orange-400 active:scale-[0.97]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Calculating...
                </>
              ) : (
                <>
                  Reveal Daily Guidance
                  <Sparkles size={18} />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DailyHoroscopeForm;
