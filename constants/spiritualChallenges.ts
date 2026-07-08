/**
 * 60 Spiritual Challenges of the Day
 * Deterministic selection: challengeIndex = dayOfYear % 60
 * Everyone globally gets the same challenge each day.
 *
 * Categories: Compassion, Awareness, Growth, Self-Love, Discipline, Spiritual
 */

export const SPIRITUAL_CHALLENGES: readonly string[] = [
  // 💛 Compassion & Kindness (1–10)
  'Help someone without expecting anything back.',
  'Smile intentionally at 5 strangers today.',
  'Donate something small from the heart.',
  'Send gratitude to someone who changed your life.',
  'Forgive one person silently today.',
  'Compliment someone genuinely.',
  'Feed a stray animal or bird.',
  'Call someone you haven’t spoken to in months.',
  'Offer your seat or space to someone.',
  'Pray for someone who hurt you.',

  // 🧘 Awareness & Presence (11–20)
  'Spend 10 minutes without your phone.',
  'Eat one meal in complete silence.',
  'Walk barefoot on natural ground.',
  'Observe your breath before every conversation.',
  'Watch the sunset without distraction.',
  'Listen deeply without interrupting.',
  'Journal your emotions honestly.',
  'Notice your dominant thought pattern today.',
  'Slow down your speech consciously.',
  'Drink water mindfully.',

  // 🌍 Growth & Expansion (21–30)
  'Learn one word in a new language.',
  'Read 5 pages of a meaningful book.',
  'Watch a podcast that inspires growth.',
  'Try something slightly uncomfortable.',
  'Write down one limiting belief.',
  'Replace one negative thought consciously.',
  'Organize one small area of your space.',
  'Wake up 30 minutes earlier.',
  'Learn one spiritual concept today.',
  'Practice gratitude before sleep.',

  // ❤️ Self-Love & Healing (31–40)
  'Look into your own eyes in a mirror and smile.',
  'Forgive yourself for one past mistake.',
  'Write a loving message to yourself.',
  'Take 5 deep conscious breaths before reacting.',
  'Rest without guilt.',
  'Stretch your body gently.',
  'Drink herbal tea mindfully.',
  'Say "I am enough" 10 times.',
  'Avoid self-criticism today.',
  'Spend 20 minutes in silence.',

  // 🔥 Discipline & Integrity (41–50)
  'Keep one promise you made to yourself.',
  'Finish one pending task.',
  'Avoid complaining for the whole day.',
  'Reduce screen time by 30%.',
  'Speak only truth today.',
  'Avoid gossip entirely.',
  'Do one act of courage.',
  'Show up 10 minutes early.',
  'Clean something you’ve been postponing.',
  'Meditate 5 minutes longer than usual.',

  // 🌌 Spiritual Elevation (51–60)
  'Chant Om 21 times.',
  'Light a candle and sit in stillness.',
  'Visualize sending love to the planet.',
  'Read one sacred verse.',
  'Practice alternate nostril breathing.',
  'Offer gratitude before your meal.',
  'Observe your breath at red lights.',
  'Release one attachment consciously.',
  'Spend time in nature.',
  'Bless everyone you see today silently.',
] as const;

const START_OF_YEAR = new Date(0);
START_OF_YEAR.setFullYear(1970);
START_OF_YEAR.setMonth(0);
START_OF_YEAR.setDate(1);
START_OF_YEAR.setHours(0, 0, 0, 0);

/** Get day of year (1–366) for a date */
export function getDayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 86400000;
  return Math.floor(diff / oneDay);
}

/**
 * Get the Spiritual Challenge of the Day.
 * Deterministic: same challenge for everyone globally on the same day.
 */
export function getDailySpiritualChallenge(date: Date = new Date()): string {
  const dayOfYear = getDayOfYear(date);
  const index = dayOfYear % SPIRITUAL_CHALLENGES.length;
  return SPIRITUAL_CHALLENGES[index];
}
