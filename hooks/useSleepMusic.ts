import { useState, useEffect, useMemo } from 'react';
import { getStoredAuth } from '../services/authService';
import {
  fetchSleepMusicByCategory,
  fetchSleepMusicPreview,
  fetchSleepMusicFavorites,
  toggleSleepMusicFavorite,
  MusicTrack,
  SleepMusicResponse,
} from '../services/sleepMusicService';
import { getPageCache, setPageCache } from '../utils/pageCache';

const CACHE_KEY = 'sleep_music';

type SleepMusicCache = { data: SleepMusicResponse | null; favorites: MusicTrack[] };

function readSleepCache(): SleepMusicCache | null {
  return getPageCache<SleepMusicCache>(CACHE_KEY);
}

export const useSleepMusic = (categoryId: string = '') => {
  const cached = readSleepCache();
  const [data, setData] = useState<SleepMusicResponse | null>(cached?.data ?? null);
  const [favorites, setFavorites] = useState<MusicTrack[]>(cached?.favorites ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const auth = await getStoredAuth();
      setIsAuthenticated(!!auth?.token);
      setUserId(auth?.userId || null);

      if (auth?.token) {
        const result = await fetchSleepMusicByCategory(auth.token, categoryId);
        setData(result);

        try {
          const favResult = await fetchSleepMusicFavorites(auth.token, categoryId);
          setFavorites(favResult.musicList || []);
          setPageCache(CACHE_KEY, { data: result, favorites: favResult.musicList || [] });
        } catch (favError) {
          console.warn('[useSleepMusic] Failed to fetch favorites:', favError);
          setFavorites([]);
          setPageCache(CACHE_KEY, { data: result, favorites: [] });
        }
      } else {
        const result = await fetchSleepMusicPreview(categoryId);
        setData(result);
        setFavorites([]);
        setPageCache(CACHE_KEY, { data: result, favorites: [] });
      }
    } catch (err) {
      console.error('[useSleepMusic] Error loading data:', err);
      if (showLoading) setError(err as Error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const silentRefresh = async () => {
    await loadData(false);
  };

  useEffect(() => {
    const hadCache = !!readSleepCache();
    loadData(hadCache ? false : true);
  }, [categoryId]);

  // Sort: free items first, then premium
  const sortedMusicList = useMemo(() => {
    if (!data?.musicList) return [];
    return [...data.musicList].sort((a, b) => {
      if (a.isPremium === b.isPremium) return 0;
      return a.isPremium ? 1 : -1;
    });
  }, [data]);

  const isUserPremium = data?.isPremium || false;

  const handleToggleFavorite = async (musicId: string) => {
    const auth = await getStoredAuth();
    if (!auth?.token) return;

    // Optimistic update - update local state immediately
    if (data?.musicList) {
      const updatedList = data.musicList.map(track => {
        if (track._id === musicId) {
          const isCurrentlyFavorited = track.favorites?.includes(userId || '');
          return {
            ...track,
            favorites: isCurrentlyFavorited
              ? track.favorites?.filter(id => id !== userId) || []
              : [...(track.favorites || []), userId || '']
          };
        }
        return track;
      });
      setData({ ...data, musicList: updatedList });
    }

    // Update favorites list optimistically
    const track = data?.musicList?.find(t => t._id === musicId);
    const isCurrentlyFavorited = track?.favorites?.includes(userId || '');
    if (isCurrentlyFavorited) {
      setFavorites(prev => prev.filter(f => f._id !== musicId));
    } else if (track) {
      setFavorites(prev => [...prev, track]);
    }

    // Make API call in background (non-blocking)
    try {
      await toggleSleepMusicFavorite(auth.token, musicId);
      // Silently refresh in background to sync with server (without showing loading screen)
      silentRefresh().catch(err => {
        console.error('[useSleepMusic] Background refresh failed:', err);
        // On error, silently retry without showing loading
        silentRefresh().catch(() => {
          // If retry also fails, do a full refresh with loading as last resort
          loadData(true);
        });
      });
    } catch (err) {
      console.error('[useSleepMusic] Error toggling favorite:', err);
      // Revert optimistic update on error - use silent refresh to avoid loading screen
      silentRefresh().catch(() => {
        // If silent refresh fails, do a full refresh with loading as last resort
        loadData(true);
      });
      throw err;
    }
  };

  const isFavorite = (trackId: string) => {
    if (!userId) return false;
    const track = data?.musicList?.find(t => t._id === trackId);
    return track?.favorites?.includes(userId) || false;
  };

  return {
    musicList: sortedMusicList,
    favorites,
    isUserPremium,
    isAuthenticated,
    userId,
    loading,
    error,
    refresh: loadData,
    toggleFavorite: handleToggleFavorite,
    isFavorite,
  };
};

