import React, { useEffect, useState } from 'react';
import { Star, Heart, Sparkles, Wind, Play, ChevronDown, Target } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { DailyPersonalHoroscopeResponse } from '../services/astroApi';
import { getLatestHoroscope } from '../services/horoscopeService';
import { generateDailyHoroscopeUI } from '../services/dailyHoroscopeUi';

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

/**
 * Reduce a number to a single digit using numerology reduction
 * Example: 82 -> 8+2=10 -> 1+0=1
 */
const reduceToSingleDigit = (num: number | string): number => {
  let number = typeof num === 'string' ? parseInt(num, 10) : num;
  
  if (isNaN(number)) return 0;
  
  // Keep reducing until we get a single digit
  while (number > 9) {
    const digits = number.toString().split('').map(Number);
    number = digits.reduce((sum, digit) => sum + digit, 0);
  }
  
  return number;
};

/**
 * Map color names to actual CSS color values
 * Handles compound colors like "Soft Cream", "Midnight Lavender", etc.
 */
const getColorValue = (colorName: string): { bg: string; text: string; border: string } => {
  const color = colorName.toLowerCase().trim();
  
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    // Basic colors
    orange: { bg: '#FF6B35', text: '#FFFFFF', border: '#FF8C5A' },
    red: { bg: '#EF4444', text: '#FFFFFF', border: '#F87171' },
    pink: { bg: '#EC4899', text: '#FFFFFF', border: '#F472B6' },
    purple: { bg: '#A855F7', text: '#FFFFFF', border: '#C084FC' },
    blue: { bg: '#3B82F6', text: '#FFFFFF', border: '#60A5FA' },
    indigo: { bg: '#6366F1', text: '#FFFFFF', border: '#818CF8' },
    green: { bg: '#10B981', text: '#FFFFFF', border: '#34D399' },
    emerald: { bg: '#059669', text: '#FFFFFF', border: '#10B981' },
    teal: { bg: '#14B8A6', text: '#FFFFFF', border: '#2DD4BF' },
    cyan: { bg: '#06B6D4', text: '#FFFFFF', border: '#22D3EE' },
    yellow: { bg: '#F59E0B', text: '#000000', border: '#FBBF24' },
    amber: { bg: '#F59E0B', text: '#000000', border: '#FBBF24' },
    gold: { bg: '#D4A574', text: '#000000', border: '#E6C89A' },
    brown: { bg: '#92400E', text: '#FFFFFF', border: '#B45309' },
    gray: { bg: '#6B7280', text: '#FFFFFF', border: '#9CA3AF' },
    grey: { bg: '#6B7280', text: '#FFFFFF', border: '#9CA3AF' },
    black: { bg: '#1F2937', text: '#FFFFFF', border: '#374151' },
    white: { bg: '#F9FAFB', text: '#000000', border: '#E5E7EB' },
    silver: { bg: '#9CA3AF', text: '#000000', border: '#D1D5DB' },
    
    // Compound colors - Cream/Beige variations
    cream: { bg: '#FFF8E7', text: '#000000', border: '#FFE082' },
    'soft cream': { bg: '#FFF8E7', text: '#000000', border: '#FFE082' },
    beige: { bg: '#F5F5DC', text: '#000000', border: '#E6E6D4' },
    ivory: { bg: '#FFFFF0', text: '#000000', border: '#F5F5E6' },
    
    // Lavender variations
    lavender: { bg: '#E6E6FA', text: '#000000', border: '#D8BFD8' },
    'midnight lavender': { bg: '#6B5B95', text: '#FFFFFF', border: '#8B7BA8' },
    'soft lavender': { bg: '#E6E6FA', text: '#000000', border: '#D8BFD8' },
    
    // Other common compound colors
    'midnight blue': { bg: '#191970', text: '#FFFFFF', border: '#2E2E8B' },
    'navy blue': { bg: '#000080', text: '#FFFFFF', border: '#1A1A9E' },
    'sky blue': { bg: '#87CEEB', text: '#000000', border: '#B0E0E6' },
    'forest green': { bg: '#228B22', text: '#FFFFFF', border: '#32CD32' },
    'lime green': { bg: '#32CD32', text: '#000000', border: '#7CFC00' },
    'rose pink': { bg: '#FF69B4', text: '#FFFFFF', border: '#FFB6C1' },
    'coral': { bg: '#FF7F50', text: '#FFFFFF', border: '#FFA07A' },
    'peach': { bg: '#FFDAB9', text: '#000000', border: '#FFE4B5' },
    'mint': { bg: '#98FB98', text: '#000000', border: '#90EE90' },
    'turquoise': { bg: '#40E0D0', text: '#000000', border: '#48D1CC' },
    'burgundy': { bg: '#800020', text: '#FFFFFF', border: '#A52A2A' },
    'maroon': { bg: '#800000', text: '#FFFFFF', border: '#A52A2A' },
    'olive': { bg: '#808000', text: '#FFFFFF', border: '#9B9B00' },
    'sage': { bg: '#9CAF88', text: '#000000', border: '#B5C99A' },
    'mauve': { bg: '#E0B0FF', text: '#000000', border: '#DDA0DD' },
    'plum': { bg: '#DDA0DD', text: '#000000', border: '#EE82EE' },
  };

  // Try exact match first
  if (colorMap[color]) {
    return colorMap[color];
  }

  // Try partial matches (check if color name contains any key or vice versa)
  for (const [key, value] of Object.entries(colorMap)) {
    // Check if the color name contains the key or key contains color name
    if (color.includes(key) || key.includes(color)) {
      return value;
    }
    // Also check individual words for compound colors
    const colorWords = color.split(/\s+/);
    const keyWords = key.split(/\s+/);
    if (colorWords.some(w => keyWords.includes(w)) || keyWords.some(w => colorWords.includes(w))) {
      return value;
    }
  }

  // Default fallback
  return { bg: '#FF6B35', text: '#FFFFFF', border: '#FF8C5A' };
};

/**
 * Blend hex color with a dark base for a unified page background.
 * Returns a dark tinted background so header and content match the lucky color theme.
 */
const blendWithDarkBase = (hex: string, amount: number = 0.12): string => {
  const dark = [0x07, 0x0b, 0x14];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const out = dark.map((d, i) => {
    const c = [r, g, b][i];
    const v = Math.round(d + (c - d) * amount);
    return Math.max(0, Math.min(255, v));
  });
  return `#${out.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};

export const HoroscopeResult: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<DailyHoroscopeData | null>(null);
  const [ui, setUi] = useState<any>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [openSections, setOpenSections] = useState<{
    energy: boolean;
    action: boolean;
    breathwork: boolean;
  }>({
    energy: true, // default open
    action: false,
    breathwork: false,
  });

  const toggleSection = (section: 'energy' | 'action' | 'breathwork') => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    // Get result from location state or localStorage
    const stateData = location.state as { result?: DailyHoroscopeData; firstName?: string; lastName?: string };
    
    if (stateData?.result) {
      setResult(stateData.result);
      setUi(generateDailyHoroscopeUI(stateData.result));
      setFirstName(stateData.firstName || '');
      setLastName(stateData.lastName || '');
    } else {
      const loadLatest = async () => {
        try {
          const latest = await getLatestHoroscope();
          const parsed = parseStoredHoroscope(latest);
          if (parsed) {
            setResult(parsed);
            setUi(generateDailyHoroscopeUI(parsed));
            // Try to get name from saved birth data
            try {
              const savedBirthRaw = localStorage.getItem('daily_horoscope_birth_v1');
              if (savedBirthRaw) {
                const savedBirth: any = JSON.parse(savedBirthRaw);
                setFirstName(savedBirth.firstName || '');
                setLastName(savedBirth.lastName || '');
              }
            } catch {
              // ignore
            }
          } else {
            navigate('/astrology', { replace: true });
          }
        } catch (error) {
          console.error('Failed to load latest horoscope:', error);
          navigate('/astrology', { replace: true });
        }
      };

      loadLatest();
    }
  }, [location, navigate]);

  if (!result || !ui) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-light/60">Loading your horoscope...</p>
        </div>
      </div>
    );
  }

  // Get the lucky color theme for the entire interface
  const colorTheme = getColorValue(result.lucky.color.label);
  const isLightColor = colorTheme.text === '#000000';
  const accentColor = colorTheme.bg;
  const accentColorLight = colorTheme.border;
  const accentColorOpacity = isLightColor 
    ? `${accentColor}40` 
    : `${accentColor}30`;

  // Single page background derived from horoscope lucky color (header + content match)
  const pageBackground = blendWithDarkBase(accentColor);
  const cardBackground = blendWithDarkBase(accentColor, 0.18);

  return (
    <div
      className="min-h-[100dvh] text-white flex flex-col relative font-sans overflow-y-auto"
      style={{
        paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))',
        backgroundColor: pageBackground,
      }}
    >
      {/* Background: same lucky-color-derived base + soft gradient */}
      <div className="fixed inset-0 z-0" style={{ backgroundColor: pageBackground }} />
      <div
        className="fixed inset-0 z-0 opacity-30"
        style={{
          background: `radial-gradient(circle at top, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* Header - transparent with blur */}
      <div
        className="sticky top-0 z-20 backdrop-blur-xl border-b pt-safe"
        style={{
          backgroundColor: 'transparent',
          borderColor: `${accentColor}30`,
        }}
      >
        <div className="relative z-10 px-4 pb-4">
          {/* Header Row - Back Button and Title Aligned */}
          <div className="pt-8 pb-4 flex items-center gap-4">
            <BackButton
              variant="dark"
              onClick={() => navigate('/')}
              aria-label="Back"
            />
            <div className="flex-1 flex flex-col">
              <h2 className="text-base font-black tracking-[0.2em] uppercase" style={{ color: accentColor }}>
                Your Horoscope
              </h2>
              {(firstName || lastName) && (
                <p className="text-sm text-white font-medium mt-1">
                  {firstName} {lastName}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content - Mobile Optimized */}
      <div className="relative z-10 px-4 py-8 space-y-6">
        {/* Hero Section with adaptive color */}
        <div className="text-center space-y-4 pt-2">
          <div
            className="inline-flex items-center gap-2 border rounded-full px-5 py-2.5"
            style={{ backgroundColor: cardBackground, borderColor: `${accentColor}50` }}
          >
            <Star size={18} style={{ color: accentColor }} />
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: accentColor }}>
              {result.sign.toUpperCase()} — {result.date}
            </span>
          </div>
          <div
            className="inline-flex items-center gap-2 border rounded-2xl px-4 py-3 text-xs text-white/80"
            style={{ backgroundColor: cardBackground, borderColor: `${accentColor}30` }}
          >
            You can generate one horoscope per day. Come back tomorrow after 12:01 AM for a new reading.
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {/* Your Energy Today - Default Open with adaptive color */}
          <div className="border rounded-3xl overflow-hidden" style={{ backgroundColor: cardBackground, borderColor: `${accentColor}40` }}>
            <button
              onClick={() => toggleSection('energy')}
              className="w-full px-5 py-4 flex items-center justify-between text-left touch-manipulation"
            >
              <h3 className="text-base font-bold text-white">Your Energy Today</h3>
              <ChevronDown
                size={20}
                className="transition-transform duration-300 flex-shrink-0"
                style={{
                  transform: openSections.energy ? 'rotate(180deg)' : 'rotate(0deg)',
                  color: `${accentColor}80`
                }}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openSections.energy ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-5 pb-5 space-y-6">
                {/* Theme Text */}
                <div className="text-center space-y-4 pt-2">
                  <h1 
                    className="text-3xl font-serif font-bold leading-tight px-2"
                    style={{ color: accentColor }}
                  >
                    {result.content.theme}
                  </h1>
                  <p className="text-base text-brand-light/90 leading-relaxed px-2 max-w-lg mx-auto">
                    {result.content.text}
                  </p>
                </div>

                {/* Intention & Gratitude Tiles with adaptive color accents */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Today's Intention Tile */}
                  <button
                    onClick={() => navigate('/intention', { 
                      state: { 
                        fromHoroscope: true,
                        suggestedIntention: result.content.intention || '',
                        horoscopeData: {
                          theme: result.content.theme,
                          description: result.content.text,
                          doToday: result.content.do,
                          dontToday: result.content.dont
                        }
                      } 
                    })}
                    className="border rounded-3xl p-5 space-y-3 active:scale-[0.98] transition-transform touch-manipulation text-left"
                    style={{ backgroundColor: pageBackground, borderColor: `${accentColor}30` }}
                  >
                    <div className="flex items-center gap-2" style={{ color: accentColor }}>
                      <Target size={20} />
                      <span className="uppercase tracking-[0.2em] text-[10px] font-bold">Intention</span>
                    </div>
                    <p className="text-sm text-white/90 leading-tight">Let Abhi suggest an intention for you</p>
                  </button>

                  {/* Today's Gratitude Tile */}
                  <button
                    onClick={() => navigate('/gratitude', { 
                      state: { 
                        fromHoroscope: true,
                        suggestedGratitude: result.content.gratitude || ''
                      } 
                    })}
                    className="border rounded-3xl p-5 space-y-3 active:scale-[0.98] transition-transform touch-manipulation text-left"
                    style={{ backgroundColor: pageBackground, borderColor: `${accentColor}30` }}
                  >
                    <div className="flex items-center gap-2" style={{ color: accentColor }}>
                      <Heart size={20} />
                      <span className="uppercase tracking-[0.2em] text-[10px] font-bold">Gratitude</span>
                    </div>
                    <p className="text-sm text-white/90 leading-tight">Let Abhi guide your reflection today</p>
                  </button>
                </div>

                {/* Lucky Info - Colored by Lucky Color - Zen Style */}
                {(() => {
                  const colorStyle = getColorValue(result.lucky.color.label);
                  const isLightColor = colorStyle.text === '#000000';
                  
                  return (
                    <div
                      className="rounded-3xl p-6 shadow-lg"
                      style={{
                        backgroundColor: colorStyle.bg,
                        border: `2px solid ${colorStyle.border}`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p
                            className="text-[10px] uppercase tracking-[0.2em] mb-2"
                            style={{ color: isLightColor ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}
                          >
                            Lucky Color
                          </p>
                          <p
                            className="text-lg font-semibold"
                            style={{ color: colorStyle.text }}
                          >
                            {result.lucky.color.label}
                          </p>
                        </div>
                        <div className="flex-1 text-right">
                          <p
                            className="text-[10px] uppercase tracking-[0.2em] mb-2"
                            style={{ color: isLightColor ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}
                          >
                            Lucky Number
                          </p>
                          <p
                            className="text-lg font-bold"
                            style={{ color: colorStyle.text }}
                          >
                            {reduceToSingleDigit(result.lucky.number)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Action Guide - Default Closed with adaptive color */}
          <div className="border rounded-3xl overflow-hidden" style={{ backgroundColor: cardBackground, borderColor: `${accentColor}40` }}>
            <button
              onClick={() => toggleSection('action')}
              className="w-full px-5 py-4 flex items-center justify-between text-left touch-manipulation"
            >
              <h3 className="text-base font-bold text-white">Action Guide</h3>
              <ChevronDown
                size={20}
                className="transition-transform duration-300 flex-shrink-0"
                style={{
                  transform: openSections.action ? 'rotate(180deg)' : 'rotate(0deg)',
                  color: `${accentColor}80`
                }}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openSections.action ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-5 pb-5 space-y-4 pt-2">
                <div className="border rounded-3xl p-5 space-y-4" style={{ backgroundColor: pageBackground, borderColor: `${accentColor}60` }}>
                  <p className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 font-bold" style={{ color: accentColor }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                    Do Today
                  </p>
                  <ul className="space-y-3 text-sm text-white/90 leading-relaxed">
                    {result.content.do.map((item, idx) => (
                      <li key={idx} className="flex gap-3 items-start">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${accentColor}80` }} />
                        <span className="flex-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border rounded-3xl p-5 space-y-4" style={{ backgroundColor: pageBackground, borderColor: `${accentColor}40` }}>
                  <p className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 font-bold" style={{ color: `${accentColor}CC` }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `${accentColor}CC` }} />
                    Don&apos;t Today
                  </p>
                  <ul className="space-y-3 text-sm text-white/90 leading-relaxed">
                    {result.content.dont.map((item, idx) => (
                      <li key={idx} className="flex gap-3 items-start">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${accentColor}60` }} />
                        <span className="flex-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Breathwork Practice - Default Closed with adaptive color */}
          {ui?.breathing?.recommended && ui.breathing.recommended.length > 0 && (
            <div className="border rounded-3xl overflow-hidden" style={{ backgroundColor: cardBackground, borderColor: `${accentColor}40` }}>
              <button
                onClick={() => toggleSection('breathwork')}
                className="w-full px-5 py-4 flex items-center justify-between text-left touch-manipulation"
              >
                <h3 className="text-base font-bold text-white">Breathwork Practice</h3>
                <ChevronDown
                  size={20}
                  className="transition-transform duration-300 flex-shrink-0"
                  style={{
                    transform: openSections.breathwork ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: `${accentColor}80`
                  }}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openSections.breathwork ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-5 pb-5 space-y-4 pt-2">
                  <div className="flex items-center gap-3 px-2">
                    <div 
                      className="w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: `${accentColor}20`,
                        borderColor: `${accentColor}40`
                      }}
                    >
                      <Wind size={22} style={{ color: accentColor }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] uppercase tracking-[0.2em] font-bold mb-1" style={{ color: accentColor }}>
                        Breathwork for Today
                      </p>
                      <p className="text-sm text-white/70 leading-relaxed">{ui.breathing.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {ui.breathing.recommended.map((breath: any, idx: number) => (
                      <div
                        key={idx}
                        className="border rounded-3xl p-5 space-y-4 active:scale-[0.98] transition-transform touch-manipulation"
                        style={{ backgroundColor: pageBackground, borderColor: `${accentColor}30` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-base font-semibold text-white mb-1">{breath.name}</p>
                            <p className="text-xs text-brand-light/70 mb-2">{breath.pattern}</p>
                            <p className="text-xs text-white/60">{breath.bestFor}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold whitespace-nowrap" style={{ color: accentColor }}>
                            {breath.durationHint}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">{breath.howTo}</p>
                        <button
                          type="button"
                          onClick={() => navigate(breath.deepLink)}
                          className="w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-[0.18em] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform touch-manipulation shadow-lg"
                          style={{ 
                            backgroundColor: accentColor,
                            color: colorTheme.text
                          }}
                        >
                          <Play size={16} className="fill-current" />
                          Start This Breath
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Spacing */}
        <div className="h-8"></div>
      </div>

    </div>
  );
};
