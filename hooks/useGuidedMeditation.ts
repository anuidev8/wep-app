import { useState, useEffect } from 'react';
import { fetchGuidedMeditation, GuidedMeditationResponse } from '../services/guidedMeditationService';
import { getStoredAuth } from '../services/authService';
import { getPageCache, setPageCache } from '../utils/pageCache';

const CACHE_KEY = 'guided_meditation';

export const useGuidedMeditation = () => {
  const [data, setData] = useState<GuidedMeditationResponse | null>(() =>
    getPageCache<GuidedMeditationResponse>(CACHE_KEY)
  );
  const [loading, setLoading] = useState(() => !getPageCache<GuidedMeditationResponse>(CACHE_KEY));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cached = getPageCache<GuidedMeditationResponse>(CACHE_KEY);
    const loadData = async () => {
      try {
        if (!cached) setLoading(true);
        setError(null);

        const auth = await getStoredAuth();
        const email = auth?.email || 'guest@example.com';

        const result = await fetchGuidedMeditation(email);
        setData(result);
        setPageCache(CACHE_KEY, result);
      } catch (err) {
        console.error('[useGuidedMeditation] Error loading data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, loading, error };
};

