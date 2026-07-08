
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAudioEngine } from "../hooks/useAudioEngine";
import { SleepPlayerView } from "../components/player/SleepPlayerView";
import { GuidedPlayerView } from "../components/player/GuidedPlayerView";
import { ChakraPlayerView } from "../components/player/ChakraPlayerView";
import { MantraPlayerView } from "../components/player/MantraPlayerView";
import {
  CHAKRAS,
  GUIDED_SESSIONS,
  MANTRAS,
  PODCASTS,
  SHIVA_TRACKS,
} from "../constants";
import { AudioTrack } from "../types";
import { Check } from "lucide-react";
import { getMantra, fetchChakraTrack } from "../services/chakraMantraService";
import { fetchGuidedMeditationTrack } from "../services/guidedMeditationService";
import { fetchSleepMusicTrack } from "../services/sleepMusicService";
import { fetchMantraTrack } from "../services/mantrasService";
import { getStoredAuth } from "../services/authService";
import { ZenLoadingScreen } from "../components/ZenLoadingScreen";
import { addRecentlyPlayedMantra } from "../utils/recentMantras";
import { addRecentlyPlayedGuidedMeditation } from "../utils/recentGuidedMeditations";
import { ensureAudioConfigured } from "../services/audioInit";
import { Capacitor } from "@capacitor/core";

export const AudioPlayer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const trackId = searchParams.get("track");
  const type = searchParams.get("type");
  const audioUrlParam = searchParams.get("audioUrl");
  const visualUrlParam = searchParams.get("visualUrl");
  // Navigation uses encodeURIComponent() on URLs before putting them in query params.
  // searchParams.get() decodes once (e.g. %2520 → %20), leaving a still-encoded URL.
  // We must decode a second time so that nativeAudioService.preload()'s encodeURI()
  // receives the raw URL with spaces — otherwise %20 gets re-encoded to %2520 and
  // the native audio player fetches a wrong path (confirmed from device logs).
  const decodedAudioUrl = audioUrlParam ? decodeURIComponent(audioUrlParam) : null;
  const decodedVisualUrl = visualUrlParam ? decodeURIComponent(visualUrlParam) : null;
  
  // State for API tracks (guided meditation and sleep music)
  const [apiTrack, setApiTrack] = useState<any>(null);
  // Initialize to true synchronously when we know an API fetch will be needed.
  // This prevents a first-render with track=null that causes useAudioEngine to
  // run its setup with an empty track before the real one arrives.
  const [loadingApiTrack, setLoadingApiTrack] = useState(() => {
    const isChakra = type === "CHAKRA" && !!trackId && (!!audioUrlParam || /^[a-f0-9]{24}$/i.test(trackId ?? ''));
    const isOther = (type === "GUIDED" || type === "SLEEP" || type === "MANTRA" || type === "SHIVA") && !!trackId && !!audioUrlParam;
    const isOtherTrack = type === "SLEEP" || type === "MANTRA" || type === "SHIVA" || (type === "GUIDED" && !GUIDED_SESSIONS.find((s) => s.id === trackId));
    return isChakra || (isOther && isOtherTrack);
  });

  // Warm up the native audio session as early as possible — before the API fetch
  // even completes. This minimises the chance of NativeAudio.play() firing on an
  // unconfigured session, which is the primary cause of the first-attempt crash.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void ensureAudioConfigured();
    }
  }, []);

  // Fetch API track if it's a GUIDED, SLEEP, MANTRA, SHIVA, or CHAKRA type
  useEffect(() => {
    const loadApiTrack = async () => {
      const isChakraApiRequest = type === "CHAKRA" && trackId && (audioUrlParam || /^[a-f0-9]{24}$/i.test(trackId));
      const isOtherApiRequest = (type === "GUIDED" || type === "SLEEP" || type === "MANTRA" || type === "SHIVA") && trackId && audioUrlParam;
      const isOtherApiTrack = type === "SLEEP" || type === "MANTRA" || type === "SHIVA" || (type === "GUIDED" && !GUIDED_SESSIONS.find((s) => s.id === trackId));

      if (isChakraApiRequest) {
        setLoadingApiTrack(true);
        try {
          const auth = await getStoredAuth();
          const email = auth?.email || "guest@example.com";
          const fetchedTrack = await fetchChakraTrack(trackId, email);

          if (fetchedTrack) {
            setApiTrack({
              id: fetchedTrack._id,
              title: fetchedTrack.name,
              description: fetchedTrack.description,
              duration: 0,
              category: "CHAKRA" as const,
              tags: ["Chakra", "Healing"],
              color: "bg-red-500",
              audioUrl: decodedAudioUrl ?? fetchedTrack.audioFilename,
              visualUrl: decodedVisualUrl ?? fetchedTrack.visualUrl,
              image: fetchedTrack.imageFilename,
            });
          } else {
            setApiTrack(null);
          }
        } catch (error) {
          console.error("[AudioPlayer] Error loading CHAKRA track:", error);
          if (audioUrlParam) {
            setApiTrack({
              id: trackId,
              title: trackId,
              description: "",
              duration: 600,
              category: "CHAKRA" as const,
              tags: [],
              color: "bg-red-500",
              audioUrl: decodedAudioUrl!,
              visualUrl: decodedVisualUrl ?? undefined,
            });
          } else {
            setApiTrack(null);
          }
        } finally {
          setLoadingApiTrack(false);
        }
      } else if (isOtherApiRequest && isOtherApiTrack) {
          setLoadingApiTrack(true);
          try {
            const auth = await getStoredAuth();
            
            if (type === "SLEEP") {
              // Fetch sleep music track
              const fetchedTrack = await fetchSleepMusicTrack(trackId, auth?.token);
              
              if (fetchedTrack) {
                // Convert MusicTrack to AudioTrack format
                setApiTrack({
                  id: fetchedTrack._id,
                  title: fetchedTrack.name,
                  description: fetchedTrack.description,
                  duration: 0, // Will be set from audio metadata
                  category: "SLEEP" as const,
                  tags: fetchedTrack.categories?.map(c => c.name) || [],
                  color: 'bg-brand-lavender',
                  audioUrl: decodedAudioUrl ?? fetchedTrack.audioFilename,
                  image: fetchedTrack.imageFilename,
                });
              } else {
                // Fallback: create track from URL params
                setApiTrack({
                  id: trackId,
                  title: trackId,
                  description: '',
                  duration: 0,
                  category: "SLEEP" as const,
                  tags: [],
                  color: 'bg-brand-lavender',
                  audioUrl: decodedAudioUrl!,
                });
              }
            } else if (type === "MANTRA" || type === "SHIVA") {
              // Fetch mantra track (both MANTRA and SHIVA are mantras)
              const email = auth?.email || 'guest@example.com';
              try {
                const fetchedTrack = await fetchMantraTrack(trackId, email);
                
                if (fetchedTrack) {
                  // Convert MantraItem to AudioTrack format
                  // Determine category from API response or type parameter
                  const trackCategory = fetchedTrack.category === 'SHIVA' || fetchedTrack.deity === 'SHIVA' 
                    ? 'SHIVA' 
                    : (type === "SHIVA" ? "SHIVA" : "MANTRA");
                  
                  setApiTrack({
                    id: fetchedTrack._id || fetchedTrack.id || trackId,
                    title: fetchedTrack.title,
                    description: fetchedTrack.description,
                    duration: fetchedTrack.duration || 600,
                    category: trackCategory as const,
                    tags: fetchedTrack.tags || [],
                    color: fetchedTrack.color || 'bg-brand-gold',
                    audioUrl: decodedAudioUrl ?? fetchedTrack.audioUrl,
                    image: fetchedTrack.thumbnailUrl || fetchedTrack.visualUrl,
                    deity: fetchedTrack.deity,
                    benefit: fetchedTrack.benefit,
                    popularityScore: fetchedTrack.popularityScore,
                  });
                } else {
                  // Fallback: create track from URL params
                  setApiTrack({
                    id: trackId,
                    title: trackId,
                    description: '',
                    duration: 600,
                    category: (type === "SHIVA" ? "SHIVA" : "MANTRA") as const,
                    tags: [],
                    color: 'bg-brand-gold',
                    audioUrl: decodedAudioUrl!,
                  });
                }
              } catch (mantraError) {
                console.warn('[AudioPlayer] Failed to fetch mantra track, using fallback:', mantraError);
                // Fallback: create track from URL params
                setApiTrack({
                  id: trackId,
                  title: trackId,
                  description: '',
                  duration: 600,
                  category: (type === "SHIVA" ? "SHIVA" : "MANTRA") as const,
                  tags: [],
                  color: 'bg-brand-gold',
                  audioUrl: decodedAudioUrl!,
                });
              }
            } else {
              // GUIDED type
              const email = auth?.email || 'guest@example.com';
              const fetchedTrack = await fetchGuidedMeditationTrack(trackId, email);
              
              if (fetchedTrack) {
                // Convert MusicTrack to AudioTrack format
                // Prioritize audioUrlParam if provided (passed from navigation)
                setApiTrack({
                  id: fetchedTrack._id,
                  title: fetchedTrack.name,
                  description: fetchedTrack.description,
                  duration: 0, // Will be set from audio metadata
                  category: "GUIDED" as const,
                  tags: fetchedTrack.categories?.map(c => c.name) || [],
                  color: 'bg-teal-500',
                  audioUrl: decodedAudioUrl ?? fetchedTrack.audioFilename,
                  image: fetchedTrack.imageFilename,
                });
              } else {
                // Fallback: create track from URL params
                setApiTrack({
                  id: trackId,
                  title: trackId,
                  description: '',
                  duration: 0,
                  category: "GUIDED" as const,
                  tags: [],
                  color: 'bg-teal-500',
                  audioUrl: decodedAudioUrl!,
                });
              }
            }
          } catch (error) {
            console.error('[AudioPlayer] Error loading API track:', error);
            // Fallback: create track from URL params with audioUrl
            if (audioUrlParam) {
              setApiTrack({
                id: trackId,
                title: trackId,
                description: '',
                duration: type === "MANTRA" ? 600 : 0,
                category: (type === "SLEEP" ? "SLEEP" : type === "MANTRA" ? "MANTRA" : "GUIDED") as const,
                tags: [],
                color: type === "SLEEP" ? 'bg-brand-lavender' : type === "MANTRA" ? 'bg-brand-gold' : 'bg-teal-500',
                audioUrl: decodedAudioUrl!,
              });
            }
          } finally {
            setLoadingApiTrack(false);
          }
      } else {
        setApiTrack(null);
      }
    };

    loadApiTrack();
  }, [trackId, type, audioUrlParam, visualUrlParam]);

  const track = useMemo(() => {
    if (!trackId) return null;
    
    // If we have an API track, use it (prioritize apiTrack over found track)
    if (apiTrack) {
      return apiTrack as AudioTrack;
    }
    
    // NOTE: No temporary tracks for MANTRA/SHIVA/CHAKRA - they must wait for apiTrack.
    // Temporary tracks caused a double-mount race condition: the player would mount with the
    // temp track (loading audio), then unmount when loadingApiTrack=true (async cleanup),
    // then remount with the real track — causing "Asset is already loaded" on native.
    
    let found: AudioTrack | undefined;
    if (type === "CHAKRA") {
      // Check if this is a specific mantra (format: chakra_${chakraId}_${mantraId})
      const mantraMatch = trackId.match(/^chakra_(.+?)_(.+)$/);
      if (mantraMatch) {
        const [, chakraId, mantraId] = mantraMatch;
        const chakra = CHAKRAS.find((c) => c.id === chakraId);
        const mantra = getMantra(chakraId, mantraId);
        
        if (chakra && mantra) {
          found = {
            id: trackId,
            title: mantra.title,
            duration: mantra.duration || 600,
            category: "CHAKRA",
            tags: ["Chakra", "Healing"],
            description: mantra.description || `${chakra.name} ${chakra.mantra}`, 
            color: chakra.colorClass, 
            visualUrl: chakra.visualUrl,
            audioUrl: decodedAudioUrl ?? mantra.audioUrl
          };
        }
      } else {
        // Fallback to original chakra track format (chakra music video)
      const chakra = CHAKRAS.find((c) => `chakra_${c.id}` === trackId);
      if (chakra) {
        found = {
          id: `chakra_${chakra.id}`,
          title: `${chakra.name} Chakra Music`,
          duration: 600,
          category: "CHAKRA",
          tags: ["Chakra", "Healing", "Music"],
          description: `${chakra.name} ${chakra.mantra} - Healing music video`, 
          color: chakra.colorClass, 
          visualUrl: decodedVisualUrl ?? chakra.visualUrl,
            audioUrl: decodedAudioUrl ?? chakra.audioUrl
        };
        }
      }
    } else if (type === "MANTRA") {
      // Check if it's an API track (has audioUrl param) or fallback to MANTRAS
      if (audioUrlParam) {
        // API track - will be handled by apiTrack state
        found = undefined;
      } else {
        found = MANTRAS.find((m) => m.id === trackId);
      }
    } else if (type === "SHIVA") found = SHIVA_TRACKS.find((s) => s.id === trackId);
    else if (type === "PODCAST") found = PODCASTS.find((p) => p.id === trackId);
    else if (type === "SLEEP") {
      // Check if it's an API track (has audioUrl param) or fallback to GUIDED_SESSIONS
      if (audioUrlParam) {
        // API track - will be handled by apiTrack state
        found = undefined;
      } else {
        found = GUIDED_SESSIONS.find((s) => s.id === trackId && s.category === 'SLEEP');
      }
    }
    else found = GUIDED_SESSIONS.find((s) => s.id === trackId);
    
    return found || null;
  }, [trackId, type, audioUrlParam, visualUrlParam, apiTrack]);

  // Signal explorer pages to remount when we unmount (user navigated back) — fixes control desync
  const trackCategoryRef = useRef<string | null>(null);
  useEffect(() => {
    trackCategoryRef.current = track?.category || type;
  }, [track?.category, type]);
  useEffect(() => {
    return () => {
      try {
        if (typeof sessionStorage === 'undefined') return;
        const cat = trackCategoryRef.current;
        if (cat === 'MANTRA' || cat === 'SHIVA') {
          sessionStorage.setItem('mantraExplorer_cameFromPlayer', '1');
        } else if (cat === 'GUIDED') {
          sessionStorage.setItem('guidedExplorer_cameFromPlayer', '1');
        }
      } catch {}
    };
  }, []);

  const engine = useAudioEngine(track, type);
  const recentLogTrackIdRef = useRef<string | null>(null);

  // Debug: verify engine state flows for MANTRA/SHIVA tracks.
  // Logs only on isPlaying/duration changes (not every currentTime tick).
  // Remove once "audio plays but controls frozen" is confirmed fixed.
  useEffect(() => {
    if ((type !== 'MANTRA' && type !== 'SHIVA') || !track) return;
    console.log('[AudioPlayer] engine state', {
      trackId: engine.trackId,
      isPlaying: engine.isPlaying,
      duration: engine.duration,
    });
  }, [engine.isPlaying, engine.duration, track?.id, type]);

  // Track recently played mantra/shiva items once playback actually starts.
  useEffect(() => {
    recentLogTrackIdRef.current = null;
  }, [track?.id, type]);

  useEffect(() => {
    if (!track) return;
    const isMantraTrack =
      track.category === "MANTRA" ||
      track.category === "SHIVA" ||
      type === "MANTRA" ||
      type === "SHIVA";

    const isGuidedTrack =
      track.category === "GUIDED" ||
      type === "GUIDED";

    if (!isMantraTrack && !isGuidedTrack) return;
    if (engine.currentTime < 1) return;
    if (recentLogTrackIdRef.current === track.id) return;

    if (isMantraTrack) {
      addRecentlyPlayedMantra({
        id: track.id,
        title: track.title || track.id,
        deity: track.deity,
        image: track.image,
        color: track.color,
        durationSeconds: engine.duration || track.duration || 0,
      });
    } else if (isGuidedTrack) {
      addRecentlyPlayedGuidedMeditation({
        id: track.id,
        title: track.title || track.id,
        category: track.tags?.[0],
        image: track.image,
        color: track.color,
        durationSeconds: engine.duration || track.duration || 0,
      });
    }
    recentLogTrackIdRef.current = track.id;
  }, [track, type, engine.currentTime, engine.duration]);

  if (loadingApiTrack) {
    return <ZenLoadingScreen fullScreen={true} />;
  }

  if (!track) return (
    <div className="p-10 text-center text-white min-h-screen bg-[#070812] flex items-center justify-center font-serif text-xl animate-pulse">
      Connecting to frequency...
    </div>
  );

  if (engine.isCompleted) {
    // Determine return path based on track category or type
    let returnPath = '/meditate'; // default
    const trackCategory = track.category || type;
    
    if (trackCategory === 'SLEEP') {
      returnPath = '/sleep-music';
    } else if (trackCategory === 'MANTRA' || trackCategory === 'SHIVA') {
      returnPath = '/mantra-explorer';
    } else if (trackCategory === 'CHAKRA') {
      returnPath = '/meditate?tab=chakra';
    } else if (trackCategory === 'GUIDED') {
      returnPath = '/guided-explorer';
    }
    
    return (
      <div className="flex flex-col h-screen bg-[#070812] text-white items-center justify-center p-8 text-center animate-fade-in">
        <div className="mb-6 bg-white/10 p-6 rounded-full border border-white/10 shadow-[0_0_60px_rgba(160,120,255,0.18)]">
          <Check size={48} className="text-green-300" />
        </div>
        <h2 className="text-3xl font-serif font-bold mb-2">Journey Complete</h2>
        <p className="text-white/70 mb-8 max-w-xs">{track.title} recorded.</p>
        <button onClick={() => navigate(returnPath)} className="w-full bg-white text-black font-bold py-4 rounded-2xl mb-3 active:scale-95 shadow-xl">Return to Sanctuary</button>
      </div>
    );
  }

  // Orchestration Logic: Render the correct view based on category
  const renderView = () => {
    // Ensure category is set correctly - use type from URL if track category is missing
    const trackCategory = track.category || (type === 'SHIVA' ? 'SHIVA' : type === 'MANTRA' ? 'MANTRA' : track.category);
    
    switch (trackCategory) {
      case 'SLEEP':
        return <SleepPlayerView engine={engine} track={track} />;
      case 'GUIDED':
        return <GuidedPlayerView engine={engine} track={track} />;
      case 'CHAKRA':
        // Use ChakraPlayerView for chakra music videos
        return <ChakraPlayerView engine={engine} track={track} />;
      case 'MANTRA':
      case 'SHIVA':
        // Use MantraPlayerView for mantras
        return <MantraPlayerView engine={engine} track={track} />;
      // Other types fallback to GuidedPlayerView
      default:
        // If type is MANTRA or SHIVA but category doesn't match, still use MantraPlayerView
        if (type === 'MANTRA' || type === 'SHIVA') {
          return <MantraPlayerView engine={engine} track={track} />;
        }
        return <GuidedPlayerView engine={engine} track={track} />;
    }
  };

  return <>{renderView()}</>;
};
