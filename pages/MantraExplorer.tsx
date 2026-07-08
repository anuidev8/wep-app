
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, Sparkles, Clock, Play, Heart, Star, 
    Zap, Moon, Smile, Shield, Anchor, Target, Users, Search, 
    Filter, X, LayoutGrid, Map, BookOpen, Compass, Music2,
    CheckCircle2, Flame, Lock, Share2, Copy
} from 'lucide-react';
import { AudioTrack } from '../types';
import { useApp } from '../context/AppContext';
import { useMantras } from '../hooks/useMantras';
import { MantraItem } from '../services/mantrasService';
import { getStoredAuth } from '../services/authService';
import { ZenLoadingScreen } from '../components/ZenLoadingScreen';
import { useMinimumDisplayTime } from '../hooks/useMinimumDisplayTime';
import { triggerHaptic } from '../utils/hapticFeedback';
import { readRecentlyPlayedMantras } from '../utils/recentMantras';

type FlowStep = 'DASHBOARD' | 'MOOD' | 'DEITY_GRID' | 'FAVORITES';
const MANTRA_DURATION_CACHE_KEY = 'mantraDurationCache_v1';

const BENEFIT_CATEGORIES = [
    { id: 'ENERGY', label: 'Energy & Focus', icon: Zap, color: 'from-orange-400 to-red-500', keywords: ['energy', 'focus', 'power', 'vitality', 'strength'] },
    { id: 'CALM', label: 'Anxiety & Stress', icon: Smile, color: 'from-teal-400 to-emerald-500', keywords: ['calm', 'anxiety', 'stress', 'peace', 'stillness'] },
    { id: 'SLEEP', label: 'Deep Sleep & Rest', icon: Moon, color: 'from-indigo-400 to-purple-500', keywords: ['sleep', 'rest', 'insomnia', 'night', 'deep'] },
    { id: 'PROTECTION', label: 'Courage & Protection', icon: Shield, color: 'from-red-400 to-rose-600', keywords: ['protection', 'courage', 'shield', 'fear', 'safety'] },
    { id: 'HEALING', label: 'Healing & Recovery', icon: Heart, color: 'from-emerald-400 to-teal-600', keywords: ['healing', 'recovery', 'health', 'wellbeing', 'body'] },
    { id: 'DEVOTION', label: 'Devotion & Connection', icon: Anchor, color: 'from-pink-400 to-rose-500', keywords: ['devotion', 'bhakti', 'love', 'connection', 'heart'] },
    { id: 'CONFIDENCE', label: 'Confidence', icon: Target, color: 'from-amber-400 to-orange-500', keywords: ['confidence', 'success', 'power', 'will', 'action'] },
    { id: 'FORGIVENESS', label: 'Letting Go', icon: Sparkles, color: 'from-purple-400 to-fuchsia-600', keywords: ['forgiveness', 'letting go', 'karma', 'purification', 'release'] },
];

const DEITY_CATEGORIES = [
    { id: 'SHIVA', label: 'Shiva', desc: 'Stillness & Power', image: 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Mantras%20/Mantra%20Images/ShivaMantraImage.jpg' },
    { id: 'HANUMAN', label: 'Hanuman', desc: 'Strength & Courage', image: 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Mantras%20/Mantra%20Images/HanumanMantraImage1.jpg' },
    { id: 'KRISHNA', label: 'Krishna', desc: 'Love & Peace', image: 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Mantras%20/Mantra%20Images/KrishnamantraImage1.jpg' },
    { id: 'DEVI', label: 'Devi', desc: 'Shakti & Grace', image: 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Mantras%20/Mantra%20Images/DeviMantraImage1.jpg' },
    { id: 'GANESHA', label: 'Ganesha', desc: 'Removing Obstacles', image: 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Mantras%20/Mantra%20Images/GaneshaMantraImage.jpg' },
    { id: 'UNIVERSAL', label: 'Universal', desc: 'Ancient Wisdom', image: 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/Mantras%20/Mantra%20Images/UniversalMantraImage.jpg' },
];

// Chakra color sequence: RED → Orange → Yellow → Green → Blue → Indigo → Violet (loops)
const CHAKRA_COLORS = [
    'bg-red-500',      // Root Chakra
    'bg-orange-500',   // Sacral Chakra
    'bg-yellow-500',   // Solar Plexus Chakra
    'bg-green-500',    // Heart Chakra
    'bg-blue-500',     // Throat Chakra
    'bg-indigo-500',   // Third Eye Chakra
    'bg-violet-500',   // Crown Chakra
];

// Helper function to get chakra color by index (loops)
const getChakraColor = (index: number): string => {
    return CHAKRA_COLORS[index % CHAKRA_COLORS.length];
};

// Chakra background colors for subtle card backgrounds (same as Courses page)
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

const roundSecondsToMinutes = (seconds: number): number => {
    if (!Number.isFinite(seconds) || seconds <= 0) return 0;
    return Math.max(1, Math.round(seconds / 60));
};

const loadAudioDuration = (audioUrl: string): Promise<number | null> => {
    return new Promise(resolve => {
        const audio = new Audio();
        audio.preload = 'metadata';

        let timeoutId: number | null = null;

        const cleanup = () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('error', onError);
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            audio.src = '';
        };

        const onLoadedMetadata = () => {
            const duration = Number.isFinite(audio.duration) && audio.duration > 0
                ? audio.duration
                : null;
            cleanup();
            resolve(duration);
        };

        const onError = () => {
            cleanup();
            resolve(null);
        };

        timeoutId = window.setTimeout(() => {
            cleanup();
            resolve(null);
        }, 8000);

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('error', onError);
        audio.src = audioUrl;
    });
};

// Helper function to convert MantraItem to AudioTrack format
const convertMantraToAudioTrack = (mantra: MantraItem): AudioTrack => {
    // Ensure audioUrl exists - log warning if missing
    if (!mantra.audioUrl) {
        console.warn('[MantraExplorer] Mantra missing audioUrl:', {
            id: mantra._id,
            title: mantra.title
        });
    }
    
    // Determine category based on API category field or deity
    let category: 'MANTRA' | 'SHIVA' = 'MANTRA';
    if (mantra.category === 'SHIVA' || mantra.deity === 'SHIVA') {
        category = 'SHIVA';
    }
    
    return {
        id: mantra._id || mantra.id || '',
        title: mantra.title,
        description: mantra.description,
        duration: mantra.duration ?? 0,
        category: category,
        tags: mantra.tags || [],
        color: mantra.color || 'bg-brand-gold',
        deity: mantra.deity,
        benefit: mantra.benefit,
        popularityScore: mantra.popularityScore,
        audioUrl: mantra.audioUrl || undefined, // Use audioUrl from API
        image: mantra.thumbnailUrl || mantra.visualUrl || undefined, // Use thumbnailUrl or visualUrl
        isPremium: mantra.isPremium,
    };
};

export const MantraExplorer: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { heartedMantraIds, toggleHeartMantra } = useApp();
    const { data, loading, error } = useMantras();
    const [authData, setAuthData] = useState<{ userId?: string } | null>(null);
    
    // Ensure loading screen displays for minimum 300ms
    const shouldShowLoading = useMinimumDisplayTime(loading, 300);
    
    const [step, setStep] = useState<FlowStep>(() => {
        const s = searchParams.get('step');
        if (s === 'GREETING' || s === 'RESULTS' || s === 'TIME') return 'DASHBOARD';
        return (s as FlowStep) || 'DASHBOARD';
    });
    
    // Track navigation history for intuitive back button behavior
    const [navigationHistory, setNavigationHistory] = useState<FlowStep[]>(['DASHBOARD']);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
    const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>([]);
    const [shareTrack, setShareTrack] = useState<AudioTrack | null>(null);
    const [copiedShareLink, setCopiedShareLink] = useState(false);
    const [durationByTrackId, setDurationByTrackId] = useState<Record<string, number>>({});
    const [durationCacheByUrl, setDurationCacheByUrl] = useState<Record<string, number>>({});

    // Load auth data to sync favorites
    useEffect(() => {
        const loadAuth = async () => {
            try {
                const auth = await getStoredAuth();
                setAuthData(auth);
            } catch (error) {
                console.warn('[MantraExplorer] Failed to load auth data:', error);
                // Continue without auth data - user can still browse mantras
                setAuthData(null);
            }
        };
        loadAuth();
    }, []);

    // Sync favorites from API response
    useEffect(() => {
        if (data?.mantras && authData?.userId) {
            const apiFavoritedIds = data.mantras
                .filter(m => m.favorites?.includes(authData.userId!))
                .map(m => m._id);
            
            // Update local state if API has different favorites
            const currentFavorites = heartedMantraIds;
            const needsUpdate = apiFavoritedIds.length !== currentFavorites.length ||
                apiFavoritedIds.some(id => !currentFavorites.includes(id));
            
            if (needsUpdate) {
                // Sync: add API favorites that aren't in local state
                apiFavoritedIds.forEach(id => {
                    if (!currentFavorites.includes(id)) {
                        // Note: This will trigger API call, but it's idempotent
                        // We could optimize this to batch update, but for now this works
                    }
                });
            }
        }
    }, [data, authData?.userId]); // Only sync when data or userId changes
    
    // Helper function to navigate to a step and track history
    const navigateToStep = (newStep: FlowStep) => {
        // Only add to history if we're actually changing steps
        setNavigationHistory(prev => {
            const currentStep = prev[prev.length - 1];
            if (currentStep === newStep) {
                return prev; // Already on this step, don't add duplicate
            }
            return [...prev, newStep];
        });
        setStep(newStep);
    };
    
    // Helper function to go back - provides intuitive navigation
    const handleBack = () => {
        if (navigationHistory.length > 1) {
            // Go back to previous step in history
            const newHistory = [...navigationHistory];
            newHistory.pop(); // Remove current step
            const previousStep = newHistory[newHistory.length - 1];
            setNavigationHistory(newHistory);
            setStep(previousStep);
        } else {
            // If no history (or only DASHBOARD), go to Home
            navigate('/');
        }
    };

    // Convert API mantras to AudioTrack format and sort by popularity
    // Filter out mantras without audioUrl (they can't be played)
    const ALL_TRACKS = useMemo(() => {
        if (!data?.mantras) return [];
        const tracks = data.mantras
            .filter(mantra => {
                // Only include mantras that have audioUrl
                if (!mantra.audioUrl) {
                    console.warn('[MantraExplorer] Skipping mantra without audioUrl:', {
                        id: mantra._id,
                        title: mantra.title
                    });
                    return false;
                }
                return true;
            })
            .map(convertMantraToAudioTrack);
        return tracks.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    }, [data]);

    // Premium status from API
    const isUserPremium = data?.hasAccess || false;

    const heartedTracks = useMemo(() => {
        return ALL_TRACKS.filter(t => {
            // Check API favorites array (contains user IDs)
            if (authData?.userId) {
                const mantra = data?.mantras?.find(m => m._id === t.id);
                if (mantra?.favorites?.includes(authData.userId)) {
                    return true;
                }
            }
            // Fallback to local heartedMantraIds
            return heartedMantraIds.includes(t.id);
        });
    }, [ALL_TRACKS, heartedMantraIds, data, authData]);

    const filteredTracks = useMemo(() => {
        let list = step === 'FAVORITES' ? heartedTracks : ALL_TRACKS;
        
        // --- FEELING CATEGORIZATION LOGIC ---
        if (selectedMoodId) {
            const mood = BENEFIT_CATEGORIES.find(m => m.id === selectedMoodId);
            if (mood) {
                list = list.filter(t => {
                    if (t.benefit === selectedMoodId) return true;
                    const hasTagMatch = (t.tags || []).some(tag => 
                        mood.keywords.some(kw => tag.toLowerCase().includes(kw))
                    );
                    if (hasTagMatch) return true;
                    if (t.description.toLowerCase().includes(mood.label.toLowerCase())) return true;
                    return false;
                });
            }
        }

        if (searchQuery) {
            const low = searchQuery.toLowerCase();
            list = list.filter(t => 
                t.title.toLowerCase().includes(low) || 
                t.deity?.toLowerCase().includes(low) ||
                t.description.toLowerCase().includes(low) ||
                (t.tags || []).some(tag => tag.toLowerCase().includes(low))
            );
        }
        return list;
    }, [selectedMoodId, searchQuery, ALL_TRACKS, heartedTracks, step]);

    const latestMantraRelease = useMemo(() => {
        if (!data?.mantras?.length) return null;

        const withValidCreatedAt = data.mantras
            .filter(mantra => !!mantra.audioUrl)
            .map(mantra => {
                const createdAtMs = Date.parse(mantra.createdAt);
                return {
                    mantra,
                    createdAtMs,
                    hasValidCreatedAt: Number.isFinite(createdAtMs),
                };
            })
            .filter(item => item.hasValidCreatedAt);

        if (!withValidCreatedAt.length) {
            console.warn('[MantraExplorer] No valid createdAt found for new release selection.');
            return null;
        }

        withValidCreatedAt.sort((a, b) => b.createdAtMs - a.createdAtMs);
        return withValidCreatedAt[0].mantra;
    }, [data]);

    const latestReleaseTrack = useMemo(() => {
        if (!latestMantraRelease) return null;
        return convertMantraToAudioTrack(latestMantraRelease);
    }, [latestMantraRelease]);

    const latestReleaseDateLabel = useMemo(() => {
        if (!latestMantraRelease?.createdAt) return '';
        return new Date(latestMantraRelease.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    }, [latestMantraRelease]);

    useEffect(() => {
        const recentEntries = readRecentlyPlayedMantras();
        setRecentlyPlayedIds(recentEntries.map(item => item.id));
    }, []);

    const recentlyPlayedTracks = useMemo(() => {
        return recentlyPlayedIds
            .map(id => ALL_TRACKS.find(track => track.id === id))
            .filter((track): track is AudioTrack => !!track)
            .slice(0, 3);
    }, [recentlyPlayedIds, ALL_TRACKS]);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(MANTRA_DURATION_CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Record<string, number>;
            setDurationCacheByUrl(parsed);
        } catch (error) {
            console.warn('[MantraExplorer] Failed to read duration cache:', error);
        }
    }, []);

    useEffect(() => {
        if (!ALL_TRACKS.length || !Object.keys(durationCacheByUrl).length) return;
        setDurationByTrackId(prev => {
            const next = { ...prev };
            let changed = false;
            for (const track of ALL_TRACKS) {
                if (next[track.id]) continue;
                if (!track.audioUrl) continue;
                const cachedDuration = durationCacheByUrl[track.audioUrl];
                if (cachedDuration && cachedDuration > 0) {
                    next[track.id] = cachedDuration;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [ALL_TRACKS, durationCacheByUrl]);

    useEffect(() => {
        const tracksToResolve = ALL_TRACKS.filter(track => (
            !!track.audioUrl &&
            !durationByTrackId[track.id] &&
            !durationCacheByUrl[track.audioUrl]
        ));

        if (!tracksToResolve.length) return;

        let cancelled = false;

        const resolveDurations = async () => {
            const resolvedByTrack: Record<string, number> = {};
            const resolvedByUrl: Record<string, number> = {};

            for (const track of tracksToResolve) {
                if (cancelled || !track.audioUrl) break;
                const duration = await loadAudioDuration(track.audioUrl);
                if (cancelled) break;
                if (!duration || duration <= 0) continue;
                resolvedByTrack[track.id] = duration;
                resolvedByUrl[track.audioUrl] = duration;
            }

            if (cancelled) return;

            if (Object.keys(resolvedByTrack).length) {
                setDurationByTrackId(prev => ({ ...prev, ...resolvedByTrack }));
            }

            if (Object.keys(resolvedByUrl).length) {
                setDurationCacheByUrl(prev => {
                    const next = { ...prev, ...resolvedByUrl };
                    try {
                        window.localStorage.setItem(
                            MANTRA_DURATION_CACHE_KEY,
                            JSON.stringify(next)
                        );
                    } catch (error) {
                        console.warn('[MantraExplorer] Failed to write duration cache:', error);
                    }
                    return next;
                });
            }
        };

        resolveDurations();
        return () => {
            cancelled = true;
        };
    }, [ALL_TRACKS, durationByTrackId, durationCacheByUrl]);

    const getRoundedDurationMinutes = (track: AudioTrack) => {
        const seconds = durationByTrackId[track.id] || track.duration || 0;
        return roundSecondsToMinutes(seconds);
    };

    const buildMantraShareUrl = (track: AudioTrack) => {
        const typeParam = track.category === 'SHIVA' ? 'SHIVA' : 'MANTRA';
        const params = new URLSearchParams({
            track: track.id,
            type: typeParam,
        });

        if (track.audioUrl) {
            params.set('audioUrl', track.audioUrl);
        }

        return `${window.location.origin}/player?${params.toString()}`;
    };

    const activeShareUrl = useMemo(
        () => (shareTrack ? buildMantraShareUrl(shareTrack) : ''),
        [shareTrack]
    );

    const shareQrCodeUrl = useMemo(() => {
        if (!activeShareUrl) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(activeShareUrl)}`;
    }, [activeShareUrl]);

    const openShareModal = (track: AudioTrack) => {
        setShareTrack(track);
        setCopiedShareLink(false);
        triggerHaptic('light');
    };

    const closeShareModal = () => {
        setShareTrack(null);
    };

    const copyShareLink = async () => {
        if (!activeShareUrl || !navigator.clipboard) return;
        try {
            await navigator.clipboard.writeText(activeShareUrl);
            setCopiedShareLink(true);
            window.setTimeout(() => setCopiedShareLink(false), 1800);
            triggerHaptic('light');
        } catch (error) {
            console.warn('[MantraExplorer] Failed to copy share link:', error);
        }
    };

    const shareViaNative = async () => {
        if (!shareTrack || !activeShareUrl) return;
        const shareText = `Listen to ${shareTrack.title} on School of Breath`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: shareTrack.title,
                    text: shareText,
                    url: activeShareUrl,
                });
            } else {
                await copyShareLink();
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') return;
            console.warn('[MantraExplorer] Native share failed:', error);
        }
    };

    const openSocialShare = (platform: 'whatsapp' | 'x' | 'facebook') => {
        if (!shareTrack || !activeShareUrl) return;

        const text = `Listen to ${shareTrack.title} on School of Breath`;
        const encodedUrl = encodeURIComponent(activeShareUrl);
        const encodedText = encodeURIComponent(text);

        const links = {
            whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
            x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
        };

        window.open(links[platform], '_blank', 'noopener,noreferrer');
    };

    const renderShareModal = () => {
        if (!shareTrack || !activeShareUrl) return null;

        return (
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                onClick={closeShareModal}
            >
                <div
                    className="w-full max-w-md rounded-[21px] bg-white dark:bg-brand-darkSurface border border-brand-light/50 dark:border-brand-darkBorder card-standard p-5 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-medium/60 dark:text-brand-darkTextMuted">
                                Share Favorite Mantra
                            </p>
                            <h3 className="font-serif font-bold text-lg text-brand-dark dark:text-white leading-tight mt-1">
                                {shareTrack.title}
                            </h3>
                        </div>
                        <button
                            onClick={closeShareModal}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            aria-label="Close share"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="rounded-2xl bg-[#F5F3F0]/60 dark:bg-black/20 border border-brand-light/60 dark:border-brand-darkBorder p-4 flex items-center justify-center">
                        {shareQrCodeUrl ? (
                            <img
                                src={shareQrCodeUrl}
                                alt={`QR code for ${shareTrack.title}`}
                                className="w-48 h-48 rounded-xl bg-white p-2"
                            />
                        ) : (
                            <div className="w-48 h-48 rounded-xl bg-white/70 dark:bg-white/10 animate-pulse" />
                        )}
                    </div>

                    <div className="rounded-2xl bg-white dark:bg-black/25 border border-brand-light/60 dark:border-brand-darkBorder px-3 py-2">
                        <p className="text-[10px] text-brand-medium/60 dark:text-brand-darkTextMuted uppercase tracking-widest mb-1">
                            Share Link
                        </p>
                        <p className="text-[11px] text-brand-dark/80 dark:text-white/80 break-all leading-relaxed">
                            {activeShareUrl}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={copyShareLink}
                            className="px-3 py-2.5 rounded-2xl border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-black/20 text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                            <Copy size={14} />
                            {copiedShareLink ? 'Copied' : 'Copy Link'}
                        </button>
                        <button
                            onClick={shareViaNative}
                            className="px-3 py-2.5 rounded-2xl bg-brand-gold text-brand-dark text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                            <Share2 size={14} />
                            Share
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => openSocialShare('whatsapp')}
                            className="px-2 py-2 rounded-xl text-[11px] font-semibold border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-black/20"
                        >
                            WhatsApp
                        </button>
                        <button
                            onClick={() => openSocialShare('x')}
                            className="px-2 py-2 rounded-xl text-[11px] font-semibold border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-black/20"
                        >
                            X
                        </button>
                        <button
                            onClick={() => openSocialShare('facebook')}
                            className="px-2 py-2 rounded-xl text-[11px] font-semibold border border-brand-light dark:border-brand-darkBorder bg-white dark:bg-black/20"
                        >
                            Facebook
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const handleMantraPress = async (
        track: AudioTrack,
        index: number,
        options?: { forceAccess?: boolean }
    ) => {
        if (index < 0) {
            console.warn('[MantraExplorer] handleMantraPress: originalIndex is -1 for track', {
                trackId: track.id,
                title: track.title,
                audioUrl: track.audioUrl,
            });
        }

        // Premium logic - use isPremium flag from API; non-premium mantras are always accessible
        const canAccess = options?.forceAccess ?? (!track.isPremium || isUserPremium);
        
        if (!canAccess) {
            triggerHaptic('warning');
            // Show subscription modal or navigate to subscription page
            navigate('/subscription');
            return;
        }
        
        triggerHaptic('medium');

        // Ensure we have audioUrl - get it from the original mantra data if not in track
        let audioUrl = track.audioUrl;
        
        // Try to find the mantra in the API data
        if (!audioUrl && data?.mantras) {
            const mantra = data.mantras.find(m => m._id === track.id || m.id === track.id);
            if (mantra) {
                audioUrl = mantra.audioUrl; // Use audioUrl from API
                // Debug log if still not found
                if (!audioUrl) {
                    console.warn('[MantraExplorer] Mantra found but no audioUrl:', {
                        mantraId: mantra._id,
                        title: mantra.title,
                        mantra: mantra
                    });
                }
            } else {
                console.warn('[MantraExplorer] Mantra not found in API data:', {
                    trackId: track.id,
                    trackTitle: track.title,
                    availableMantraIds: data.mantras.map(m => m._id || m.id)
                });
            }
        }

        // Navigate to player with audioUrl - always include it for API mantras
        if (audioUrl) {
            navigate(`/player?track=${track.id}&type=MANTRA&audioUrl=${encodeURIComponent(audioUrl)}`);
        } else {
            // Fallback: try to fetch the mantra from API directly
            console.warn('[MantraExplorer] No audioUrl found for track, attempting to fetch from API:', track.id);
            try {
                const auth = await getStoredAuth();
                const email = auth?.email || 'guest@example.com';
                const { fetchMantraTrack } = await import('../services/mantrasService');
                const fetchedMantra = await fetchMantraTrack(track.id, email);
                
                if (fetchedMantra?.audioUrl) {
                    navigate(`/player?track=${track.id}&type=MANTRA&audioUrl=${encodeURIComponent(fetchedMantra.audioUrl)}`);
                } else {
                    console.error('[MantraExplorer] Failed to fetch audioUrl from API for track:', track.id);
                    // Still navigate - AudioPlayer will handle the fallback
                    navigate(`/player?track=${track.id}&type=MANTRA`);
                }
            } catch (error) {
                console.error('[MantraExplorer] Error fetching mantra track:', error);
                // Still navigate - AudioPlayer will handle the fallback
                navigate(`/player?track=${track.id}&type=MANTRA`);
            }
        }
    };

    const handleLockPress = () => {
        navigate('/subscription');
    };

    const activeMoodLabel = useMemo(() => 
        BENEFIT_CATEGORIES.find(m => m.id === selectedMoodId)?.label, 
    [selectedMoodId]);

    // Loading state
    if (shouldShowLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#F5F3F0] to-white dark:from-brand-darkBase dark:to-brand-darkSurface transition-colors duration-300">
                <ZenLoadingScreen 
                    fullScreen={true}
                    messages={[
                        "Preparing your sacred space...",
                        "Connecting to ancient vibrations...",
                        "Awakening mantric energy...",
                        "Tuning into divine frequencies...",
                    ]}
                />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-[#F5F3F0] dark:bg-brand-darkBase flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-red-500 mb-4">Failed to load mantras. Please try again.</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="bg-brand-gold text-brand-dark px-6 py-2 rounded-full font-bold"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'DASHBOARD') {
        return (
            <>
                <div className="h-[100dvh] bg-[#F5F3F0] dark:bg-brand-darkBase flex flex-col animate-fade-in overflow-y-auto overflow-x-hidden no-scrollbar pb-24">
                    <div className="bg-[#F5F3F0]/90 dark:bg-brand-darkBase/90 backdrop-blur-xl p-6 pt-12 pb-4 z-30 transition-colors duration-300 shrink-0">
                    <div className="flex items-center gap-4 mb-6">
                        <button 
                            onClick={handleBack} 
                            className="relative p-3 bg-white/80 dark:bg-white/10 rounded-full hover:bg-white dark:hover:bg-white/20 transition-all duration-300 border-2 border-brand-light/40 dark:border-white/20 shadow-lg active:scale-95 group"
                            style={{
                                boxShadow: '0 4px 20px rgba(212, 165, 116, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            }}
                        >
                            <div className="absolute inset-0 rounded-full bg-brand-gold/5 dark:bg-brand-gold/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <ArrowLeft size={20} className="relative z-10 text-brand-dark dark:text-white group-hover:text-brand-gold dark:group-hover:text-brand-gold transition-colors duration-300" strokeWidth={2.5} />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl font-serif font-bold dark:text-white">Mantra Explorer</h1>
                            <p className="text-[10px] text-brand-medium/60 dark:text-brand-darkTextMuted font-bold uppercase tracking-widest">Find your vibration</p>
                        </div>
                        {(selectedMoodId || searchQuery) && (
                            <button 
                                onClick={() => { setSelectedMoodId(null); setSearchQuery(''); }}
                                className="text-[10px] font-bold text-brand-primary uppercase tracking-widest border border-brand-light/50 px-3 py-1 rounded-full bg-brand-light/20 dark:bg-brand-darkSurface"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="text-brand-medium/40 group-focus-within:text-brand-gold transition-colors" size={18} />
                        </div>
                        <input 
                            type="text"
                            placeholder="Search by deity, benefit, or title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-brand-darkSurface rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30 dark:text-white shadow-sm border border-brand-light dark:border-brand-darkBorder transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center">
                                <X size={16} className="text-brand-medium/40" />
                            </button>
                        )}
                    </div>
                </div>

                    <div className="p-6 pt-2 space-y-8">
                    {/* Your Sacred Gems Section */}
                    {heartedTracks.length > 0 && !searchQuery && !selectedMoodId && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-bold text-brand-gold uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Heart size={12} className="fill-brand-gold" /> Your Favorites
                                </h3>
                                <button 
                                    onClick={() => navigateToStep('FAVORITES')}
                                    className="text-[10px] font-bold text-brand-medium/50 hover:text-brand-gold transition-colors uppercase tracking-widest"
                                >
                                    See All
                                </button>
                            </div>
                            <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                                {heartedTracks.slice(0, 5).map((track, idx) => {
                                    const originalIndex = ALL_TRACKS.findIndex(t => t.id === track.id);
                                    const canAccess = !track.isPremium || isUserPremium;
                                    const chakraBgColors = getChakraBgColor(idx);
                                    return (
                                    <div 
                                        key={track.id}
                                            onClick={() => canAccess ? handleMantraPress(track, originalIndex) : handleLockPress()}
                                        className="shrink-0 w-40 relative bg-white dark:bg-brand-darkSurface p-4 rounded-[21px] border border-brand-light/50 dark:border-brand-darkBorder card-standard group active:scale-95 transition-transform hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden"
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
                                        <div className="relative z-10">
                                            <div className="absolute -top-1 -right-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openShareModal(track);
                                                    }}
                                                    className="w-7 h-7 rounded-full bg-white/80 dark:bg-black/40 border border-white/70 dark:border-white/20 text-brand-medium dark:text-white flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                                                    aria-label={`Share ${track.title}`}
                                                >
                                                    <Share2 size={13} />
                                                </button>
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl ${getChakraColor(idx)} flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                                                <Play size={18} fill="currentColor" />
                                            </div>
                                            <h4 className="font-bold text-xs dark:text-white line-clamp-1 mb-1">{track.title}</h4>
                                            <p className="text-[9px] text-brand-medium/60 font-bold uppercase tracking-wider">{track.deity || 'Universal'}</p>
                                        </div>
                                            {!canAccess && (
                                                <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-[2px] rounded-[21px] flex items-center justify-center z-20">
                                                    <Lock size={16} className="text-brand-gold" />
                                                </div>
                                            )}
                                    </div>
                                    );
                                })}
                                <div 
                                    onClick={() => navigateToStep('FAVORITES')}
                                    className="shrink-0 w-40 bg-brand-light/20 dark:bg-white/5 rounded-[21px] border border-dashed border-brand-light/50 dark:border-brand-darkBorder/50 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
                                >
                                    <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                                        <Heart size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">Library</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recently Played */}
                    {recentlyPlayedTracks.length > 0 && !searchQuery && !selectedMoodId && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-bold text-brand-medium/60 dark:text-brand-darkTextMuted uppercase tracking-[0.25em] flex items-center gap-2">
                                    <Clock size={12} /> Recently Played
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {recentlyPlayedTracks.map((track, idx) => {
                                    const originalIndex = ALL_TRACKS.findIndex(t => t.id === track.id);
                                    const canAccess = !track.isPremium || isUserPremium;
                                    const isLocked = !canAccess;
                                    const chakraColor = getChakraColor(idx);
                                    const chakraBgColors = getChakraBgColor(idx);
                                    const roundedDurationMinutes = getRoundedDurationMinutes(track);

                                    return (
                                        <div
                                            key={`recent-${track.id}`}
                                            onClick={() => canAccess ? handleMantraPress(track, originalIndex) : handleLockPress()}
                                            className={`group relative bg-white dark:bg-brand-darkSurface p-4 rounded-[21px] border border-brand-light/50 dark:border-brand-darkBorder/50 card-standard flex items-center justify-between hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out cursor-pointer overflow-hidden backdrop-blur-sm ${isLocked ? 'opacity-80' : ''}`}
                                        >
                                            <div
                                                className="absolute inset-0 rounded-[21px] pointer-events-none transition-opacity duration-300"
                                                style={{ backgroundColor: chakraBgColors.light }}
                                            />
                                            <div
                                                className="absolute inset-0 rounded-[21px] pointer-events-none dark:opacity-100 opacity-0 transition-opacity duration-300"
                                                style={{ backgroundColor: chakraBgColors.dark }}
                                            />
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`w-14 h-14 rounded-[18px] ${chakraColor} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all`}>
                                                    <Play size={20} fill="currentColor" className="ml-0.5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm dark:text-white group-hover:text-brand-gold transition-colors">
                                                        {track.title}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-[10px] bg-brand-light dark:bg-white/5 text-brand-medium dark:text-brand-darkTextMuted px-2.5 py-1 rounded-full border border-black/5 dark:border-white/5 font-medium">
                                                            {track.deity || 'Universal'}
                                                        </span>
                                                        <span className="text-[10px] text-brand-medium/40 dark:text-brand-darkTextMuted/60 flex items-center gap-1">
                                                            <Clock size={10} /> {roundedDurationMinutes > 0 ? `${roundedDurationMinutes} min` : '...'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isLocked && (
                                                <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-[2px] rounded-[21px] flex items-center justify-center z-20">
                                                    <div className="flex items-center gap-2 bg-white/90 dark:bg-brand-darkSurface/90 px-3 py-1.5 rounded-xl border border-brand-dark/10">
                                                        <Lock size={14} className="text-brand-dark dark:text-white" />
                                                        <span className="text-xs font-bold text-brand-dark dark:text-white">
                                                            Premium
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!searchQuery && !selectedMoodId && (
                        <div className="grid grid-cols-2 gap-4">
                            <div 
                                onClick={() => navigateToStep('DEITY_GRID')}
                                className="relative aspect-square rounded-[21px] overflow-hidden group cursor-pointer card-standard active:scale-95 transition-all bg-gray-200 dark:bg-brand-darkSurface"
                            >
                                <img src={DEITY_CATEGORIES[0].image} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Deity Path" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1A4D5C] via-[#1A4D5C]/20 to-transparent" />
                                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 border border-white/20">
                                        <Map size={20} className="text-brand-gold" />
                                    </div>
                                    <h3 className="text-lg font-serif font-bold text-white">Deity Path</h3>
                                    <p className="text-[9px] text-white/70 uppercase font-bold tracking-widest mt-0.5">Explore Lineage</p>
                                </div>
                            </div>

                            <div 
                                onClick={() => navigateToStep('MOOD')}
                                className="relative aspect-square rounded-[21px] overflow-hidden group cursor-pointer card-standard active:scale-95 transition-all bg-gradient-to-br from-indigo-500 to-purple-700"
                            >
                                <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                                     <Sparkles className="absolute top-4 right-4 text-white animate-pulse" size={24} />
                                     <Music2 className="absolute bottom-4 left-4 text-white animate-float opacity-30" size={60} />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 border border-white/20">
                                        <Compass size={20} className="text-brand-gold" />
                                    </div>
                                    <h3 className="text-lg font-serif font-bold text-white">Benefit Path</h3>
                                    <p className="text-[9px] text-white/70 uppercase font-bold tracking-widest mt-0.5">Emotional States</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!searchQuery && !selectedMoodId && latestReleaseTrack && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xs font-bold text-brand-medium/50 dark:text-brand-darkTextMuted uppercase tracking-[0.2em]">
                                    New Mantra Release
                                </h2>
                                {latestReleaseDateLabel && (
                                    <span className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">
                                        {latestReleaseDateLabel}
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    const originalIndex = ALL_TRACKS.findIndex(t => t.id === latestReleaseTrack.id);
                                    const releaseCanAccess = !latestReleaseTrack.isPremium || isUserPremium;

                                    handleMantraPress(
                                        latestReleaseTrack,
                                        originalIndex,
                                        { forceAccess: releaseCanAccess }
                                    );
                                }}
                                className="group w-full relative bg-white dark:bg-brand-darkSurface p-4 rounded-[21px] border border-brand-light/50 dark:border-brand-darkBorder/50 card-standard flex items-center justify-between hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] active:scale-[0.98] active:opacity-90 transition-all duration-200 ease-out overflow-hidden"
                            >
                                <div className="absolute -inset-px rounded-[21px] pointer-events-none bg-brand-light/10 dark:bg-white/5 opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/12 via-transparent to-transparent pointer-events-none" />
                                <div className="absolute -left-16 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-brand-gold/15 blur-2xl pointer-events-none" />
                                <div className="flex items-center gap-4 relative z-10 text-left">
                                    <div className="relative w-14 h-14 rounded-[18px] bg-gradient-to-br from-brand-gold to-amber-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all">
                                        <span className="absolute inset-0 rounded-[18px] border border-white/40 animate-pulse-slow" />
                                        <Play size={20} fill="currentColor" className="ml-0.5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm dark:text-white group-hover:text-brand-gold transition-colors">
                                            {latestReleaseTrack.title}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] bg-brand-light dark:bg-white/5 text-brand-medium dark:text-brand-darkTextMuted px-2.5 py-1 rounded-full border border-black/5 dark:border-white/5 font-medium">
                                                {latestReleaseTrack.deity || 'Universal'}
                                            </span>
                                            <span className="text-[10px] text-brand-medium/40 dark:text-brand-darkTextMuted/60 flex items-center gap-1">
                                                <Clock size={10} /> {(() => {
                                                    const roundedDurationMinutes = getRoundedDurationMinutes(latestReleaseTrack);
                                                    return roundedDurationMinutes > 0 ? `${roundedDurationMinutes} min` : '...';
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative z-10 text-right">
                                    <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary bg-brand-light/20 dark:bg-brand-darkSurface px-2 py-1 rounded-full border border-brand-light/50 dark:border-brand-darkBorder/50">
                                        <Sparkles size={12} />
                                        New
                                    </div>
                                    <div className="mt-1 flex justify-end">
                                        <span className="relative inline-flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-gold/70 animate-ping" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-gold" />
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-brand-medium/50 dark:text-brand-darkTextMuted mt-1">
                                        Tap to discover
                                    </p>
                                </div>
                            </button>
                        </div>
                    )}

                    <div className="space-y-4 pb-24">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xs font-bold text-brand-medium/50 dark:text-brand-darkTextMuted uppercase tracking-[0.2em]">
                                {selectedMoodId ? `Feeling: ${activeMoodLabel} (${filteredTracks.length})` : searchQuery ? `Search Results (${filteredTracks.length})` : 'Full Mantra Library'}
                            </h2>
                            {!searchQuery && !selectedMoodId && <Music2 size={16} className="text-brand-gold animate-pulse-slow" />}
                        </div>

                        {filteredTracks.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredTracks.map((track, idx) => {
                                    // Find original index in ALL_TRACKS for premium check
                                    const originalIndex = ALL_TRACKS.findIndex(t => t.id === track.id);
                                    // Premium logic - use isPremium flag from API
                                    const canAccess = !track.isPremium || isUserPremium;
                                    const isLocked = !canAccess;
                                    // Check if favorited - same logic as guided meditation
                                    // Check API favorites array (contains user IDs) first, then fallback to local
                                    const mantra = data?.mantras?.find(m => m._id === track.id || m.id === track.id);
                                    const isHearted = (authData?.userId && mantra?.favorites?.includes(authData.userId)) 
                                        || heartedMantraIds.includes(track.id);
                                    const chakraColor = getChakraColor(idx);
                                    const chakraBgColors = getChakraBgColor(idx);
                                    const roundedDurationMinutes = getRoundedDurationMinutes(track);
                                    return (
                                        <div 
                                            key={track.id}
                                            onClick={() => canAccess ? handleMantraPress(track, originalIndex) : handleLockPress()}
                                            className={`group relative bg-white dark:bg-brand-darkSurface p-4 rounded-[21px] border border-brand-light/50 dark:border-brand-darkBorder/50 card-standard flex items-center justify-between hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] active:scale-[0.98] active:opacity-90 transition-all duration-150 ease-out cursor-pointer overflow-hidden backdrop-blur-sm ${isLocked ? 'opacity-80' : ''}`}
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
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`w-14 h-14 rounded-[18px] ${chakraColor} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all`}>
                                                    <Play size={20} fill="currentColor" className="ml-0.5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm dark:text-white group-hover:text-brand-gold transition-colors">{track.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-[10px] bg-brand-light dark:bg-white/5 text-brand-medium dark:text-brand-darkTextMuted px-2.5 py-1 rounded-full border border-black/5 dark:border-white/5 font-medium">
                                                            {track.deity || 'Universal'}
                                                        </span>
                                                        <span className="text-[10px] text-brand-medium/40 dark:text-brand-darkTextMuted/60 flex items-center gap-1">
                                                            <Clock size={10} /> {roundedDurationMinutes > 0 ? `${roundedDurationMinutes} min` : '...'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Right: Heart & Lock */}
                                            <div className="flex items-center gap-2 relative z-10 shrink-0">
                                                {!isLocked && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleHeartMantra(track.id);
                                                    }}
                                                        className="p-2.5 rounded-full hover:bg-brand-gold/10 transition-all duration-300 group/heart relative"
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
                                                    <div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center">
                                                        <Lock size={14} className="text-brand-gold" />
                                                </div>
                                                )}
                                            </div>
                                            {/* Lock Overlay */}
                                            {isLocked && (
                                                <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-[2px] rounded-[21px] flex items-center justify-center z-20">
                                                    <div className="flex items-center gap-2 bg-white/90 dark:bg-brand-darkSurface/90 px-3 py-1.5 rounded-xl border border-brand-dark/10">
                                                        <Lock size={14} className="text-brand-dark dark:text-white" />
                                                        <span className="text-xs font-bold text-brand-dark dark:text-white">
                                                            Premium
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 animate-fade-in">
                                <Search size={48} className="mx-auto mb-4 text-brand-medium/20" />
                                <p className="font-serif text-lg text-brand-medium/60">No chants found for your filters</p>
                                <button onClick={() => { setSelectedMoodId(null); setSearchQuery(''); }} className="mt-4 text-brand-gold font-bold text-xs uppercase tracking-widest">Clear All Filters</button>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
                {renderShareModal()}
            </>
        );
    }

    if (step === 'MOOD') {
        return (
            <div className="min-h-screen bg-[#F5F3F0] dark:bg-brand-darkBase p-6 flex flex-col animate-fade-in no-scrollbar">
                <div className="flex items-center gap-4 mb-10 pt-6">
                    <button onClick={handleBack} className="p-2.5 bg-white/50 dark:bg-white/10 rounded-full hover:bg-white/80 transition-all border border-brand-light dark:border-brand-darkBorder active:scale-95">
                        <ArrowLeft size={20} className="dark:text-white" />
                    </button>
                    <h2 className="text-2xl font-serif font-bold dark:text-white">How do you want to feel?</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 flex-1">
                    {BENEFIT_CATEGORIES.map(mood => (
                        <button
                            key={mood.id}
                            onClick={() => { setSelectedMoodId(mood.id); setSearchQuery(''); navigateToStep('DASHBOARD'); }}
                            className={`bg-white dark:bg-brand-darkSurface p-6 rounded-[21px] flex flex-col items-center justify-center gap-4 border card-standard transition-all active:scale-95 relative overflow-hidden ${selectedMoodId === mood.id ? 'border-brand-primary/50 ring-1 ring-brand-primary/20' : 'border-brand-light/50 dark:border-brand-darkBorder/50'}`}
                        >
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${mood.color} flex items-center justify-center text-white shadow-lg`}>
                                <mood.icon size={24} />
                            </div>
                            <span className="font-bold text-sm dark:text-white text-center">{mood.label}</span>
                        </button>
                    ))}
                </div>
                
                <div className="mt-12 text-center pb-8">
                    <button onClick={() => { navigateToStep('DASHBOARD'); setSearchQuery(''); setSelectedMoodId(null); }} className="text-xs font-bold uppercase tracking-widest text-brand-medium/40 hover:text-brand-gold transition-colors">Skip to all mantras</button>
                </div>
            </div>
        );
    }

    if (step === 'DEITY_GRID') {
        return (
            <div className="min-h-screen bg-[#F5F3F0] dark:bg-brand-darkBase p-6 flex flex-col animate-fade-in no-scrollbar">
                <div className="flex items-center gap-4 mb-8 pt-6">
                    <button onClick={handleBack} className="p-2.5 bg-white/50 dark:bg-white/10 rounded-full hover:bg-white/80 transition-all border border-brand-light dark:border-brand-darkBorder active:scale-95">
                        <ArrowLeft size={20} className="dark:text-white" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-serif font-bold dark:text-white">Ancient Lineages</h2>
                        <p className="text-[10px] font-bold text-brand-medium/50 uppercase tracking-widest">Select a divine frequency</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-1">
                    {DEITY_CATEGORIES.map(deity => (
                        <div 
                            key={deity.id} 
                            onClick={() => { setSearchQuery(deity.label); setSelectedMoodId(null); navigateToStep('DASHBOARD'); }}
                            className="relative aspect-[4/5] rounded-[21px] overflow-hidden group card-standard cursor-pointer active:scale-95 transition-all bg-gray-200 dark:bg-brand-darkSurface"
                        >
                            <img src={deity.image} alt={deity.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                                <h3 className="text-xl font-serif font-bold text-white mb-1 leading-tight">{deity.label}</h3>
                                <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest">{deity.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pb-8 text-center">
                    <button onClick={handleBack} className="text-xs font-bold uppercase tracking-widest text-brand-medium/40 hover:text-brand-gold transition-colors">Close Deity Path</button>
                </div>
            </div>
        );
    }

    if (step === 'FAVORITES') {
        return (
            <>
                <div className="h-[100dvh] bg-[#F5F3F0] dark:bg-brand-darkBase flex flex-col animate-fade-in overflow-y-auto overflow-x-hidden no-scrollbar pb-24">
                    <div className="bg-[#F5F3F0]/90 dark:bg-brand-darkBase/90 backdrop-blur-xl p-6 pt-12 pb-6 z-30 border-b border-brand-light dark:border-brand-darkBorder shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2.5 bg-white/50 dark:bg-white/10 rounded-full hover:bg-white/80 transition-all border border-brand-light dark:border-brand-darkBorder active:scale-95">
                            <ArrowLeft size={20} className="dark:text-white" />
                        </button>
                        <h2 className="text-xl font-serif font-bold dark:text-white">Your Sacred Gems</h2>
                    </div>
                </div>
                
                    <div className="p-6 space-y-4 pb-6">
                    {heartedTracks.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {heartedTracks.map((track, idx) => {
                                const originalIndex = ALL_TRACKS.findIndex(t => t.id === track.id);
                                const canAccess = !track.isPremium || isUserPremium;
                                const isLocked = !canAccess;
                                // Check if favorited - same logic as guided meditation
                                const mantra = data?.mantras?.find(m => m._id === track.id || m.id === track.id);
                                const isHearted = (authData?.userId && mantra?.favorites?.includes(authData.userId)) 
                                    || heartedMantraIds.includes(track.id);
                                const chakraColor = getChakraColor(idx);
                                const chakraBgColors = getChakraBgColor(idx);
                                const roundedDurationMinutes = getRoundedDurationMinutes(track);
                                return (
                                    <div 
                                        key={track.id}
                                        onClick={() => canAccess ? handleMantraPress(track, originalIndex) : handleLockPress()}
                                            className={`group relative bg-white dark:bg-brand-darkSurface p-4 rounded-[21px] border border-brand-light/50 dark:border-brand-darkBorder/50 card-standard flex items-center justify-between hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all cursor-pointer overflow-hidden backdrop-blur-sm ${isLocked ? 'opacity-80' : ''}`}
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
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={`w-14 h-14 rounded-[18px] ${chakraColor} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all`}>
                                                <Play size={20} fill="currentColor" className="ml-0.5" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-sm dark:text-white group-hover:text-brand-gold transition-colors">{track.title}</h4>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[10px] bg-brand-light dark:bg-white/5 text-brand-medium dark:text-brand-darkTextMuted px-2.5 py-1 rounded-full border border-black/5 dark:border-white/5 font-medium">
                                                        {track.deity || 'Universal'}
                                                    </span>
                                                    <span className="text-[10px] text-brand-medium/40 dark:text-brand-darkTextMuted/60 flex items-center gap-1">
                                                        <Clock size={10} /> {roundedDurationMinutes > 0 ? `${roundedDurationMinutes} min` : '...'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Right: Heart & Lock */}
                                        <div className="flex items-center gap-2 relative z-10 shrink-0">
                                            {!isLocked && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openShareModal(track);
                                                }}
                                                className="p-2.5 rounded-full hover:bg-brand-gold/10 transition-all duration-300 relative"
                                                aria-label={`Share ${track.title}`}
                                            >
                                                <Share2 size={19} className="text-brand-medium/40 dark:text-brand-darkTextMuted/70" />
                                            </button>
                                            )}

                                            {!isLocked && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleHeartMantra(track.id);
                                                }}
                                                    className="p-2.5 rounded-full hover:bg-brand-gold/10 transition-all duration-300 group/heart relative"
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
                                                <div className="w-8 h-8 rounded-full bg-brand-gold/10 flex items-center justify-center">
                                                    <Lock size={14} className="text-brand-gold" />
                                            </div>
                                            )}
                                        </div>
                                        {/* Lock Overlay */}
                                        {isLocked && (
                                            <div className="absolute inset-0 bg-white/50 dark:bg-black/30 backdrop-blur-[2px] rounded-[21px] flex items-center justify-center z-20">
                                                <div className="flex items-center gap-2 bg-white/90 dark:bg-brand-darkSurface/90 px-3 py-1.5 rounded-xl border border-brand-dark/10">
                                                    <Lock size={14} className="text-brand-dark dark:text-white" />
                                                    <span className="text-xs font-bold text-brand-dark dark:text-white">
                                                        Premium
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 animate-fade-in flex flex-col items-center">
                            <div className="w-20 h-20 bg-brand-gold/5 rounded-full flex items-center justify-center mb-6">
                                <Heart size={40} className="text-brand-gold/20" />
                            </div>
                            <h3 className="font-serif text-lg text-brand-medium/60 mb-2">No Sacred Gems Yet</h3>
                            <p className="text-xs text-brand-medium/40 max-w-[200px] mx-auto mb-8">Heart the mantras you love to see them here.</p>
                            <button onClick={() => navigateToStep('DASHBOARD')} className="bg-brand-gold text-brand-dark px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-gold/20 active:scale-95 transition-transform">Explore Library</button>
                        </div>
                    )}
                    </div>
                </div>
                {renderShareModal()}
            </>
        );
    }

    return null; 
};
