import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Circle, Activity, Lock } from 'lucide-react';
import { CHAKRAS } from '../constants';
import { useChakraMusic } from '../hooks/useChakraMusic';
import { ChakraMusicTrack } from '../services/chakraMantraService';
import { ZenLoadingScreen } from '../components/ZenLoadingScreen';
import { useMinimumDisplayTime } from '../hooks/useMinimumDisplayTime';

export const ChakraMantras: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chakraId = searchParams.get('chakra');

  const chakra = useMemo(() => {
    if (!chakraId) return null;
    return CHAKRAS.find((c) => c.id === chakraId);
  }, [chakraId]);

  const { mantras, isUserPremium, loading, error } = useChakraMusic(chakraId);
  
  // Ensure loading screen displays for minimum 300ms
  const shouldShowLoading = useMinimumDisplayTime(loading, 300);

  const handleMantraSelect = (track: ChakraMusicTrack) => {
    const isItemPremium = track.isPremium;
    const canAccess = isUserPremium || !isItemPremium;

    if (!canAccess) {
      navigate('/subscription');
      return;
    }

    navigate(
      `/player?track=${track._id}&type=CHAKRA&audioUrl=${encodeURIComponent(track.audioFilename)}${track.visualUrl ? `&visualUrl=${encodeURIComponent(track.visualUrl)}` : ''}`
    );
  };

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream to-white dark:from-brand-darkBase dark:to-brand-darkSurface transition-colors duration-300">
        <ZenLoadingScreen 
          fullScreen={true}
          messages={[
            "Preparing your sacred space...",
            "Connecting to chakra energy...",
            "Aligning healing frequencies...",
            "Awakening mantric vibrations...",
          ]}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-brand-medium dark:text-white mb-4">
            Failed to load chakra music. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-brand-gold text-brand-dark rounded-full font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!chakra) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-medium dark:text-white mb-4">Chakra not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-brand-gold text-brand-dark rounded-full font-bold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase pb-32 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-peacock pb-16 rounded-b-[40px] relative z-0 shadow-xl dark:shadow-none overflow-hidden transition-all duration-500">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent pointer-none"></div>
        <div className="absolute top-[-40px] right-[-20px] w-64 h-64 bg-brand-medium rounded-full blur-[60px] opacity-20 animate-pulse-slow"></div>

        <div className="pt-20 px-6 flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="relative p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all duration-300 border-2 border-white/20 shadow-xl shadow-white/10 active:scale-95 group"
            style={{
              boxShadow:
                '0 4px 20px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            }}
          >
            <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <ArrowLeft
              size={20}
              className="relative z-10 group-hover:scale-110 transition-transform duration-300"
              strokeWidth={2.5}
            />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold text-white leading-tight">
              {chakra.name} {chakra.mantra}
            </h1>
            <p className="text-brand-light text-sm opacity-90 mt-1">{chakra.sanskritName}</p>
          </div>
        </div>

        {/* Chakra Info Card */}
        <div className="px-6">
          <div className="bg-white/10 backdrop-blur-md rounded-[32px] p-6 border border-white/10 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-white/20">
                <img
                  src={chakra.thumbnail}
                  alt={chakra.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className={`absolute inset-0 ${chakra.colorClass} opacity-20`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${chakra.colorClass} shadow-[0_0_8px_rgba(255,255,255,0.3)]`}
                  />
                  <span className="text-white font-bold text-sm uppercase tracking-wider">
                    {chakra.mantra} Mantra
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-xs">
                  <Activity size={12} />
                  <span>{chakra.frequency}</span>
                </div>
              </div>
            </div>
            <p className="text-white/90 text-sm leading-relaxed italic">{chakra.description}</p>
          </div>
        </div>
      </div>

      {/* Mantras List */}
      <div className="px-6 mt-8 space-y-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-bold text-brand-dark dark:text-white">
            Available Mantras
          </h2>
          <span className="text-xs text-brand-medium dark:text-brand-darkTextMuted font-bold uppercase tracking-wider">
            {mantras.length} {mantras.length === 1 ? 'Mantra' : 'Mantras'}
          </span>
        </div>

        {mantras.length > 0 ? (
          <div className="space-y-3">
            {mantras.map((track) => {
              const isItemPremium = track.isPremium;
              const canAccess = isUserPremium || !isItemPremium;
              const isLocked = isItemPremium && !isUserPremium;

              return (
                <div
                  key={track._id}
                  onClick={() => handleMantraSelect(track)}
                  className="group bg-white dark:bg-brand-darkSurface p-5 rounded-[28px] border border-brand-light dark:border-brand-darkBorder flex items-center justify-between shadow-sm sm:hover:shadow-lg hover:border-brand-gold/50 active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out cursor-pointer overflow-hidden relative"
                >
                  <div className="flex items-center gap-4 relative z-10 flex-1">
                    <div
                      className={`w-16 h-16 rounded-[20px] ${chakra.colorClass} flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform relative`}
                    >
                      <Play size={24} fill="currentColor" className="ml-1" />
                      {isLocked && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[20px]">
                          <Lock size={20} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base dark:text-white group-hover:text-brand-gold transition-colors mb-1.5">
                        {track.name}
                      </h4>
                      {track.description && (
                        <p className="text-xs text-brand-medium/60 dark:text-brand-darkTextMuted line-clamp-2">
                          {track.description}
                        </p>
                      )}
                      {isLocked && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-brand-gold font-semibold">
                          <Lock size={10} />
                          <span>Premium</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-brand-light dark:bg-white/5 flex items-center justify-center text-brand-medium/30 group-hover:text-brand-gold group-hover:bg-brand-gold/10 transition-all ml-4">
                    <Play size={18} className="ml-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <Circle size={48} className="mx-auto mb-4 text-brand-medium/20" />
            <p className="font-serif text-lg text-brand-medium/60 dark:text-brand-darkTextMuted mb-2">
              No mantras available
            </p>
            <p className="text-xs text-brand-medium/40 dark:text-brand-darkTextMuted">
              Mantras for this chakra will be available soon
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
