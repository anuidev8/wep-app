import { useState, useEffect } from 'react';
import { fetchMantras, MantrasResponse } from '../services/mantrasService';
import { getStoredAuth } from '../services/authService';
import { getPageCache, setPageCache } from '../utils/pageCache';

const CACHE_KEY = 'mantras';

export const useMantras = () => {
  const [data, setData] = useState<MantrasResponse | null>(() =>
    getPageCache<MantrasResponse>(CACHE_KEY)
  );
  const [loading, setLoading] = useState(() => !getPageCache<MantrasResponse>(CACHE_KEY));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cached = getPageCache<MantrasResponse>(CACHE_KEY);
    const loadData = async () => {
      try {
        if (!cached) setLoading(true);
        const auth = await getStoredAuth();
        const result = await fetchMantras(
          auth?.email || 'guest@example.com'
        );
        setData(result);
        setError(null);
        setPageCache(CACHE_KEY, result);
      } catch (err) {
        console.error('[useMantras] Error loading mantras:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, loading, error };
};

