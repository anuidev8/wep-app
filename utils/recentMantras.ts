export const RECENT_MANTRAS_STORAGE_KEY = 'recentMantras_v1';
const MAX_RECENT_MANTRAS = 3;

export interface RecentMantraEntry {
  id: string;
  title: string;
  deity?: string;
  image?: string;
  color?: string;
  durationSeconds?: number;
  playedAt: number;
}

const isRecentMantraEntry = (value: unknown): value is RecentMantraEntry => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RecentMantraEntry>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.playedAt === 'number'
  );
};

export const readRecentlyPlayedMantras = (): RecentMantraEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_MANTRAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentMantraEntry).slice(0, MAX_RECENT_MANTRAS);
  } catch {
    return [];
  }
};

const writeRecentlyPlayedMantras = (entries: RecentMantraEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      RECENT_MANTRAS_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_RECENT_MANTRAS))
    );
  } catch {
    // Best effort only.
  }
};

export const addRecentlyPlayedMantra = (
  entry: Omit<RecentMantraEntry, 'playedAt'> & { playedAt?: number }
) => {
  const playedAt = entry.playedAt ?? Date.now();
  const existing = readRecentlyPlayedMantras();
  const deduped = existing.filter(item => item.id !== entry.id);
  writeRecentlyPlayedMantras([{ ...entry, playedAt }, ...deduped]);
};
