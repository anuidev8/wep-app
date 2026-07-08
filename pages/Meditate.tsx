
import React, { useState, useEffect, useMemo } from 'react';
import { Play, Headphones, Sun, Moon, Music, Circle, Lock, Award, Mic, Sparkles, Flame, Star, Wind, Search, Map, ArrowLeft, ChevronRight, Compass, Zap, Activity, Heart, Clock, User, X } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CHAKRAS, GUIDED_SESSIONS, MANTRAS, PODCASTS, SHIVA_TRACKS } from '../constants';
import { useApp } from '../context/AppContext';
import { AudioTrack, MusicTrack } from '../types';
import { getChakraIdFromSlug, ChakraMusicTrack } from '../services/chakraMantraService';
import { useGuidedMeditation } from '../hooks/useGuidedMeditation';
import { useChakraMusic } from '../hooks/useChakraMusic';
import { getStoredAuth } from '../services/authService';
import { ZenLoadingScreen } from '../components/ZenLoadingScreen';
import { useMinimumDisplayTime } from '../hooks/useMinimumDisplayTime';
import { triggerHaptic } from '../utils/hapticFeedback';
import { GuidedMeditationThumbnail } from '../components/MeditationThumbnails';
import { readRecentlyPlayedGuidedMeditations } from '../utils/recentGuidedMeditations';

/** Subtle chakra colors for card accents (Root→Crown) */
const CHAKRA_ACCENT_COLORS = [
  '#EF4444', /* root */
  '#F97316', /* sacral */
  '#EAB308', /* solar */
  '#22C55E', /* heart */
  '#3B82F6', /* throat */
  '#6366F1', /* third eye */
  '#A855F7', /* crown */
];

const SectionDivider = () => (
    <div className="flex items-center gap-4 py-8 opacity-20">
        <div className="flex-1 h-px bg-brand-medium"></div>
        <div className="text-xl font-serif">ॐ</div>
        <div className="flex-1 h-px bg-brand-medium"></div>
    </div>
);

// Chakra background colors for subtle card backgrounds (same as Courses and Mantra pages)
const getChakraBgColor = (index: number): { light: string; dark: string } => {
  const chakraColors = [
    { light: 'rgba(220, 38, 38, 0.08)', dark: 'rgba(220, 38, 38, 0.12)' },   // Root - Red
    { light: 'rgba(234, 88, 12, 0.08)', dark: 'rgba(234, 88, 12, 0.12)' },   // Sacral - Orange
    { light: 'rgba(234, 179, 8, 0.08)', dark: 'rgba(234, 179, 8, 0.12)' },   // Solar Plexus - Yellow
    { light: 'rgba(22, 163, 74, 0.08)', dark: 'rgba(22, 163, 74, 0.12)' },   // Heart - Green
    { light: 'rgba(37, 99, 235, 0.08)', dark: 'rgba(37, 99, 235, 0.12)' },   // Throat - Blue
    { light: 'rgba(79, 70, 229, 0.08)', dark: 'rgba(79, 70, 229, 0.12)' },   // Third Eye - Indigo
    { light: 'rgba(147, 51, 234, 0.08)', dark: 'rgba(147, 51, 234, 0.12)' },  // Crown - Violet
  ];
  return chakraColors[index % chakraColors.length];
};

// Get track duration from API or recently played
const getTrackDuration = (track: MusicTrack, recentEntries: { id: string; durationSeconds?: number }[]): number | null => {
  if (track.duration && track.duration > 0) return track.duration;
  const entry = recentEntries.find(e => e.id === track._id);
  return (entry?.durationSeconds && entry.durationSeconds > 0) ? entry.durationSeconds : null;
};

// Shimmer skeleton component for loading state (guided uses sanctuary styling when in guided tab)
const CardSkeleton = ({ useSanctuary = false }: { useSanctuary?: boolean }) => (
  <div className={`p-4 rounded-[21px] overflow-hidden shimmer ${useSanctuary ? 'meditation-card' : 'bg-white dark:bg-brand-darkSurface border border-brand-light/50 dark:border-brand-darkBorder/50 card-standard'}`}>
    <div className="flex items-center gap-4">
      <div className={`w-14 h-14 rounded-[18px] shrink-0 ${useSanctuary ? 'meditation-icon' : 'bg-brand-light/50 dark:bg-white/5'}`}></div>
      <div className="flex-1 space-y-2">
        <div className={`rounded w-3/4 h-4 ${useSanctuary ? 'bg-brand-gold/20' : 'bg-brand-light/50 dark:bg-white/5'}`}></div>
        <div className={`rounded w-1/2 h-3 ${useSanctuary ? 'bg-brand-gold/15' : 'bg-brand-light/30 dark:bg-white/3'}`}></div>
      </div>
      <div className={`w-10 h-10 rounded-full shrink-0 ${useSanctuary ? 'bg-brand-gold/15' : 'bg-brand-light/50 dark:bg-white/5'}`}></div>
    </div>
  </div>
);

interface MeditateProps {
  /** When set, only this tab is shown and tab switcher is hidden (for /guided-explorer, /chakra-explorer). */
  forcedTab?: 'guided' | 'chakra' | 'wisdom';
}

export const Meditate: React.FC<MeditateProps> = ({ forcedTab }) => {
  const navigate = useNavigate();
  const { heartedGuidedIds, toggleHeartGuided } = useApp();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'guided' | 'chakra' | 'wisdom'>(forcedTab || 'guided');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch guided meditation data from API
  const { data: guidedData, loading: guidedLoading, error: guidedError } = useGuidedMeditation();
  const isUserPremium = guidedData?.isPremium || false;

  // Fetch chakra music from API (null = all chakras)
  const { mantras: chakraMantras, isUserPremium: isChakraUserPremium, loading: chakraLoading, error: chakraError } = useChakraMusic(null);
  
  // Ensure loading screens display for minimum 300ms
  const shouldShowGuidedLoading = useMinimumDisplayTime(guidedLoading, 300);
  const shouldShowChakraLoading = useMinimumDisplayTime(chakraLoading, 300);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'mantra') {
        navigate('/mantra-explorer', { replace: true });
        return;
    }
    if (tab === 'guided' && !forcedTab) {
        navigate('/guided-explorer', { replace: true });
        return;
    }
    if (tab === 'sleep') {
        // Redirect to new sleep music page
        navigate('/sleep-music', { replace: true });
        return;
    }
    if (tab && ['guided', 'chakra', 'wisdom'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams, navigate, forcedTab]);

  const startTrack = (id: string, type: string, audioUrl?: string, visualUrl?: string) => {
    const params = new URLSearchParams({ track: id, type });
    if (audioUrl) params.set('audioUrl', audioUrl);
    if (visualUrl) params.set('visualUrl', visualUrl);
    navigate(`/player?${params.toString()}`);
  };

  // Use API data for guided meditations
  const GUIDED_LIST = useMemo(() => {
    if (!guidedData?.musicList) return [];
    
    let list = [...guidedData.musicList];
    
    // Filter by search query
    if (searchQuery) {
      list = list.filter(track => 
        track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.categories?.some(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        track.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort: free items first, then premium
    return list.sort((a, b) => {
      if (a.isPremium === b.isPremium) return 0;
      return a.isPremium ? 1 : -1;
    });
  }, [guidedData, searchQuery]);

  const LATEST_RELEASE = useMemo(() => {
    if (!GUIDED_LIST.length) return null;
    // Get the most recently created item
    return [...GUIDED_LIST].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    })[0];
  }, [GUIDED_LIST]);

  const [authData, setAuthData] = useState<{ userId?: string; email?: string } | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      const auth = await getStoredAuth();
      setAuthData(auth);
    };
    loadAuth();
  }, []);

  const HEARTED_LIST = useMemo(() => {
    return GUIDED_LIST.filter(track => {
      // Check API favorites array (contains user IDs)
      if (authData?.userId && track.favorites?.includes(authData.userId)) {
        return true;
      }
      // Fallback to local heartedGuidedIds
      return heartedGuidedIds.includes(track._id);
    });
  }, [GUIDED_LIST, heartedGuidedIds, authData]);

  // Recently played guided meditations
  const [recentlyPlayedEntries, setRecentlyPlayedEntries] = useState<ReturnType<typeof readRecentlyPlayedGuidedMeditations>>([]);
  
  useEffect(() => {
    const recentEntries = readRecentlyPlayedGuidedMeditations();
    setRecentlyPlayedEntries(recentEntries);
  }, []);

  const recentlyPlayedTracks = useMemo(() => {
    return recentlyPlayedEntries
      .map(entry => {
        const track = GUIDED_LIST.find(t => t._id === entry.id);
        return track ? { track, entry } : null;
      })
      .filter((item): item is { track: MusicTrack; entry: ReturnType<typeof readRecentlyPlayedGuidedMeditations>[0] } => !!item)
      .slice(0, 3);
  }, [recentlyPlayedEntries, GUIDED_LIST]);

  const renderLatestReleaseCard = (track: MusicTrack) => {
      const isHearted = (authData?.userId && track.favorites?.includes(authData.userId)) 
        || heartedGuidedIds.includes(track._id);
      const isItemPremium = track.isPremium;
      const canAccess = isUserPremium || !isItemPremium;
      const isLocked = isItemPremium && !isUserPremium;
      
      const handleClick = () => {
        if (canAccess) {
          startTrack(track._id, 'GUIDED', track.audioFilename);
        } else {
          navigate('/subscription');
        }
      };
      
      return (
        <div
        className={`relative rounded-[21px] overflow-hidden`}
        >
          <div 
            onClick={handleClick}
            className="group relative overflow-hidden featured-meditation cursor-pointer active:scale-[0.97] active:opacity-95 transition-all duration-150 ease-out sm:hover:-translate-y-0.5 animate-guided-card"
            style={{ animationDelay: '0.04s' }}
          >
            <div className="relative p-4 flex items-center gap-3">
                {/* Left: Play Button - unified taupe */}
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform meditation-icon shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                    <Play size={20} fill="currentColor" className="ml-0.5 play-icon" />
                </div>
                
                {/* Center: Title & Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <User size={10} className="meditation-meta" />
                        <span className="meditation-meta text-[10px] font-bold uppercase tracking-wider">Abhi</span>
                    </div>
                    <h3 className="meditation-title text-lg leading-tight font-serif mb-1.5">{track.name}</h3>
                    <div className="flex flex-wrap gap-1.5 items-center">
                        {track.categories?.slice(0, 2).map(cat => (
                            <span key={cat._id} className="badge-text text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">{cat.name}</span>
                        ))}
                        {(() => {
                          const dur = getTrackDuration(track, recentlyPlayedEntries);
                          return dur ? (
                            <span className="text-[10px] text-brand-primary/70 dark:text-brand-gold/80 flex items-center gap-1">
                              <Clock size={10} /> {Math.round(dur / 60)} min
                            </span>
                          ) : null;
                        })()}
                    </div>
                </div>
                
                {/* Right: Heart / Lock */}
                <div className="relative w-16 h-16 shrink-0">
                    <div className="absolute inset-0 rounded-full bg-brand-gold/10 dark:bg-white/10 border border-brand-gold/20 dark:border-white/10 flex flex-col items-center justify-center gap-1.5">
                        {!isLocked && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleHeartGuided(track._id); }}
                                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <Heart size={12} className={`transition-all ${isHearted ? 'fill-brand-gold text-brand-gold' : 'text-brand-dark/50 dark:text-brand-darkTextMuted'}`} />
                            </button>
                        )}
                        {isLocked && (
                            <Lock size={12} className="text-brand-dark/60 dark:text-brand-darkTextMuted" />
                        )}
                    </div>
                </div>
            </div>
            
            {/* Lock Overlay */}
            {isLocked && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-[2px] rounded-[21px] flex items-center justify-center z-20">
                    <div className="flex items-center gap-2 bg-white/90 dark:bg-brand-darkSurface/90 px-3 py-1.5 rounded-xl border border-brand-dark/10">
                        <Lock size={14} className="text-brand-dark dark:text-white" />
                        <span className="text-xs font-bold text-brand-dark dark:text-white">Premium</span>
                    </div>
                </div>
            )}
          </div>
        </div>
      );
  };

  const renderFeaturedCard = (session: AudioTrack) => {
      const isHearted = heartedGuidedIds.includes(session.id);
      const duration = Math.floor(session.duration / 60);
      const chakraBgColors = getChakraBgColor(0); // Use first chakra color (red) for featured card
      
      return (
        <div 
            onClick={() => startTrack(session.id, 'GUIDED')}
            className="group relative bg-white dark:bg-brand-darkSurface card-standard p-5 transition-all duration-150 ease-out cursor-pointer active:scale-[0.97] active:opacity-95 overflow-hidden animate-guided-card"
            style={{ animationDelay: '0.08s' }}
        >
            {/* Subtle chakra-colored background overlay */}
            <div 
                className="absolute inset-0 rounded-[21px] pointer-events-none transition-opacity duration-300"
                style={{
                    backgroundColor: chakraBgColors.light,
                }}
            ></div>
            <div 
                className="absolute inset-0 rounded-[21px] pointer-events-none dark:opacity-100 opacity-0 transition-opacity duration-300"
                style={{
                    backgroundColor: chakraBgColors.dark,
                }}
            ></div>
            
            {/* Background Circular Shape */}
            <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full ${session.color || 'bg-brand-sunset'} opacity-20 blur-2xl`}></div>
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${session.color || 'bg-brand-sunset'} opacity-10`}></div>
            
            <div className="relative flex items-start gap-4">
                {/* Left: Play Button */}
                <div className={`w-16 h-16 ${session.color || 'bg-brand-sunset'} rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-105 transition-transform`}>
                    <Play size={24} fill="currentColor" className="ml-1" />
                </div>
                
                {/* Center: Title & Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-2">
                        <User size={12} className="text-brand-medium dark:text-brand-darkTextMuted" />
                        <span className="text-xs font-bold text-brand-medium dark:text-brand-darkTextMuted uppercase tracking-wider">{session.teacher || 'Abhi'}</span>
                    </div>
                    <h3 className="font-bold text-brand-dark dark:text-white text-xl leading-tight font-serif mb-3">{session.title}</h3>
                    <div className="flex flex-wrap gap-1.5">
                        {session.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-brand-light dark:bg-white/10 text-brand-medium dark:text-brand-darkTextMuted px-2.5 py-1 rounded-full font-bold uppercase tracking-tight border border-brand-light/50 dark:border-white/10">{tag}</span>
                        ))}
                    </div>
                </div>
                
                {/* Right: Circular Shape with Heart & Duration */}
                <div className="relative w-20 h-20 shrink-0">
                    <div className={`absolute inset-0 rounded-full ${session.color || 'bg-brand-sunset'} opacity-10 flex flex-col items-center justify-center gap-2`}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleHeartGuided(session.id); }}
                            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <Heart size={14} className={`transition-all ${isHearted ? 'fill-brand-coral text-brand-coral' : 'text-brand-medium/40 dark:text-brand-darkTextMuted'}`} />
                        </button>
                        <div className="flex items-center gap-1 bg-brand-light/50 dark:bg-white/5 px-1.5 py-0.5 rounded-lg">
                            <Clock size={9} className="text-brand-medium/60 dark:text-brand-darkTextMuted" />
                            <span className="text-[9px] text-brand-medium dark:text-brand-darkTextMuted font-bold">{duration}m</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderGuidedCard = (track: MusicTrack, index: number, isHero = false) => {
      const isItemPremium = track.isPremium;
      const canAccess = isUserPremium || !isItemPremium;
      const isLocked = isItemPremium && !isUserPremium;
      const isHearted = (authData?.userId && track.favorites?.includes(authData.userId)) 
        || heartedGuidedIds.includes(track._id);
      
      const handleClick = () => {
        if (canAccess) {
          startTrack(track._id, 'GUIDED', track.audioFilename);
        } else {
          navigate('/subscription');
        }
      };
      
      // Get chakra background colors for this tile
      const chakraBgColors = getChakraBgColor(index);
      
      return (
        <div 
            key={track._id} 
            onClick={handleClick}
            className={`group relative meditation-card p-4 flex items-center justify-between active:scale-[0.97] active:opacity-95 transition-all duration-300 ease-out cursor-pointer overflow-hidden animate-guided-card ${isHero ? 'ring-1 ring-brand-gold/30' : ''} ${isLocked ? 'opacity-80' : ''}`}
            style={{ animationDelay: `${index * 0.08}s` }}
        >
            {/* Chakra-colored background overlay */}
            <div 
                className="absolute inset-0 rounded-[21px] pointer-events-none transition-opacity duration-300"
                style={{
                    backgroundColor: chakraBgColors.light,
                }}
            ></div>
            <div 
                className="absolute inset-0 rounded-[21px] pointer-events-none dark:opacity-100 opacity-0 transition-opacity duration-300"
                style={{
                    backgroundColor: chakraBgColors.dark,
                }}
            ></div>
            
            {/* Subtle left accent - chakra color by index */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[24px] z-10"
              style={{
                background: CHAKRA_ACCENT_COLORS[index % 7],
                opacity: 0.6,
              }}
            />
            
            <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0 pl-1">
                {/* Left: Unified Thumbnail with Play Button */}
                <div className="relative w-14 h-14 rounded-[18px] overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <GuidedMeditationThumbnail 
                        name={track.name}
                        index={index}
                        size={56}
                        useSanctuaryTheme={true}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Play size={20} fill="currentColor" className="ml-0.5 animate-play-pulse play-icon" />
                    </div>
                </div>
                
                {/* Center: Title & Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
<User size={10} className="meditation-meta transition-colors duration-300 group-hover:text-brand-primary/70 dark:group-hover:text-brand-gold/70" />
                                        <span className="meditation-meta text-[13px] font-medium transition-colors duration-300 group-hover:text-brand-primary/70 dark:group-hover:text-brand-gold/70" style={{ opacity: 0.6 }}>Abhi</span>
                    </div>
                    <h3 className="meditation-title text-base group-hover:text-brand-primary/80 dark:group-hover:text-brand-gold transition-all duration-300 mb-1.5 line-clamp-1" style={{ fontSize: '16px' }}>{track.name}</h3>
                    <div className="flex flex-wrap gap-1.5 items-center">
                        {track.categories?.slice(0, 2).map((cat) => (
                            <span 
                              key={cat._id} 
                              className="badge-text text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-tight transition-all duration-300"
                            >
                              {cat.name}
                            </span>
                        ))}
                        {(() => {
                          const dur = getTrackDuration(track, recentlyPlayedEntries);
                          return dur ? (
                            <span className="text-[10px] text-brand-primary/70 dark:text-brand-gold/80 flex items-center gap-1">
                              <Clock size={10} /> {Math.round(dur / 60)} min
                            </span>
                          ) : null;
                        })()}
                    </div>
                </div>
            </div>
            
            {/* Right: Heart & Lock */}
            <div className="flex items-center gap-2 relative z-10 shrink-0">
                {!isLocked && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleHeartGuided(track._id); }}
                        className="p-2.5 rounded-full hover:bg-brand-gold/10 active:bg-brand-gold/15 transition-all duration-300 group/heart relative"
                    >
                        <Heart 
                            size={22} 
                            className={`transition-all duration-500 ease-out ${
                                isHearted 
                                ? 'fill-brand-gold text-brand-gold scale-110' 
                                : 'text-brand-medium/30 group-hover/heart:text-brand-gold/70 group-hover/heart:scale-105'
                            }`}
                            style={{
                                filter: isHearted ? 'drop-shadow(0 0 8px rgba(212, 165, 116, 0.6))' : 'none',
                                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                        />
                        {isHearted && (
                            <div className="absolute inset-0 rounded-full bg-brand-gold/10 animate-pulse-slow" style={{ animationDuration: '2s' }}></div>
                        )}
                    </button>
                )}
                
                {isLocked && (
                    <div className="w-8 h-8 rounded-full bg-brand-gold/15 flex items-center justify-center transition-all duration-300 group-hover:bg-brand-gold/25">
                        <Lock size={14} className="text-brand-primary/70 dark:text-brand-gold" />
                    </div>
                )}
            </div>
            
            {/* Lock Overlay */}
            {isLocked && (
                <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-[2px] rounded-[21px] flex items-center justify-center z-20">
                    <div className="flex items-center gap-2 bg-white/90 dark:bg-brand-darkSurface/90 px-3 py-1.5 rounded-xl border border-brand-dark/10">
                        <Lock size={14} className="text-brand-dark dark:text-white" />
                        <span className="text-xs font-bold text-brand-dark dark:text-white">Premium</span>
                    </div>
                </div>
            )}
        </div>
      );
  };

  // Loading state - return early with full screen for Guided Tab
  if (activeTab === 'guided' && shouldShowGuidedLoading) {
    return (
      <ZenLoadingScreen 
        fullScreen={true}
        messages={[
          "Preparing your sacred space...",
          "Connecting to inner stillness...",
          "Awakening the breath...",
          "Entering the present moment...",
        ]}
      />
    );
  }

  // Loading state - return early with full screen for Chakra Tab
  if (activeTab === 'chakra' && shouldShowChakraLoading) {
    return (
      <ZenLoadingScreen 
        fullScreen={true} 
        messages={[
          "Preparing your sacred space...",
          "Connecting to healing frequencies...",
          "Aligning your energy centers...",
        ]}
      />
    );
  }

  return (
    <div className={`min-h-screen pb-28 transition-colors duration-300 relative overflow-hidden ${activeTab === 'guided' ? 'guided-sanctuary-bg' : 'bg-brand-cream dark:bg-brand-darkBase'}`}>
      
      {/* Ambient Background Animations - softer taupe/cream for Guided tab */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {activeTab === 'guided' ? (
            <>
              <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-[#e8ddd6]/35 dark:bg-[#e3d8d5]/5 rounded-full blur-[100px] animate-float" style={{ animationDuration: '20s' }}></div>
              <div className="absolute top-[40%] right-[-20%] w-[400px] h-[400px] bg-[#D4A574]/12 dark:bg-[#D4A574]/5 rounded-full blur-[90px] animate-float" style={{ animationDuration: '15s', animationDelay: '2s' }}></div>
              <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-[#c9bab6]/22 dark:bg-[#c9bab6]/5 rounded-full blur-[110px] animate-pulse-slow"></div>
              <div className="absolute top-[60%] left-[10%] w-[350px] h-[350px] bg-[#D4A574]/8 dark:bg-[#D4A574]/3 rounded-full blur-[80px] animate-float" style={{ animationDuration: '18s', animationDelay: '1s' }}></div>
            </>
          ) : (
            <>
              <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-brand-sage/10 dark:bg-brand-sage/5 rounded-full blur-[80px] animate-float" style={{ animationDuration: '20s' }}></div>
              <div className="absolute top-[40%] right-[-20%] w-[400px] h-[400px] bg-brand-lavender/10 dark:bg-brand-lavender/5 rounded-full blur-[80px] animate-float" style={{ animationDuration: '15s', animationDelay: '2s' }}></div>
              <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-brand-primary/5 dark:bg-brand-gold/5 rounded-full blur-[100px] animate-pulse-slow"></div>
              <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-teal-400/8 dark:bg-teal-400/4 rounded-full blur-[100px] animate-pulse-slow"></div>
              <div className="absolute top-[30%] right-0 w-[400px] h-[400px] bg-cyan-400/6 dark:bg-cyan-400/3 rounded-full blur-[90px] animate-float" style={{ animationDuration: '18s', animationDelay: '1s' }}></div>
              <div className="absolute bottom-[20%] left-[30%] w-[450px] h-[450px] bg-blue-400/7 dark:bg-blue-400/3 rounded-full blur-[95px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </>
          )}
      </div>

      {/* Header with Back Button for Guided tab - luxury zen */}
      {activeTab === 'guided' && (
        <div className="bg-[#F8F5F1]/95 dark:bg-brand-darkBase/95 backdrop-blur-xl p-6 pt-12 pb-4 sticky top-0 z-30 transition-colors duration-300 border-b border-[rgba(212,165,116,0.15)] dark:border-brand-darkBorder">
          <div className="flex items-center gap-4">
            <BackButton
              variant="adaptive"
              onClick={() => navigate('/')}
            />
            <div className="flex-1">
              <h1 className="page-title text-xl font-serif">
                Guided Meditations
              </h1>
              <p className="subtitle text-[10px] dark:text-brand-darkTextMuted tracking-[0.2em]">
                Find your inner stillness
              </p>
            </div>
            {activeTab === 'guided' && searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-bold text-brand-primary uppercase tracking-widest border border-brand-light/50 px-3 py-1 rounded-full bg-brand-light/20 dark:bg-brand-darkSurface"
              >
                Reset
              </button>
            )}
          </div>
          
          {/* Search Bar - Only for Guided Meditations */}
          {activeTab === 'guided' && (
            <div className="relative group mt-4">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="text-brand-medium/50 group-focus-within:text-brand-gold transition-colors" size={18} />
              </div>
              <input 
                type="text"
                placeholder="Search by title, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="guided-search-input w-full bg-white/98 dark:bg-brand-darkSurface rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 dark:text-white border border-[rgba(212,165,116,0.2)] dark:border-brand-darkBorder transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center">
                  <X size={16} className="text-brand-medium/40" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`${activeTab === 'guided' ? 'px-5 sm:px-6 py-6 pt-4' : 'p-6 pt-12'} space-y-8 animate-fade-in relative z-10`}>
          {/* GUIDED TAB - REDESIGNED */}
          {activeTab === 'guided' && (
            <div className="space-y-6 guided-content-wrap">

                {/* Error State */}
                {guidedError && !guidedLoading && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[21px] p-6 text-center card-standard">
                        <p className="text-red-600 dark:text-red-400 text-sm mb-2">Failed to load guided meditations</p>
                        <p className="text-red-500 dark:text-red-500/70 text-xs">{guidedError.message}</p>
                    </div>
                )}

                {/* Content */}
                {!guidedLoading && !guidedError && (
                    <>
                        {/* Recently Played Section */}
                        {recentlyPlayedTracks.length > 0 && !searchQuery && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-xs font-bold text-brand-primary/70 dark:text-brand-gold/80 uppercase tracking-[0.25em] flex items-center gap-2">
                                        <Clock size={12} className="text-brand-gold/70 dark:text-brand-gold" /> Recently Played
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {recentlyPlayedTracks.map(({ track, entry }, idx) => {
                                        const isItemPremium = track.isPremium;
                                        const canAccess = isUserPremium || !isItemPremium;
                                        const isLocked = isItemPremium && !isUserPremium;
                                        const chakraBgColors = getChakraBgColor(idx);
                                        const durationMinutes = entry.durationSeconds ? Math.round(entry.durationSeconds / 60) : null;
                                        
                                        return (
                                            <div
                                                key={`recent-${track._id}`}
                                                onClick={() => canAccess ? startTrack(track._id, 'GUIDED', track.audioFilename) : navigate('/subscription')}
                                                className={`group relative meditation-card p-4 rounded-[21px] flex items-center justify-between active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out cursor-pointer overflow-hidden ${isLocked ? 'opacity-80' : ''}`}
                                            >
                                                {/* Chakra-colored background overlay */}
                                                <div
                                                    className="absolute inset-0 rounded-[21px] pointer-events-none transition-opacity duration-300"
                                                    style={{ backgroundColor: chakraBgColors.light }}
                                                />
                                                <div
                                                    className="absolute inset-0 rounded-[21px] pointer-events-none dark:opacity-100 opacity-0 transition-opacity duration-300"
                                                    style={{ backgroundColor: chakraBgColors.dark }}
                                                />
                                                
                                                <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0">
                                                    {/* Left: Play Button with chakra color */}
                                                    <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all shrink-0`} style={{ backgroundColor: CHAKRA_ACCENT_COLORS[idx % 7] }}>
                                                        <Play size={20} fill="currentColor" className="ml-0.5" />
                                                    </div>
                                                    
                                                    {/* Center: Title & Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="meditation-title text-sm font-bold dark:text-white group-hover:text-brand-primary/80 dark:group-hover:text-brand-gold transition-colors line-clamp-1">
                                                            {track.name}
                                                        </h4>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            {track.categories?.[0] && (
                                                                <span className="badge-text text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-tight">
                                                                    {track.categories[0].name}
                                                                </span>
                                                            )}
                                                            {durationMinutes && (
                                                                <span className="text-[10px] text-brand-medium/40 dark:text-brand-darkTextMuted/60 flex items-center gap-1">
                                                                    <Clock size={10} /> {durationMinutes} min
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {isLocked && (
                                                    <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-[2px] rounded-[21px] flex items-center justify-center z-20">
                                                        <div className="flex items-center gap-2 bg-white/90 dark:bg-brand-darkSurface/90 px-3 py-1.5 rounded-xl border border-brand-dark/10">
                                                            <Lock size={14} className="text-brand-dark dark:text-white" />
                                                            <span className="text-xs font-bold text-brand-dark dark:text-white">Premium</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 1. Latest Release Spotlight */}
                        {LATEST_RELEASE && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 px-1">
                                    <Sparkles size={12} className="text-brand-gold dark:text-brand-gold animate-pulse" />
                                    <h2 className="text-[9px] font-black text-brand-primary/70 dark:text-brand-gold/90 uppercase tracking-[0.2em]">Latest Release</h2>
                                </div>
                                {renderLatestReleaseCard(LATEST_RELEASE)}
                            </div>
                        )}

                        {/* 2. Favorites Horizontal Section */}
                        {HEARTED_LIST.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 px-1">
                                    <Heart size={12} className="text-brand-gold dark:text-brand-coral fill-brand-gold/60 dark:fill-brand-coral animate-pulse-slow" />
                                    <h2 className="text-[9px] font-black text-brand-primary/70 dark:text-brand-gold/90 uppercase tracking-[0.2em]">Your Sacred Gems</h2>
                                </div>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 pb-4">
                                    {HEARTED_LIST.map((track, favIndex) => {
                                        const isItemPremium = track.isPremium;
                                        const canAccess = isUserPremium || !isItemPremium;
                                        
                                        return (
                                            <div 
                                                key={track._id}
                                                onClick={() => canAccess ? startTrack(track._id, 'GUIDED', track.audioFilename) : navigate('/subscription')}
                                                className="shrink-0 w-40 meditation-card p-4 relative group active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out"
                                            >
                                                <div className="relative w-12 h-12 rounded-2xl overflow-hidden mb-3 shadow-lg group-hover:scale-110 transition-transform">
                                                    <GuidedMeditationThumbnail 
                                                        name={track.name}
                                                        index={favIndex}
                                                        size={48}
                                                        useSanctuaryTheme={true}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Play size={18} fill="white" className="text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 mb-1">
                                                    <User size={9} className="meditation-meta" />
                                                    <span className="meditation-meta text-[9px] font-bold uppercase tracking-wider">Abhi</span>
                                                </div>
                                                <h4 className="meditation-title text-xs line-clamp-1 mb-1.5">{track.name}</h4>
                                                <div className="flex flex-wrap gap-1 items-center mb-2">
                                                    {track.categories?.slice(0, 2).map(cat => (
                                                        <span key={cat._id} className="badge-text text-[8px] px-1.5 py-0.5 rounded-full font-medium uppercase">{cat.name}</span>
                                                    ))}
                                                    {(() => {
                                                      const dur = getTrackDuration(track, recentlyPlayedEntries);
                                                      return dur ? (
                                                        <span className="text-[9px] text-brand-primary/70 dark:text-brand-gold/80">{Math.round(dur / 60)} min</span>
                                                      ) : null;
                                                    })()}
                                                </div>
                                                {isItemPremium && !isUserPremium && (
                                                    <div className="flex items-center gap-1 text-[9px] text-brand-gold">
                                                        <Lock size={8} />
                                                        <span>Premium</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Decorative divider - luxury gold accent */}
                        <div className="flex items-center gap-4 py-2 opacity-50">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent"></div>
                            <span className="text-brand-gold/70 text-lg font-serif">ॐ</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent"></div>
                        </div>

                        {/* 3. Main Content List */}
                        <div className="space-y-4 pb-12">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xs font-black text-brand-primary/80 dark:text-brand-gold/90 uppercase tracking-[0.2em]">
                                    Guided Meditations Full Library
                                </h2>
                                {GUIDED_LIST.length === 0 && !guidedLoading && (
                                    <div className="text-[10px] text-brand-medium/40 italic">Coming soon...</div>
                                )}
                            </div>
                            
                            {guidedLoading ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <CardSkeleton key={i} useSanctuary />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {GUIDED_LIST.map((track, index) => {
                                        // Don't duplicate the latest release in the list
                                        if (LATEST_RELEASE && track._id === LATEST_RELEASE._id) {
                                            return null;
                                        }
                                        return renderGuidedCard(track, index);
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        )}

        {/* CHAKRA TAB - API data, no mock */}
        {activeTab === 'chakra' && (
          <div className="space-y-6">
            {chakraError && !chakraLoading && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[21px] p-6 text-center card-standard">
                            <p className="text-red-600 dark:text-red-400 text-sm mb-2">Failed to load chakra mantras</p>
                            <p className="text-red-500 dark:text-red-500/70 text-xs">{chakraError.message}</p>
                        </div>
                    )}

                    {!chakraLoading && !chakraError && (
                        <>
                            <div className="bg-gradient-peacock text-white p-8 rounded-[21px] mb-8 card-standard relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse-slow"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <BackButton
                                        variant="dark"
                                        onClick={() => navigate('/')}
                                    />
                                    <div className="text-center flex-1">
                                        <h2 className="font-serif text-xl font-bold mb-2 leading-tight">Chakra Music</h2>
                                        <p className="text-brand-light text-xs opacity-90">Browse and play all mantras</p>
                                    </div>
                                    <div className="w-12 shrink-0"></div>
                                </div>
                            </div>

                            <div className="space-y-4 pb-12">
                                {chakraLoading ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <CardSkeleton key={i} />
                                        ))}
                                    </div>
                                ) : chakraMantras.length === 0 ? (
                                    <div className="text-center py-16">
                                        <Circle size={48} className="mx-auto mb-4 text-brand-medium/20" />
                                        <p className="font-serif text-lg text-brand-medium/60 dark:text-brand-darkTextMuted mb-2">No mantras available</p>
                                        <p className="text-xs text-brand-medium/40 dark:text-brand-darkTextMuted">Chakra mantras will be available soon</p>
                                    </div>
                                ) : (
                                    chakraMantras.map((track: ChakraMusicTrack, index: number) => {
                                        const chakraId = getChakraIdFromSlug(track.slug);
                                        const chakra = chakraId ? CHAKRAS.find((c) => c.id === chakraId) : null;
                                        const isItemPremium = track.isPremium;
                                        const canAccess = isChakraUserPremium || !isItemPremium;
                                        const isLocked = isItemPremium && !isChakraUserPremium;

                                        const handleChakraClick = () => {
                                            if (canAccess) {
                                                startTrack(track._id, 'CHAKRA', track.audioFilename, track.visualUrl);
                                            } else {
                                                navigate('/subscription');
                                            }
                                        };

                                        const chakraColor = chakra?.colorClass || 'bg-brand-gold';
                                        const chakraBgColors = getChakraBgColor(index);
                                        
                                        return (
                                            <div 
                                                key={track._id}
                                                onClick={handleChakraClick}
                                                className="bg-white dark:bg-brand-darkSurface p-4 card-standard border border-brand-light/50 dark:border-brand-darkBorder flex items-center gap-4 cursor-pointer hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] active:scale-[0.97] active:opacity-95 transition-all duration-300 ease-out group overflow-hidden relative"
                                            >
                                                {/* Subtle chakra-colored background overlay */}
                                                <div 
                                                    className="absolute inset-0 rounded-[21px] pointer-events-none transition-opacity duration-300"
                                                    style={{
                                                        backgroundColor: chakraBgColors.light,
                                                    }}
                                                ></div>
                                                <div 
                                                    className="absolute inset-0 rounded-[21px] pointer-events-none dark:opacity-100 opacity-0 transition-opacity duration-300"
                                                    style={{
                                                        backgroundColor: chakraBgColors.dark,
                                                    }}
                                                ></div>
                                                
                                                {/* Left Accent Bar - 4px width matching chakra color */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${chakraColor} rounded-l-[21px] transition-all duration-300 group-hover:w-[4px] group-hover:shadow-[0_0_8px_currentColor] z-10`}></div>
                                                
                                                <div className={`relative z-10 w-16 h-16 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-brand-light dark:border-brand-darkBorder ${chakraColor} group-hover:scale-105 transition-transform duration-300`}>
                                                    <img 
                                                        src={track.imageFilename || chakra?.thumbnail} 
                                                        alt={track.name}
                                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                    />
                                                    <div className={`absolute inset-0 ${chakraColor} opacity-10 transition-opacity duration-300 group-hover:opacity-20`} />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-8 h-8 rounded-full bg-white/40 backdrop-blur-md border border-white/30 flex items-center justify-center text-brand-dark opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Play size={14} className="ml-0.5 fill-current animate-play-pulse" />
                                                        </div>
                                                    </div>
                                                    {isLocked && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <Lock size={20} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="relative z-10 flex-1 min-w-0 pl-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h3 className="font-semibold text-brand-dark dark:text-white truncate font-serif transition-colors duration-300 group-hover:text-brand-gold" style={{ fontSize: '16px', fontWeight: 600 }}>
                                                            {track.name}
                                                        </h3>
                                                        {chakra && (
                                                            <div className={`w-2 h-2 rounded-full ${chakra.colorClass} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        {chakra && (
                                                            <>
                                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${chakraColor}/10 border ${chakraColor}/20 text-brand-gold transition-all duration-300 group-hover:scale-105`}>
                                                                    {chakra.name} Chakra
                                                                </span>
                                                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                                                <span className="text-[13px] font-medium text-brand-medium dark:text-brand-darkTextMuted flex items-center gap-1 transition-colors duration-300 group-hover:text-brand-gold/70" style={{ opacity: 0.6 }}>
                                                                    <Activity size={10} /> {chakra.frequency}
                                                                </span>
                                                            </>
                                                        )}
                                                        {isLocked && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                                                <span className="text-[13px] font-semibold text-brand-gold flex items-center gap-1 transition-all duration-300 group-hover:scale-105" style={{ opacity: 0.6 }}>
                                                                    <Lock size={10} /> Premium
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {track.description && (
                                                        <p className="text-[13px] text-brand-medium dark:text-brand-darkTextMuted line-clamp-1 leading-relaxed italic transition-colors duration-300 group-hover:text-brand-gold/70" style={{ opacity: 0.6 }}>
                                                            {track.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-brand-medium/20 group-hover:text-brand-gold group-hover:bg-brand-gold/10 active:bg-brand-gold/20 transition-all duration-300">
                                                    <Play size={18} className="ml-0.5 animate-play-pulse" />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
            )}
          </div>
        )}

        {/* WISDOM TAB */}
        {activeTab === 'wisdom' && (
            <div className="space-y-8">
                 <div className="bg-brand-sage/20 dark:bg-brand-darkSurface/50 p-8 rounded-[21px] text-brand-dark dark:text-brand-darkText text-center relative overflow-hidden mb-8 card-standard border border-brand-sage/30 dark:border-brand-darkBorder backdrop-blur-sm">
                    <Mic size={100} className="absolute -bottom-4 -left-4 opacity-10 rotate-12 text-brand-sage" />
                    <h2 className="text-3xl font-serif font-bold mb-2 relative z-10">Wisdom Beyond Words</h2>
                    <p className="text-brand-dark/70 dark:text-brand-darkTextMuted text-sm relative z-10">Deep conversations on silence.</p>
                 </div>

                 {PODCASTS.map(podcast => (
                    <div 
                        key={podcast.id} 
                        onClick={() => startTrack(podcast.id, 'PODCAST')}
                        className="bg-white/90 dark:bg-brand-darkSurface/90 backdrop-blur-sm p-6 card-standard border border-brand-light/50 dark:border-brand-darkBorder flex items-center gap-5 cursor-pointer active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-brand-light dark:bg-white/5 text-brand-primary dark:text-brand-gold flex items-center justify-center shadow-sm">
                            <Mic size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-brand-dark dark:text-brand-darkText text-lg font-serif">{podcast.title}</h3>
                            <p className="text-sm text-brand-medium dark:text-brand-darkTextMuted mt-1 line-clamp-2 leading-relaxed">{podcast.description}</p>
                        </div>
                         <div className="w-10 h-10 rounded-full border border-brand-light dark:border-white/10 bg-brand-light/30 dark:bg-white/5 flex items-center justify-center transition-colors">
                            <Play size={16} className="ml-0.5" />
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

    </div>
  );
};
