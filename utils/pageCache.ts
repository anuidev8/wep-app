/**
 * Session cache for page data so back navigation can restore instantly
 * without showing a loading spinner. Data is stored in sessionStorage
 * and optionally refreshed in the background.
 */

const PREFIX = 'page_cache_';
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export function getPageCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (TTL_MS > 0 && Date.now() - (ts || 0) > TTL_MS) return null;
    return data as T;
  } catch {
    return null;
  }
}

export function setPageCache(key: string, data: unknown): void {
  try {
    sessionStorage.setItem(
      PREFIX + key,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    // ignore quota / private mode
  }
}
