import { useState, useEffect } from 'react';
import {
  fetchChakraMusic,
  ChakraMusicResponse,
  filterChakraMusicByChakra,
} from '../services/chakraMantraService';
import { getStoredAuth } from '../services/authService';
import { getPageCache, setPageCache } from '../utils/pageCache';

const CACHE_KEY = 'chakra_music';

export const useChakraMusic = (chakraId: string | null = null) => {
  const [data, setData] = useState<ChakraMusicResponse | null>(() =>
    getPageCache<ChakraMusicResponse>(CACHE_KEY)
  );
  const [loading, setLoading] = useState(() => !getPageCache<ChakraMusicResponse>(CACHE_KEY));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cached = getPageCache<ChakraMusicResponse>(CACHE_KEY);
    const loadData = async () => {
      try {
        if (!cached) setLoading(true);
        setError(null);
        const auth = await getStoredAuth();
        const email = auth?.email || 'guest@example.com';
        const result = await fetchChakraMusic(email);
        setData(result);
        setPageCache(CACHE_KEY, result);
      } catch (err) {
        console.error('[useChakraMusic] Error loading data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const mantras = data?.musicList
    ? filterChakraMusicByChakra(data.musicList, chakraId)
    : [];
  const isUserPremium = data?.isPremium ?? false;

  return {
    data,
    mantras,
    isUserPremium,
    loading,
    error,
  };
};
