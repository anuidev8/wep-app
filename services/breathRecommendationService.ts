import { UserStats, PatternProgress, UserPreferences } from '../types';
import { getNotificationPreferences, updateNotificationPreferences, saveNotification } from './notificationsService';

/**
 * Pick a simple recommended breathwork pattern based on history.
 * This is intentionally lightweight – the real intelligence lives in the Morning Ritual planner.
 */
const PATTERN_LABELS: Record<string, { title: string; description: string }> = {
  CALM: {
    title: 'Calm Diaphragmatic Breathing',
    description: 'Slow belly breathing to ground your nervous system.',
  },
  ENERGY: {
    title: 'Breath of Fire',
    description: 'Fast energizing breaths to wake up your system.',
  },
  BALANCE: {
    title: 'Alternate Nostril Breathing',
    description: 'Balancing both sides of the nervous system.',
  },
  BHRAMARI: {
    title: 'Bhramari (Humming Bee)',
    description: 'Soothing humming to release tension in the head and heart.',
  },
};

const chooseRecommendedPattern = (
  stats: UserStats,
  patternProgress: Record<string, PatternProgress>,
  userPreferences: UserPreferences | null
): string => {
  // New users: start with CALM
  if (stats.sessionsCompleted <= 3) {
    return 'CALM';
  }

  // If user often chooses energizing practices or has higher levels there, lean into ENERGY
  const energyLevel = patternProgress['ENERGY']?.level ?? 0;
  const calmLevel = patternProgress['CALM']?.level ?? 0;

  const prefersEnergy =
    userPreferences?.preferredPractices?.some((p) =>
      /fire|energy|bhastrika/i.test(p)
    ) || energyLevel > calmLevel + 1;

  if (prefersEnergy) {
    return 'ENERGY';
  }

  // If they’ve built a solid calm base, offer deeper nervous-system reset with BALANCE
  if (calmLevel >= 3) {
    return 'BALANCE';
  }

  // Otherwise keep reinforcing CALM
  return 'CALM';
};

/**
 * Create and store a recommendation notification, respecting user notification preferences.
 * This uses the existing backend notification system, which can fan out via push where available.
 */
export const maybeSendBreathworkRecommendation = async (
  stats: UserStats,
  patternProgress: Record<string, PatternProgress>,
  userPreferences: UserPreferences | null
): Promise<void> => {
  try {
    const prefsResult = await getNotificationPreferences();
    const prefs = (prefsResult.preferences || {}) as any;

    const masterEnabled = prefsResult.enabled ?? prefs.masterEnabled ?? true;
    const morningPrefs = prefs.morningRitual || {
      enabled: true,
      lastSent: null,
      time: '07:00',
    };

    if (!masterEnabled || morningPrefs.enabled === false) {
      return;
    }

    // Avoid sending the same recommendation more than once per day
    const today = new Date().toISOString().slice(0, 10);
    if (morningPrefs.lastSent && String(morningPrefs.lastSent).startsWith(today)) {
      return;
    }

    const patternId = chooseRecommendedPattern(stats, patternProgress, userPreferences);
    const meta = PATTERN_LABELS[patternId] || {
      title: 'Your next breathwork session',
      description: 'Return to your breath for a gentle reset.',
    };

    const title = 'Your next recommended breathwork';
    const body = `${meta.title} — ${meta.description}`;
    const deeplink = `/breathe?pattern=${patternId}`;

    await saveNotification(title, body, { deeplink });

    // Mark that we’ve sent a morning-ritual style recommendation today
    const updatedPrefs = {
      ...prefs,
      masterEnabled,
      morningRitual: {
        ...morningPrefs,
        lastSent: new Date().toISOString(),
      },
    };
    await updateNotificationPreferences(updatedPrefs);
  } catch (err) {
    // Fail silently; recommendations are a bonus, not critical path
    console.warn('[BreathRecommendation] Failed to send recommendation', err);
  }
};


