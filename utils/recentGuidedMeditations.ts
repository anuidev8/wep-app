export const RECENT_GUIDED_MEDITATIONS_STORAGE_KEY = 'recentGuidedMeditations_v1';
const MAX_RECENT_GUIDED = 3;

export interface RecentGuidedMeditationEntry {
  id: string;
  title: string;
  category?: string;
  image?: string;
  color?: string;
  durationSeconds?: number;
  playedAt: number;
}

const isRecentGuidedMeditationEntry = (value: unknown): value is RecentGuidedMeditationEntry => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RecentGuidedMeditationEntry>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.playedAt === 'number'
  );
};

export const readRecentlyPlayedGuidedMeditations = (): RecentGuidedMeditationEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_GUIDED_MEDITATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentGuidedMeditationEntry).slice(0, MAX_RECENT_GUIDED);
  } catch {
    return [];
  }
};

const writeRecentlyPlayedGuidedMeditations = (entries: RecentGuidedMeditationEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      RECENT_GUIDED_MEDITATIONS_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_RECENT_GUIDED))
    );
  } catch {
    // Best effort only.
  }
};

export const addRecentlyPlayedGuidedMeditation = (
  entry: Omit<RecentGuidedMeditationEntry, 'playedAt'> & { playedAt?: number }
) => {
  const playedAt = entry.playedAt ?? Date.now();
  const existing = readRecentlyPlayedGuidedMeditations();
  const deduped = existing.filter(item => item.id !== entry.id);
  writeRecentlyPlayedGuidedMeditations([{ ...entry, playedAt }, ...deduped]);
};
