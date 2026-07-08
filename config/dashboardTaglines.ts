/**
 * Rotating dashboard taglines for The School of Breath hero section.
 * Each tagline is 3–4 words. Use directPlay for deep-links to specific tracks.
 */

import type { DirectPlayAction } from '../utils/taglineDirectPlay';

export type DashboardTaglineCategory =
  | 'breathwork'
  | 'sleep'
  | 'meditation'
  | 'kundalini'
  | 'chakra'
  | 'mantra'
  | 'stress'
  | 'focus'
  | 'healing';

export interface DashboardTagline {
  id: number;
  text: string;
  route: string;
  category: DashboardTaglineCategory;
  priority?: number;
  /** When set, navigates directly to a random track from the pool instead of section */
  directPlay?: DirectPlayAction;
}

const R = (path: string): string =>
  path.replace(/^\/#?\/?/, '').startsWith('/') ? path : `/${path.replace(/^\/?/, '')}`;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TAGLINES_RAW: DashboardTagline[] = [
  // Breathwork & Energy
  { id: 1, text: 'Energize your body', route: R('/courses'), category: 'breathwork' },
  { id: 2, text: 'Master ancient breathing', route: R('/courses'), category: 'breathwork' },
  { id: 3, text: 'Boost vitality now', route: R('/courses'), category: 'breathwork' },
  { id: 4, text: 'Transform with pranayama', route: R('/courses'), category: 'breathwork' },
  { id: 5, text: '9 days to vitality', route: R('/courses'), category: 'breathwork' },
  { id: 6, text: 'Ancient wisdom modern energy', route: R('/courses'), category: 'breathwork' },
  { id: 7, text: 'Unlock breath power', route: R('/courses'), category: 'breathwork' },
  { id: 8, text: 'Activate prana feel alive', route: R('/courses'), category: 'breathwork' },
  { id: 9, text: 'Conscious breath changes all', route: '/morning-ritual', category: 'breathwork' },
  { id: 10, text: 'Breathe and be energized', route: '/morning-ritual', category: 'breathwork' },
  { id: 102, text: 'Master your breath', route: '__pattern-selection__', category: 'breathwork' },

  // Sleep & Rest — direct play when possible
  { id: 11, text: 'Fall asleep fast', route: R('/sleep-music'), category: 'sleep' },
  { id: 12, text: 'Deep delta sleep', route: R('/sleep-music'), category: 'sleep' },
  { id: 13, text: 'Solfeggio for rest', route: R('/sleep-music'), category: 'sleep', directPlay: { type: 'SLEEP', filter: 'Healing' } },
  { id: 14, text: 'Dream deep wake fresh', route: R('/sleep-music'), category: 'sleep' },
  { id: 15, text: 'Nightly healing soundtrack', route: R('/sleep-music'), category: 'sleep', directPlay: { type: 'SLEEP' } },
  { id: 16, text: 'Sleep like never before', route: R('/sleep-music'), category: 'sleep' },
  { id: 17, text: 'Drift into deep sleep', route: R('/sleep-music'), category: 'sleep' },
  { id: 18, text: 'Sacred sounds for sleep', route: R('/sleep-music'), category: 'sleep' },
  { id: 19, text: 'Rest deep restore', route: R('/sleep-music'), category: 'sleep' },
  { id: 20, text: 'Sleep music that heals', route: R('/sleep-music'), category: 'sleep', directPlay: { type: 'SLEEP', filter: 'Healing' } },

  // Meditation & Mindfulness — direct to specific guided
  { id: 21, text: 'Find stillness discover self', route: R('/meditate'), category: 'meditation', directPlay: { type: 'GUIDED' } },
  { id: 22, text: 'Guided meditation for beginners', route: R('/meditate'), category: 'meditation', directPlay: { type: 'GUIDED' } },
  { id: 23, text: 'Daily practice lifelong peace', route: R('/meditate'), category: 'meditation' },
  { id: 24, text: 'Expert guided meditation', route: R('/meditate'), category: 'meditation', directPlay: { type: 'GUIDED' } },
  { id: 25, text: 'Inner peace awaits', route: R('/meditate'), category: 'meditation', directPlay: { type: 'GUIDED' } },
  { id: 26, text: 'Quiet the mind', route: R('/meditate'), category: 'meditation', directPlay: { type: 'GUIDED' } },
  { id: 27, text: 'Meditation made simple', route: R('/meditate'), category: 'meditation' },
  { id: 28, text: 'Mindfulness every moment', route: R('/meditate'), category: 'meditation' },
  { id: 29, text: '10 mins changes all', route: R('/meditate'), category: 'meditation', directPlay: { type: 'GUIDED' } },
  { id: 30, text: 'Still your thoughts', route: R('/meditate'), category: 'meditation' },

  // Kundalini & Awakening
  { id: 31, text: 'Awaken kundalini safely', route: R('/courses'), category: 'kundalini' },
  { id: 32, text: 'Swara yoga starts now', route: R('/courses'), category: 'kundalini' },
  { id: 33, text: 'Ancient awakening revealed', route: R('/courses'), category: 'kundalini' },
  { id: 34, text: 'Activate inner fire', route: R('/courses'), category: 'kundalini' },
  { id: 35, text: 'Manage Kundalini rising', route: R('/courses'), category: 'kundalini' },
  { id: 36, text: 'Sacred energy activation', route: R('/courses'), category: 'kundalini' },
  { id: 37, text: 'Transform with kundalini yoga', route: R('/courses'), category: 'kundalini' },
  { id: 38, text: 'Spiritual awakening here', route: R('/courses'), category: 'kundalini' },
  { id: 39, text: 'Rise through chakras', route: R('/courses'), category: 'kundalini' },
  { id: 40, text: 'Unlock spiritual power', route: R('/courses'), category: 'kundalini' },

  // Chakra Work — directPlay opens random chakra in player; fallback goes to chakra tab
  { id: 41, text: 'Balance 7 chakras', route: '/meditate?tab=chakra', category: 'chakra', directPlay: { type: 'CHAKRA' } },
  { id: 42, text: 'Chakra healing now', route: '/meditate?tab=chakra', category: 'chakra' },
  { id: 43, text: 'Align energy centers', route: '/meditate?tab=chakra', category: 'chakra', directPlay: { type: 'CHAKRA' } },
  { id: 44, text: 'Clear blockages flow free', route: '/meditate?tab=chakra', category: 'chakra' },
  { id: 45, text: 'Root to crown chakras', route: '/meditate?tab=chakra', category: 'chakra', directPlay: { type: 'CHAKRA' } },
  { id: 46, text: 'Solfeggio for chakras', route: R('/sleep-music'), category: 'chakra', directPlay: { type: 'SLEEP', filter: 'Healing' } },
  { id: 47, text: 'Energy centers need you', route: '/meditate?tab=chakra', category: 'chakra' },
  { id: 48, text: 'Harmonize chakra system', route: '/meditate?tab=chakra', category: 'chakra' },
  { id: 49, text: 'Third eye opening', route: '/meditate?tab=chakra', category: 'chakra', directPlay: { type: 'CHAKRA' } },
  { id: 50, text: 'Chakra meditation awaits', route: '/meditate?tab=chakra', category: 'chakra' },

  // Mantras & Chanting — direct to deity-specific
  { id: 51, text: 'Discover sacred mantra', route: R('/mantra-explorer'), category: 'mantra', directPlay: { type: 'MANTRA' } },
  { id: 53, text: 'Shiva mantras for power', route: R('/mantra-explorer'), category: 'mantra', directPlay: { type: 'SHIVA' } },
  { id: 54, text: 'Hanuman for courage', route: R('/mantra-explorer'), category: 'mantra', directPlay: { type: 'MANTRA', filter: 'HANUMAN' } },
  { id: 55, text: 'Krishna chants for peace', route: R('/mantra-explorer'), category: 'mantra', directPlay: { type: 'MANTRA', filter: 'KRISHNA' } },
  { id: 56, text: 'Ganesha removes obstacles', route: R('/mantra-explorer'), category: 'mantra', directPlay: { type: 'MANTRA', filter: 'GANESHA' } },
  { id: 57, text: 'Universal mantras heal', route: R('/mantra-explorer'), category: 'mantra', directPlay: { type: 'MANTRA', filter: 'UNIVERSAL' } },
  { id: 58, text: 'Ancient vibrations transform', route: R('/mantra-explorer'), category: 'mantra' },
  { id: 59, text: 'Chant your way free', route: R('/mantra-explorer'), category: 'mantra' },
  { id: 60, text: 'Sacred sounds shift energy', route: R('/mantra-explorer'), category: 'mantra' },

  // Stress & Anxiety — direct to anxiety S.O.S. or calm
  { id: 61, text: 'Release anxiety now', route: R('/sleep-music'), category: 'stress', directPlay: { type: 'GUIDED', filter: 'anxiety' } },
  { id: 62, text: 'Breathwork melts stress', route: R('/courses'), category: 'stress' },
  { id: 63, text: 'Find calm in chaos', route: R('/meditate'), category: 'stress', directPlay: { type: 'GUIDED', filter: 'calm' } },
  { id: 64, text: 'Anxiety relief fast', route: R('/sleep-music'), category: 'stress' },
  { id: 65, text: 'Stress dissolves through breath', route: R('/courses'), category: 'stress' },
  { id: 66, text: 'Peaceful mind starts here', route: R('/meditate'), category: 'stress' },
  { id: 67, text: 'Let tension go', route: '/meditate', category: 'stress', directPlay: { type: 'GUIDED', filter: 'anxiety' } },
  { id: 68, text: 'Calm nervous system', route: '/meditate', category: 'stress' },
  { id: 69, text: 'Breathe out worry', route: '/morning-ritual', category: 'stress' },
  { id: 70, text: 'Serenity one tap', route: R('/meditate'), category: 'stress' },

  // Focus — direct to Om Shanti or morning clarity
  { id: 71, text: 'Conscious decisions here', route: R('/courses'), category: 'focus' },
  { id: 72, text: 'Clear mind better choices', route: R('/courses'), category: 'focus' },
  { id: 73, text: 'Breathwork for clarity', route: R('/courses'), category: 'focus' },
  { id: 74, text: 'Focus mind completely', route: R('/courses'), category: 'focus' },
  { id: 75, text: 'Swara yoga reveals timing', route: R('/courses'), category: 'focus' },
  { id: 76, text: 'Decide with confidence', route: R('/courses'), category: 'focus' },
  { id: 77, text: 'Mental fog lifts', route: R('/courses'), category: 'focus' },
  { id: 78, text: 'Clarity through breathing', route: '/morning-ritual', category: 'focus' },
  { id: 79, text: 'Think clearly choose wisely', route: R('/courses'), category: 'focus' },
  { id: 80, text: 'Laser focus via breath', route: '/morning-ritual', category: 'focus' },
  { id: 81, text: 'Concentrate like never', route: R('/courses'), category: 'focus' },
  { id: 82, text: 'Study better pranayama', route: R('/courses'), category: 'focus' },
  { id: 85, text: 'Breathwork boosts productivity', route: R('/courses'), category: 'focus' },
  { id: 86, text: 'Stay present focused', route: R('/meditate'), category: 'focus', directPlay: { type: 'GUIDED', filter: 'Morning' } },
  { id: 87, text: 'Attention mastery today', route: R('/courses'), category: 'focus' },
  { id: 88, text: 'Zero distractions pure focus', route: R('/meditate'), category: 'focus' },
  { id: 89, text: 'Flow state here', route: R('/courses'), category: 'focus' },

  // Healing & Recovery — direct to 432 Hz or healing tracks
  { id: 90, text: 'Full body healing', route: R('/sleep-music'), category: 'healing', directPlay: { type: 'SLEEP', filter: 'Healing' } },
  { id: 91, text: '528 Hz repairs', route: R('/sleep-music'), category: 'healing' },
  { id: 92, text: 'Body heals while sleep', route: R('/sleep-music'), category: 'healing' },
  { id: 93, text: 'Solfeggio works magic', route: R('/sleep-music'), category: 'healing', directPlay: { type: 'SLEEP', filter: 'Healing' } },
  { id: 94, text: 'Deep healing for body', route: R('/sleep-music'), category: 'healing', directPlay: { type: 'SLEEP', filter: 'Healing' } },
  { id: 95, text: 'Recovery through breath', route: R('/courses'), category: 'healing' },
  { id: 96, text: 'Heal from within', route: R('/sleep-music'), category: 'healing' },
  { id: 97, text: 'Ancient medicine heals', route: R('/courses'), category: 'healing' },
  { id: 98, text: 'Restore health via sound', route: R('/sleep-music'), category: 'healing' },
  { id: 99, text: 'Healing journey begins', route: R('/courses'), category: 'healing' },
  { id: 100, text: 'Get daily horoscope', route: '/astrology', category: 'healing' },
  { id: 101, text: "Create today's intention", route: '/intention', category: 'meditation' },
];

export const dashboardTaglines: DashboardTagline[] = shuffleArray(TAGLINES_RAW);
