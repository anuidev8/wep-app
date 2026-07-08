import React, { useMemo, useState } from 'react';
import { Play, Moon, Heart, Lock, ArrowLeft, Sparkles, Search, X } from 'lucide-react';
import { getMoonPhaseInfo, getCrescentShadowOffset, MOON_DARK, MOON_GLOW } from '../utils/moonPhase';
import { useNavigate } from 'react-router-dom';
import { useSleepMusic } from '../hooks/useSleepMusic';
import { MusicTrack } from '../services/sleepMusicService';
import { ZenLoadingScreen } from '../components/ZenLoadingScreen';
import { useMinimumDisplayTime } from '../hooks/useMinimumDisplayTime';
import { SleepMusicThumbnail } from '../components/SleepMusicThumbnails';
import { triggerHaptic } from '../utils/hapticFeedback';

export const SleepMusic: React.FC = () => {
  const navigate = useNavigate();
  const {
    musicList: SLEEP_LIST,
    favorites: SLEEP_FAVORITES,
    isUserPremium,
    isAuthenticated,
    loading: sleepLoading,
    error: sleepError,
    toggleFavorite,
    isFavorite,
  } = useSleepMusic();
  
  // Ensure loading screen displays for minimum 300ms
  const shouldShowLoading = useMinimumDisplayTime(sleepLoading, 300);
  
  // Local state for favorite animations and feedback
  const [favoriteSuccess, setFavoriteSuccess] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const SLEEP_LATEST = useMemo(() => {
    if (!SLEEP_LIST.length) return [];
    return [...SLEEP_LIST].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [SLEEP_LIST]);

  const FEATURED_SLEEP = SLEEP_LATEST[0] || null;
  const LATEST_RELEASES = SLEEP_LATEST.slice(1, 4);
  const hasActiveSearch = searchQuery.trim().length > 0;

  const moonPhase = getMoonPhaseInfo(); // Updates daily with lunar calendar

  const filteredSleepTracks = useMemo(() => {
    if (!hasActiveSearch) return [];
    const low = searchQuery.trim().toLowerCase();
    return SLEEP_LIST.filter(track => {
      const inName = track.name?.toLowerCase().includes(low);
      const inDescription = track.description?.toLowerCase().includes(low);
      const inCategory = (track.categories || []).some(cat =>
        cat.name?.toLowerCase().includes(low)
      );
      return inName || inDescription || inCategory;
    });
  }, [SLEEP_LIST, searchQuery, hasActiveSearch]);

  // Loading state - return early with full screen
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen transition-colors duration-300" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1a1f35 50%, #0d1520 100%)' }}>
        <ZenLoadingScreen 
          fullScreen={true}
          messages={[
            "Preparing soundscapes...",
            "Gathering peaceful melodies...",
            "Creating restful ambiance...",
          ]}
        />
      </div>
    );
  }

  const startTrack = (track: MusicTrack) => {
    const isItemPremium = track.isPremium;
    const canAccess = isUserPremium || !isItemPremium;

    if (!canAccess) {
      triggerHaptic('warning');
      if (!isAuthenticated) {
        navigate('/login');
      } else {
        navigate('/subscription');
      }
      return;
    }

    triggerHaptic('medium');
    navigate(`/player?track=${track._id}&type=SLEEP&audioUrl=${encodeURIComponent(track.audioFilename)}`, {
      state: { sleepQueue: SLEEP_LIST },
    });
  };

  const handleToggleFavorite = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const wasFavorite = isFavorite(trackId);
    
    // Optimistic update - show success immediately
    setFavoriteSuccess(trackId);
    
    // Show toast message immediately
    const trackName = SLEEP_LIST.find(t => t._id === trackId)?.name || 'Track';
    setToastMessage(wasFavorite ? 'Removed from favorites' : 'Added to favorites');
    setTimeout(() => setToastMessage(null), 2000);
    
    // Clear success state after animation
    setTimeout(() => {
      setFavoriteSuccess(null);
    }, 2000);
    
    // Make API call in background (non-blocking)
    toggleFavorite(trackId).catch((err) => {
      console.error('Failed to toggle favorite:', err);
      // Revert optimistic update on error
      setFavoriteSuccess(null);
      setToastMessage('Failed to update favorite');
      setTimeout(() => setToastMessage(null), 2000);
    });
  };

  const renderLatestReleaseCard = (track: MusicTrack, index: number) => {
    const isItemPremium = track.isPremium;
    const canAccess = isUserPremium || !isItemPremium;
    const isLocked = isItemPremium && !isUserPremium;
    const isHearted = isFavorite(track._id);

    const handleCardClick = () => {
      if (canAccess) {
        startTrack(track);
      } else {
        if (isAuthenticated) {
          navigate('/subscription');
        } else {
          navigate('/login');
        }
      }
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleToggleFavorite(track._id, e);
    };

    return (
      <div
        key={track._id}
        onClick={handleCardClick}
        className="relative rounded-[21px] overflow-hidden cursor-pointer active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out card-standard group sleep-moon-glow-card"
        style={{
          background: 'radial-gradient(circle at center, #1A1A1A 0%, #0A0A0A 100%)',
        }}
      >
        {/* Sacred Geometry Background Pattern */}
        <div className="absolute inset-0 opacity-15">
          <SleepMusicThumbnail
            name={track.name}
            category={track.categories?.[0]?.name}
            trackId={track._id}
            index={index + 1}
            size={300}
            className="w-full h-full"
          />
        </div>

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4996F]/5 via-transparent to-[#D4996F]/5 opacity-30"></div>

        {/* Content */}
        <div className="relative z-10 p-4 flex items-center gap-4">
          {/* Sacred Geometry Thumbnail */}
          <div className="shrink-0">
            <SleepMusicThumbnail
              name={track.name}
              category={track.categories?.[0]?.name}
              trackId={track._id}
              index={index + 1}
              size={60}
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base text-[#D4996F] line-clamp-1 mb-1">
              {track.name}
            </h4>
            <p className="text-xs text-[#E8E8E8] line-clamp-1 mb-2">
              {track.description}
            </p>
            {/* Category Badge */}
            {track.categories?.[0]?.name && (
              <span 
                className="inline-block text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(212, 153, 111, 0.15)',
                  color: '#D4996F',
                  border: '1px solid rgba(212, 153, 111, 0.3)',
                }}
              >
                {track.categories[0].name}
              </span>
            )}
          </div>

          {/* Right: Large Favorite Button */}
          {!isLocked && isAuthenticated && (
            <button
              onClick={handleFavoriteClick}
              className="relative w-11 h-11 flex items-center justify-center shrink-0 transition-all duration-300 group/heart active:scale-95 z-20"
              style={{
                minWidth: '44px',
                minHeight: '44px',
              }}
              aria-label={isHearted ? "Remove from favorites" : "Add to favorites"}
            >
              <div className="relative">
                <Heart
                  size={36}
                  className={`transition-all duration-300 ${
                    isHearted
                      ? 'fill-[#D4996F] text-[#D4996F]'
                      : 'fill-none stroke-[#CBD5E0] text-[#CBD5E0]'
                  } ${
                    favoriteSuccess === track._id ? 'animate-bounce' : ''
                  }`}
                  strokeWidth={isHearted ? 0 : 2}
                  style={{
                    filter: isHearted ? 'drop-shadow(0 0 8px rgba(212, 153, 111, 0.6))' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: isHearted ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
                {/* Enhanced Sparkle effects - multiple sparkles for zen experience */}
                {favoriteSuccess === track._id && (
                  <>
                    {/* Main sparkle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Sparkles 
                        size={48} 
                        className="text-[#D4996F] animate-ping"
                        style={{ animationDuration: '0.8s' }}
                      />
                    </div>
                    {/* Secondary sparkles */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Sparkles 
                        size={36} 
                        className="text-[#D4996F] animate-ping"
                        style={{ animationDuration: '1s', animationDelay: '0.2s' }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Sparkles 
                        size={28} 
                        className="text-[#D4996F] animate-ping"
                        style={{ animationDuration: '1.2s', animationDelay: '0.4s' }}
                      />
                    </div>
                    {/* Ripple effect */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-[#D4996F]/15 animate-ping" style={{ animationDuration: '1s' }} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-20 h-20 rounded-full bg-[#D4996F]/10 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }} />
                    </div>
                  </>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Lock Overlay for Premium */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-[21px] flex items-center justify-center z-30">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30">
              <Lock size={14} className="text-brand-gold" />
              <span className="text-xs font-bold text-brand-gold">
                Premium
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSleepCard = (track: MusicTrack, index: number) => {
    const isItemPremium = track.isPremium;
    const canAccess = isUserPremium || !isItemPremium;
    const isLocked = isItemPremium && !isUserPremium;
    const isHearted = isFavorite(track._id);

    const handleCardClick = () => {
      if (canAccess) {
        startTrack(track);
      } else {
        if (isAuthenticated) {
          navigate('/subscription');
        } else {
          navigate('/login');
        }
      }
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent card click from triggering
      handleToggleFavorite(track._id, e);
    };

    return (
      <div
        key={track._id}
        onClick={handleCardClick}
        className="bg-white/10 backdrop-blur-sm p-3 rounded-[20px] flex items-center gap-3 cursor-pointer active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out hover:bg-white/15 sm:hover:shadow-lg shadow-sm relative overflow-hidden group sleep-moon-glow-card"
      >
        {/* Sacred Geometry Thumbnail */}
        <SleepMusicThumbnail
          name={track.name}
          category={track.categories?.[0]?.name}
          trackId={track._id}
          index={index}
          size={48}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-white line-clamp-1">
            {track.name}
          </h4>
          <p className="text-[10px] text-white/60 line-clamp-1">
            {track.description}
          </p>
          {/* Category Tag */}
          {track.categories?.[0]?.name && (
            <span className="inline-block mt-1 text-[8px] bg-white/15 text-white/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {track.categories[0].name}
            </span>
          )}
        </div>

        {/* Right: Large Favorite Button */}
        {!isLocked && isAuthenticated && (
          <button
            onClick={handleFavoriteClick}
            className="relative w-11 h-11 flex items-center justify-center shrink-0 transition-all duration-300 group/heart active:scale-95"
            style={{
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label={isHearted ? "Remove from favorites" : "Add to favorites"}
          >
            {/* Animated heart with smooth transitions */}
            <div className="relative">
              <Heart
                size={36}
                className={`transition-all duration-300 ${
                  isHearted
                    ? 'fill-[#D4996F] text-[#D4996F]'
                    : 'fill-none stroke-[#CBD5E0] text-[#CBD5E0]'
                } ${
                  favoriteSuccess === track._id ? 'animate-bounce' : ''
                }`}
                strokeWidth={isHearted ? 0 : 2}
                style={{
                  filter: isHearted ? 'drop-shadow(0 0 8px rgba(212, 153, 111, 0.6))' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: isHearted ? 'scale(1.2)' : 'scale(1)',
                }}
              />
              {/* Enhanced Sparkle effects - multiple sparkles for zen experience */}
              {favoriteSuccess === track._id && (
                <>
                  {/* Main sparkle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Sparkles 
                      size={48} 
                      className="text-[#D4996F] animate-ping"
                      style={{ animationDuration: '0.8s' }}
                    />
                  </div>
                  {/* Secondary sparkles */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Sparkles 
                      size={36} 
                      className="text-[#D4996F] animate-ping"
                      style={{ animationDuration: '1s', animationDelay: '0.2s' }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Sparkles 
                      size={28} 
                      className="text-[#D4996F] animate-ping"
                      style={{ animationDuration: '1.2s', animationDelay: '0.4s' }}
                    />
                  </div>
                  {/* Ripple effect */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-[#D4996F]/15 animate-ping" style={{ animationDuration: '1s' }} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-[#D4996F]/10 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }} />
                  </div>
                </>
              )}
            </div>
          </button>
        )}

        {/* Lock Overlay for Premium */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-[20px] flex items-center justify-center z-10">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/20">
              <Lock size={12} className="text-white" />
              <span className="text-[10px] font-bold text-white">
                Premium
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen pb-28 transition-colors duration-300 relative overflow-hidden sleep-music-beach-night"
      style={{
        background: 'linear-gradient(180deg, #0a1628 0%, #1a1f35 50%, #0d1520 100%)',
      }}
    >
      
      {/* Beach night / full moon ambient background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Full moon glow - soft silver orb */}
        <div 
          className="absolute top-[8%] right-[15%] w-[320px] h-[320px] rounded-full blur-[100px] opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(240,245,255,0.5) 0%, rgba(200,215,255,0.2) 40%, transparent 70%)' }}
        />
        {/* Moonlit sky wash */}
        <div 
          className="absolute top-0 left-0 right-0 h-[50%] opacity-20"
          style={{ background: 'linear-gradient(180deg, rgba(180,200,255,0.15) 0%, transparent 100%)' }}
        />
        {/* Beach / sand warmth at bottom - moonlit shore */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[40%] opacity-25"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,180,140,0.25) 0%, rgba(180,160,120,0.08) 50%, transparent 100%)' }}
        />
        {/* Subtle wave line */}
        <div 
          className="absolute bottom-[28%] left-0 right-0 h-px opacity-15"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(200,220,255,0.4), transparent)' }}
        />
      </div>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-brand-dark/95 backdrop-blur-xl text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 animate-fade-in flex items-center gap-3">
          <Heart 
            size={18} 
            className={`${toastMessage.includes('Added') ? 'fill-brand-gold text-brand-gold' : 'text-white/60'}`}
          />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
      
      {/* Ambient orbs - subtle moon & beach night accents */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[30%] left-[-10%] w-[400px] h-[400px] bg-[rgba(200,215,255,0.04)] rounded-full blur-[120px] animate-float" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[350px] h-[350px] bg-[rgba(212,180,140,0.05)] rounded-full blur-[100px] animate-pulse-slow" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
      </div>

      {/* Header with Back Button */}
      <div className="bg-[#0a1628]/80 backdrop-blur-xl p-6 pt-12 pb-4 sticky top-0 z-30 transition-colors duration-300 border-b border-white/10 sleep-moon-glow-header">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="relative p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-300 border border-white/20 active:scale-95 group sleep-moon-glow-back"
          >
            <div className="absolute inset-0 rounded-full bg-brand-gold/5 dark:bg-brand-gold/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <ArrowLeft size={20} className="relative z-10 text-white group-hover:text-brand-gold transition-colors duration-300" strokeWidth={2.5} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-serif font-bold text-white">
              Sleep Music
            </h1>
            <p className="text-[10px] text-[#c9a96e] font-bold uppercase tracking-widest">
              Meditate with Abhi
            </p>
          </div>
          {/* Single crescent moon - actual moon glow effect */}
          <div className="shrink-0 flex flex-col items-center justify-center gap-0.6 ml-auto mr-6" title={moonPhase.phaseName}>
              <div className="relative" aria-hidden>
                {/* Outer glow halo - soft ambient light */}
                {moonPhase.illuminationPercent > 0 && (
                  <div
                    className="absolute inset-[-10px] rounded-full animate-moon-glow-pulse"
                    style={{
                      background: `radial-gradient(circle, rgba(245,242,232,${0.2 + moonPhase.illuminationPercent / 350}) 0%, rgba(230,225,210,${0.1 + moonPhase.illuminationPercent / 500}) 35%, transparent 65%)`,
                      filter: 'blur(8px)',
                    }}
                  />
                )}
                <div
                  className="relative w-9 h-9 rounded-full overflow-hidden"
                  style={{
                    filter: moonPhase.illuminationPercent > 0
                      ? `drop-shadow(0 0 4px rgba(255,250,240,0.5)) drop-shadow(0 0 12px rgba(230,225,210,${0.25 + moonPhase.illuminationPercent / 400})) drop-shadow(0 0 24px rgba(220,218,200,${0.15 + moonPhase.illuminationPercent / 500}))`
                      : 'none',
                  }}
                >
                  {/* Lit crescent - full circle base */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ background: MOON_GLOW }}
                  />
                  {/* Dark overlay - creates crescent shape, clipped to one moon */}
                  {moonPhase.illuminationPercent < 100 && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: MOON_DARK,
                        transform: `translateX(${moonPhase.isWaxing ? '-' : ''}${getCrescentShadowOffset(moonPhase.illuminationPercent, moonPhase.isWaxing, 36)}px)`,
                      }}
                    />
                  )}
                </div>
              </div>
              {moonPhase.illuminationPercent >= 100 ? (
                <span className="text-[9px] font-bold text-brand-gold">
                  Full Moon
                </span>
              ) : (
                <span className="text-[9px] font-bold text-white/80 tabular-nums">
                  {moonPhase.illuminationPercent}%
                </span>
              )}
            </div>
        </div>

        <div className="relative group mt-5 sleep-moon-glow-search rounded-2xl transition-all duration-300 bg-white/5">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-white/50 group-focus-within:text-brand-gold transition-colors" size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by title, frequency, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input w-full rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-0 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center"
              aria-label="Clear search"
            >
              <X size={16} className="text-white/50" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 pt-4 space-y-8 animate-fade-in relative z-10">

        {/* Error State */}
        {sleepError && !sleepLoading && (
          <div className="bg-red-900/20 border border-red-500/40 rounded-[21px] p-6 text-center card-standard">
            <p className="text-red-300 text-sm mb-2">Failed to load sleep music</p>
            <p className="text-red-400/80 text-xs">{sleepError.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {!sleepLoading && !sleepError && (
          <div className="space-y-6 pb-12 pt-2">
            {hasActiveSearch ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-base font-serif font-bold text-white">
                    Search Results ({filteredSleepTracks.length})
                  </h2>
                </div>
                {filteredSleepTracks.length > 0 ? (
                  <div className="space-y-2">
                    {filteredSleepTracks.map((track, index) => renderSleepCard(track, index))}
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-sm p-6 rounded-[21px] text-center sleep-moon-glow-card card-standard">
                    <p className="text-sm text-white/60">
                      No sleep tracks found for your search.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 1. Favorites Section - At Top */}
                <div className="space-y-3">
                  <div className="px-1">
                    <h2 className="text-base font-serif font-bold text-white">Favorites</h2>
                  </div>
                  {SLEEP_FAVORITES.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                      {SLEEP_FAVORITES.map((track, index) => (
                        <div 
                          key={track._id}
                          onClick={() => startTrack(track)}
                          className="shrink-0 w-40 bg-white/10 backdrop-blur-sm p-4 rounded-[21px] shadow-sm cursor-pointer active:scale-95 transition-transform sleep-moon-glow-card card-standard"
                        >
                          <div className="mb-3">
                            <SleepMusicThumbnail
                              name={track.name}
                              category={track.categories?.[0]?.name}
                              trackId={track._id}
                              index={index}
                              size={48}
                            />
                          </div>
                          <h4 className="font-bold text-xs text-white line-clamp-1 mb-1">{track.name}</h4>
                          <p className="text-[9px] text-white/60 line-clamp-1 mb-2">{track.description}</p>
                          <div className="flex items-center justify-between">
                            {track.categories?.[0]?.name && (
                              <span className="text-[9px] text-white/50">{track.categories[0].name}</span>
                            )}
                            <Heart 
                              size={12} 
                              className="fill-brand-gold text-brand-gold"
                              style={{
                                filter: 'drop-shadow(0 0 4px rgba(212, 165, 116, 0.5))'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/5 backdrop-blur-sm p-6 rounded-[21px] text-center sleep-moon-glow-card card-standard">
                      <p className="text-sm text-white/60">Tap ♡ on any track to save it here.</p>
                    </div>
                  )}
                </div>

                {/* 2. Sleep Soundscapes Title Row */}
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-base font-serif font-bold text-white">Sleep Soundscapes</h2>
                  <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <Moon size={18} className="text-white/60" />
                  </button>
                </div>

                {/* 3. Featured New Release Card */}
                {FEATURED_SLEEP && (
                  <div 
                    onClick={() => startTrack(FEATURED_SLEEP)}
                    className="relative rounded-[21px] aspect-[16/9] card-standard cursor-pointer active:scale-[0.98] transition-transform group sleep-moon-glow-featured overflow-hidden"
                  >
                    {/* Favorite button overlay for featured card */}
                    {isAuthenticated && !FEATURED_SLEEP.isPremium && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(FEATURED_SLEEP._id, e);
                        }}
                        className="absolute top-4 right-4 z-20 p-3 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all duration-300 active:scale-90 group-hover:opacity-100 opacity-0 group/fav"
                      >
                        <div className="relative">
                          <Heart
                            size={20}
                            className={`transition-all duration-300 ${
                              isFavorite(FEATURED_SLEEP._id)
                                ? 'fill-brand-gold text-brand-gold scale-110'
                                : 'text-white/80 group-hover/fav:text-brand-gold/80'
                            }`}
                            style={{
                              filter: isFavorite(FEATURED_SLEEP._id) ? 'drop-shadow(0 0 12px rgba(212, 165, 116, 0.8))' : 'none',
                              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                          />
                          {/* Enhanced Sparkle effects for featured card */}
                          {favoriteSuccess === FEATURED_SLEEP._id && (
                            <>
                              {/* Main sparkle */}
                              <Sparkles 
                                size={32} 
                                className="absolute inset-0 m-auto text-brand-gold animate-ping"
                                style={{ animationDuration: '0.8s' }}
                              />
                              {/* Secondary sparkles */}
                              <Sparkles 
                                size={24} 
                                className="absolute inset-0 m-auto text-brand-gold animate-ping"
                                style={{ animationDuration: '1s', animationDelay: '0.2s' }}
                              />
                              <Sparkles 
                                size={18} 
                                className="absolute inset-0 m-auto text-brand-gold animate-ping"
                                style={{ animationDuration: '1.2s', animationDelay: '0.4s' }}
                              />
                              {/* Ripple effects */}
                              <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-brand-gold/20 animate-ping" style={{ animationDuration: '1s' }} />
                              <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-brand-gold/15 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }} />
                            </>
                          )}
                        </div>
                      </button>
                    )}
                    {/* Sacred Geometry Background for Featured Card */}
                    <SleepMusicThumbnail
                      name={FEATURED_SLEEP.name}
                      category={FEATURED_SLEEP.categories?.[0]?.name}
                      trackId={FEATURED_SLEEP._id}
                      index={0}
                      size={400}
                      className="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                      <div className="flex flex-col items-center justify-end">
                        <span className="inline-block text-[9px] font-bold uppercase tracking-widest bg-white/25 backdrop-blur-sm text-white px-3 py-1.5 rounded-full mb-3 border border-white/30 dark:border-white/20 dark:shadow-[0_0_12px_rgba(200,215,255,0.15)]">
                          Latest Release
                        </span>
                        <h3 className="text-2xl font-serif font-bold text-brand-gold mb-1.5 leading-tight text-center">
                          {FEATURED_SLEEP.name}
                        </h3>
                        <p className="text-xs text-white/90 font-medium text-center">
                          {FEATURED_SLEEP.description} | Deep sleep
                        </p>
                        <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-xl shrink-0 mt-4 sleep-moon-glow-play">
                          <Play size={22} fill="currentColor" className="ml-1" />
                        </div>
                      </div>
                    </div>
                    <Moon size={40} className="absolute top-4 right-4 text-white/15" />
                  </div>
                )}

                {/* 4. Attribution Text */}
                <p className="text-center text-sm font-medium text-brand-gold/90">Featured music</p>

                {/* 5. Latest Releases Section */}
                <div className="space-y-4">
                  <div className="px-1">
                    <h2 className="text-lg font-serif font-bold text-white">Latest Releases</h2>
                  </div>
                  <div className="space-y-3">
                    {LATEST_RELEASES.map((track, index) => renderLatestReleaseCard(track, index))}
                  </div>
                </div>

                {/* 6. All Sleep Music List */}
                {SLEEP_LIST.length > 4 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-base font-serif font-bold text-white">All Sleep Music</h2>
                    </div>
                    <div className="space-y-2">
                      {SLEEP_LIST.filter(track => 
                        track._id !== FEATURED_SLEEP?._id && 
                        !LATEST_RELEASES.some(lr => lr._id === track._id)
                      ).map((track, index) => renderSleepCard(track, index + LATEST_RELEASES.length))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
