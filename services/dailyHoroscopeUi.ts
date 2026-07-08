import type { DailyPersonalHoroscopeResponse } from './astroApi';

type DailyHoroscopeData = DailyPersonalHoroscopeResponse['data'];

type BreathId = 'box' | 'alt_nostril' | '4_7_8' | '6_3_9';

interface BreathRecommendation {
  name: string;
  pattern: string;
  durationHint: string;
  bestFor: string;
  howTo: string;
  deepLink: string;
}

export interface DailyHoroscopeUI {
  header: {
    title: string;
    date: string;
    theme: string;
    summary: string;
  };
  scores: {
    overall: number;
    love: number;
    career: number;
    money: number;
    health: number;
    highlights?: any;
  };
  vibe: {
    moonSign?: string;
    moonPhase?: string;
    focusAreas?: any;
  };
  guidance: {
    do: string[];
    dont: string[];
  };
  breathing: {
    title: string;
    description: string;
    recommended: BreathRecommendation[];
  };
}

const breathingLibrary: Record<BreathId, BreathRecommendation> = {
  box: {
    name: 'Box Breathing',
    pattern: 'Inhale 4s – Hold 4s – Exhale 4s – Hold 4s',
    durationHint: 'Do 3–5 minutes.',
    bestFor: 'Focus, steadiness, pre-meeting calm.',
    howTo:
      'Sit upright, breathe in through the nose for 4 seconds, hold for 4, exhale through the mouth for 4, hold for 4, repeat.',
    // Map to FOCUS pattern
    deepLink: '/breathe?pattern=FOCUS',
  },
  alt_nostril: {
    name: 'Alternate Nostril Breathing',
    pattern: 'Slow equal inhale/exhale, switching nostrils each cycle.',
    durationHint: 'Do 5 minutes.',
    bestFor: 'Emotional balance, calming intense feelings.',
    howTo:
      'Use your right thumb to close the right nostril, inhale through left, close left, exhale through right; then inhale right, close right, exhale left, repeat.',
    // Map to BALANCE pattern
    deepLink: '/breathe?pattern=BALANCE',
  },
  '4_7_8': {
    name: '4–7–8 Breathing',
    pattern: 'Inhale 4s – Hold 7s – Exhale 8s',
    durationHint: 'Do 4–8 cycles.',
    bestFor: 'Anxiety, winding down, sleep support.',
    howTo:
      'Inhale quietly through the nose for 4 seconds, hold for 7, exhale fully through the mouth for 8 with a gentle whoosh sound.',
    // Map to REST pattern
    deepLink: '/breathe?pattern=REST',
  },
  '6_3_9': {
    name: '6–3–9 Breathing',
    pattern: 'Inhale 6s – Hold 3s – Exhale 9s',
    durationHint: 'Do 3–5 minutes.',
    bestFor: 'Deep relaxation, releasing tension, nervous system reset.',
    howTo:
      'Inhale smoothly through the nose for 6 seconds, hold for 3, exhale slowly for 9, keeping the exhale as smooth as possible.',
    // Map to CALM (diaphragmatic) pattern
    deepLink: '/breathe?pattern=CALM',
  },
};

const STORAGE_BREATH_PICK_KEY = 'daily_horoscope_breath_pick_v1';

export const generateDailyHoroscopeUI = (data: DailyHoroscopeData): DailyHoroscopeUI => {
  const { sign, date, scores, content, astro, personal } = data as any;

  const hasSunSquareMoon = astro?.highlights?.some((h: any) => h.key === 'sun_square_moon');

  const isStressy = (scores?.health ?? 50) < 60 || Boolean(hasSunSquareMoon);

  const isHighFocus =
    astro?.moon_sign?.key === 'scorpio' || content?.keywords?.includes('Adventure');

  const loveScore = scores?.love ?? 50;

  const pickPrimaryBreath = (): BreathId => {
    const doText = (content?.do || []).join(' ').toLowerCase();
    const themeText = String(content?.theme || '').toLowerCase();
    const full = `${doText} ${themeText}`;

    const candidates: BreathId[] = [];

    // Context-based mapping from "Do Today" section and theme
    if (/(sleep|rest|wind down|night|bedtime)/.test(full)) {
      candidates.push('4_7_8', '6_3_9');
    }
    if (/(relax|calm|anxiety|nervous system|soothe)/.test(full)) {
      candidates.push('6_3_9', 'alt_nostril');
    }
    if (/(focus|concentrate|deep work|clarity|productivity)/.test(full)) {
      candidates.push('box', '6_3_9');
    }
    if (/(balance|relationship|love|emotions|emotional)/.test(full) || loveScore >= 60) {
      candidates.push('alt_nostril', 'box');
    }

    // Fallback to astro-based heuristics
    if (candidates.length === 0) {
      if (isStressy) candidates.push('6_3_9', 'alt_nostril');
      if (isHighFocus) candidates.push('box', 'alt_nostril');
    }

    if (candidates.length === 0) {
      candidates.push('box', 'alt_nostril', '6_3_9', '4_7_8');
    }

    const uniqueCandidates = Array.from(new Set(candidates));

    const dateKey = String(date || '').trim();
    let lastPick: string | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_BREATH_PICK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.date === dateKey) {
          lastPick = parsed?.breath;
        }
      }
    } catch {
      lastPick = null;
    }

    let choice = uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
    if (lastPick && uniqueCandidates.length > 1) {
      let attempts = 0;
      while (choice === lastPick && attempts < 4) {
        choice = uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
        attempts += 1;
      }
    }

    try {
      localStorage.setItem(
        STORAGE_BREATH_PICK_KEY,
        JSON.stringify({ date: dateKey, breath: choice })
      );
    } catch {
      // Ignore storage errors
    }

    return choice;
  };

  const primaryBreathId = pickPrimaryBreath();
  const chosenBreath = breathingLibrary[primaryBreathId];

  return {
    header: {
      title: `Your day, ${String(sign || '').toUpperCase()}`,
      date,
      theme: content?.theme,
      summary: content?.text,
    },
    scores: {
      overall: scores?.overall,
      love: scores?.love,
      career: scores?.career,
      money: scores?.money,
      health: scores?.health,
      highlights: (data as any).score_factors,
    },
    vibe: {
      moonSign: astro?.moon_sign?.label,
      moonPhase: astro?.moon_phase?.label,
      focusAreas: personal?.focus_areas,
    },
    guidance: {
      do: content?.do || [],
      dont: content?.dont || [],
    },
    breathing: {
      title: 'Breath for today',
      description:
        "One simple practice selected to match today’s energy and keep your nervous system steady.",
      recommended: [chosenBreath],
    },
  };
};
