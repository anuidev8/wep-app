import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Users, 
  MessageCircle, 
  Heart, 
  Sparkles, 
  X, 
  Moon, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Clock, 
  Bird,
  Target,
  HeartPulse,
  HandHeart,
  CircleDot,
  Download,
  ChevronDown,
  type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { exportLiveMeditationStory } from '../services/certificateService';
import { LiveMeditationStoryCard } from '../components/LiveMeditationStoryCard';
import { getDailySpiritualChallenge } from '../constants/spiritualChallenges';
import { useRestMusic } from '../hooks/useRestMusic';
import { restMusicService } from '../services/restMusicService';

// --- TYPES ---

type MeditationPhase = 'ENTRY' | 'INTENTION' | 'DURATION' | 'ACTIVE' | 'COMPLETE' | 'FEED';

type MeditationThemeId = 'peace' | 'focus' | 'healing' | 'gratitude' | 'silence' | 'love';

interface MeditationTheme {
  id: MeditationThemeId;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
}

interface ActiveMeditator {
  id: number;
  name: string;
  initial: string;
  durationMinutes: number;
  startedAt: number;
}

type MessageType = 'chat' | 'meditation_completion';

interface MeditationMessage {
  id: number;
  type: MessageType;
  user: string;
  text?: string;
  intention?: string;
  reflection?: string;
  durationMinutes?: number;
  timestamp: number;
  participantsAtCompletion?: number;
  /** 'real' = user shared to feed; 'bot' = generated community entry */
  source?: 'real' | 'bot';
}

interface StoredMeditationSession {
  id: number;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  focus: MeditationThemeId;
  intention?: string;
  reflection?: string;
  completedAt: number;
}

const MEDITATION_HISTORY_STORAGE_KEY = 'liveMeditationHistory_v1';

// --- CONSTANTS ---

type ThemeAnimation = 'float' | 'pulse' | 'breathingGlow' | 'shimmer' | 'fadeInOut' | 'heartbeat';

interface MeditationThemeWithAnim extends MeditationTheme {
  animation: ThemeAnimation;
}

const MEDITATION_THEMES: MeditationThemeWithAnim[] = [
  { id: 'peace', label: 'Peace', icon: Bird, iconClassName: 'text-cyan-100', description: 'Softening the nervous system and letting the heart rest.', animation: 'float' },
  { id: 'focus', label: 'Focus', icon: Target, iconClassName: 'text-rose-100', description: 'Gathering scattered attention back to this moment.', animation: 'pulse' },
  { id: 'healing', label: 'Healing', icon: HeartPulse, iconClassName: 'text-emerald-200', description: 'Inviting repair, tenderness, and wholeness.', animation: 'breathingGlow' },
  { id: 'gratitude', label: 'Gratitude', icon: HandHeart, iconClassName: 'text-amber-100', description: 'Remembering what is already here and enough.', animation: 'shimmer' },
  { id: 'silence', label: 'Silence', icon: CircleDot, iconClassName: 'text-slate-200', description: 'Resting in stillness beyond words and thoughts.', animation: 'fadeInOut' },
  { id: 'love', label: 'Love', icon: Heart, iconClassName: 'text-pink-200', description: 'Resting in the warmth of your own heart and the hearts around you.', animation: 'heartbeat' },
];

const PRESET_DURATIONS_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180];

const INTENTION_SUGGESTIONS = [
  'Release stress',
  'Find clarity',
  'Cultivate compassion',
  'Connect with peace',
];

// Shorter, meaningful intention options per theme (shown on screen 2)
const THEMED_INTENTIONS: Record<MeditationThemeId, string[]> = {
  peace: [
    'I soften into calm with every breath.',
    'I let go of tension and rest in stillness.',
    'Peace flows through me and out into the world.',
  ],
  focus: [
    'I anchor my attention to this single breath.',
    'I release distraction and return to presence.',
    'My mind is clear, steady, and fully here.',
  ],
  healing: [
    'I send warmth to every part of me that aches.',
    'I trust my body to heal at its own pace.',
    'Each breath invites tenderness and repair.',
  ],
  gratitude: [
    'I notice what is already here and enough.',
    'I honour the quiet blessings around me.',
    'I soften into appreciation for this moment.',
  ],
  silence: [
    'I rest in the stillness beneath all thought.',
    'I let silence hold me without needing words.',
    'In quiet I discover spaciousness and ease.',
  ],
  love: [
    'I let love radiate from my heart outward.',
    'I breathe in belonging, I breathe out kindness.',
    'My heart is open, warm, and unguarded.',
  ],
};

const SANGAH_FEED_STORAGE_KEY = 'liveMeditation_lastBotRefreshAt';
const MAX_FEED_MESSAGES = 40;
const BOT_NAMES_EXCLUDE_RECENT = 6;

// 18 diverse names for bot/community entries (min 15+)
const BOT_NAMES = [
  'Aisha R.', 'Daniel M.', 'Priya S.', 'Kenji T.', 'María G.', 'Lina P.',
  'Omar H.', 'Sophie L.', 'Noah B.', 'Hannah C.', 'Jae W.', 'Fatima A.',
  'Lucas D.', 'Elena K.', 'Arjun V.', 'Maya N.', 'Samir J.', 'Grace W.',
];

// Flat intention pool for bot messages (varied, relevant)
const BOT_INTENTIONS = [
  'Arrive fully in my body.',
  'Let go of the day.',
  'Trust my breath.',
  'Be kinder to myself.',
  'Slow down this evening.',
  'Stay close to gratitude.',
  'I anchor my attention to this single breath.',
  'I let go of tension and rest in stillness.',
  'I notice what is already here and enough.',
  'I release distraction and return to presence.',
  'I send warmth to every part of me that aches.',
  'I rest in the stillness beneath all thought.',
  'I let love radiate from my heart outward.',
];

// Flat reflection pool for bot messages
const BOT_REFLECTIONS = [
  'Felt waves of calm move through my chest.',
  'Mind was busy, but breath kept bringing me back.',
  'Felt deep peace in my chest.',
  'Mind wandered, but I kept returning to breath.',
  'Tears came, then a soft settling.',
  'Energy moved through my spine like a gentle wave.',
  'Started scattered, ended grounded.',
  'My shoulders dropped for the first time today.',
  'A sense of spaciousness after the bell.',
  'Heart felt more open.',
  'Thoughts slowed; body caught up.',
];

/** Seeded random for deterministic-per-hour generation (no jump on reload) */
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Generate one bot completion. Optionally exclude names that appear in the last N bot messages. */
function generateBotCompletion(
  userCount: number,
  excludeNames: string[] = [],
  timeOffsetMs: number = 0
): MeditationMessage {
  const seed = Math.floor((Date.now() + timeOffsetMs) / (1000 * 60 * 60)) * 3600 + (timeOffsetMs ? Math.floor(timeOffsetMs / 60000) : 0);
  const availableNames = excludeNames.length
    ? BOT_NAMES.filter(n => !excludeNames.includes(n))
    : BOT_NAMES;
  const name = availableNames.length
    ? availableNames[Math.floor(seededRandom(seed) * availableNames.length)]
    : BOT_NAMES[Math.floor(seededRandom(seed + 1) * BOT_NAMES.length)];

  const ts = Date.now() + timeOffsetMs;
  const intention = BOT_INTENTIONS[Math.floor(seededRandom(seed + 2) * BOT_INTENTIONS.length)];
  const reflection = BOT_REFLECTIONS[Math.floor(seededRandom(seed + 3) * BOT_REFLECTIONS.length)];
  const durationMinutes = PRESET_DURATIONS_MINUTES[Math.floor(seededRandom(seed + 4) * Math.min(6, PRESET_DURATIONS_MINUTES.length))];

  return {
    id: ts,
    type: 'meditation_completion',
    user: name,
    intention,
    reflection,
    durationMinutes,
    timestamp: ts,
    participantsAtCompletion: Math.max(3, userCount + Math.floor(seededRandom(seed + 5) * 20) - 10),
    source: 'bot',
  };
}

/** Get last N bot usernames from messages (for name exclusion). */
function getRecentBotNames(messages: MeditationMessage[], n: number): string[] {
  const botNames: string[] = [];
  for (let i = messages.length - 1; i >= 0 && botNames.length < n; i--) {
    if (messages[i].source === 'bot' && messages[i].user && !botNames.includes(messages[i].user)) {
      botNames.push(messages[i].user);
    }
  }
  return botNames;
}

/** Seed feed with 2 randomized bot completions at load (deterministic per hour). */
function getInitialFeed(userCount: number): MeditationMessage[] {
  const now = Date.now();
  return [
    generateBotCompletion(userCount, [], -25 * 60 * 1000),  // ~25 min ago
    generateBotCompletion(userCount, [], -60 * 60 * 1000),  // ~1 hr ago
  ];
}

/** Ensure feed is under cap by removing oldest BOT messages first; never remove real. */
function trimFeedToCap(messages: MeditationMessage[], cap: number): MeditationMessage[] {
  if (messages.length <= cap) return messages;
  const oldestFirst = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  let toRemove = oldestFirst.length - cap;
  const kept = oldestFirst.filter(m => {
    if (toRemove > 0 && m.source === 'bot') {
      toRemove--;
      return false;
    }
    return true;
  });
  return kept.sort((a, b) => b.timestamp - a.timestamp);
}

// Blessing messages for share card footer
const SHARE_BLESSINGS = [
  'May all beings share in any benefit from this sit.',
  'May all hearts everywhere feel a little more ease.',
  'May all beings be happy, peaceful, and free.',
  'May this breath ripple out as kindness to the world.',
  'May those who are struggling feel held and supported.',
  'May my practice serve the healing of all beings.',
  'May all who suffer find moments of deep rest.',
  'May every breath invite more compassion into the world.',
  'May this stillness touch someone who needs it most.',
  'May all beings remember their own innate wholeness.',
  'May peace begin in this breath and move outward endlessly.',
  'May the School of Breath sangha keep growing in love and presence.',
];

// Seed live count in a realistic range (3–9 people)
const getInitialUserCount = () => {
  return 3 + Math.floor(Math.random() * 7); // 3 to 9 inclusive
};

export const LiveSession: React.FC = () => {
  const navigate = useNavigate();
  const { user, intentionEntries, theme } = useApp();

  // Keep the live counter intimate and realistic (3–9 people)
  const [userCount, setUserCount] = useState(getInitialUserCount);
  const [phase, setPhase] = useState<MeditationPhase>('ENTRY');
  const [selectedTheme, setSelectedTheme] = useState<MeditationThemeId>('peace');
  const [intention, setIntention] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(20);
  const [meditationStartTime, setMeditationStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meditationActive, setMeditationActive] = useState(false);
  const [hideTimer, setHideTimer] = useState(false);
  const [ambientOn, setAmbientOn] = useState(true);
  const [reflection, setReflection] = useState('');
  const [lastSessionEndTime, setLastSessionEndTime] = useState<number | null>(null);
  const [messages, setMessages] = useState<MeditationMessage[]>(() =>
    getInitialFeed(getInitialUserCount())
  );
  const [activeMeditators, setActiveMeditators] = useState<ActiveMeditator[]>([]);
  const [isSharingToFeed, setIsSharingToFeed] = useState(false);
  const [hasAutoFilledIntention, setHasAutoFilledIntention] = useState(false);
  const [hasInitialMessagesRendered, setHasInitialMessagesRendered] = useState(false);
  const [heartedMessages, setHeartedMessages] = useState<number[]>([]);
  const [countVisible, setCountVisible] = useState(true);
  const [historySessions, setHistorySessions] = useState<StoredMeditationSession[]>([]);
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<{
    date: string;
    sessions: StoredMeditationSession[];
  } | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [displayCount, setDisplayCount] = useState(userCount);
  const [buttonRipple, setButtonRipple] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const feedEndRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const userCountTimeoutRef = useRef<number | null>(null);
  const hasSharedThisSessionRef = useRef(false);
  const hasRungCommitmentBellRef = useRef(false);

  // --- PREFILL INTENTION FROM JOURNAL (if available) ---
  useEffect(() => {
    if (!hasAutoFilledIntention && intentionEntries.length > 0) {
      setIntention(intentionEntries[0].text);
      setHasAutoFilledIntention(true);
    }
  }, [hasAutoFilledIntention, intentionEntries]);

  // --- LOAD MEDITATION HISTORY FROM LOCAL STORAGE ---
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MEDITATION_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredMeditationSession[];
        setHistorySessions(parsed);
      }
    } catch (error) {
      console.error('[Live Meditation] Failed to load history', error);
    }
  }, []);

  // --- REAL-TIME SIMULATION (USER COUNT + GLOBAL PRESENCE) ---
  useEffect(() => {
    // Fluctuate user count gently, staying within 3–9 people,
    // and only update every 3–9 minutes to feel slow and realistic.
    const scheduleNextUpdate = () => {
      const delayMinutes = 3 + Math.random() * 6; // 3–9 minutes
      const delayMs = delayMinutes * 60 * 1000;

      userCountTimeoutRef.current = window.setTimeout(() => {
        setUserCount(prev => {
          const delta = Math.floor(Math.random() * 3) - 1; // -1 to +1
          const next = prev + delta;
          return Math.min(9, Math.max(3, next));
        });
        scheduleNextUpdate();
      }, delayMs);
    };

    scheduleNextUpdate();

    // Simulate a gentle stream of bot completions (every 9–30 minutes); avoid repeating name in last 6 bots
    let feedTimeout: number | null = null;

    const scheduleNextFeed = () => {
      const delayMinutes = 9 + Math.random() * 21; // 9–30 minutes
      const delayMs = delayMinutes * 60 * 1000;

      feedTimeout = window.setTimeout(() => {
        setMessages(prev => {
          const recentBotNames = getRecentBotNames(prev, BOT_NAMES_EXCLUDE_RECENT);
          const completion = generateBotCompletion(userCount, recentBotNames);
          const next = trimFeedToCap([...prev, completion], MAX_FEED_MESSAGES);
          return next;
        });
        scheduleNextFeed();
      }, delayMs);
    };

    scheduleNextFeed();

    // Hourly recycle: add 2 new bot completions every hour; persist last refresh in localStorage
    const runHourlyRecycle = () => {
      try {
        const raw = localStorage.getItem(SANGAH_FEED_STORAGE_KEY);
        const lastAt = raw ? parseInt(raw, 10) : 0;
        const now = Date.now();
        if (now - lastAt < 60 * 60 * 1000) return; // not yet 1 hour

        setMessages(prev => {
          const recentBotNames = getRecentBotNames(prev, BOT_NAMES_EXCLUDE_RECENT);
          const one = generateBotCompletion(userCount, recentBotNames, -2 * 60 * 1000);
          const excludeAfterFirst = [...recentBotNames, one.user];
          const two = generateBotCompletion(userCount, excludeAfterFirst, -5 * 60 * 1000);
          return trimFeedToCap([...prev, one, two], MAX_FEED_MESSAGES);
        });
        localStorage.setItem(SANGAH_FEED_STORAGE_KEY, String(now));
      } catch (e) {
        // ignore storage errors
      }
    };

    runHourlyRecycle();
    const hourlyInterval = window.setInterval(runHourlyRecycle, 60 * 60 * 1000);

    return () => {
      if (userCountTimeoutRef.current) {
        clearTimeout(userCountTimeoutRef.current);
      }
      if (feedTimeout) {
        clearTimeout(feedTimeout);
      }
      clearInterval(hourlyInterval);
    };
  }, []);

  // Subtle fade-in whenever the live count updates
  useEffect(() => {
    setCountVisible(false);
    const timeout = window.setTimeout(() => {
      setCountVisible(true);
    }, 30);
    return () => window.clearTimeout(timeout);
  }, [userCount]);

  // Keep displayCount in sync with userCount
  useEffect(() => {
    setDisplayCount(userCount);
  }, [userCount]);

  // Animated counter: hearts joining/leaving (updates every 10s on ENTRY screen)
  useEffect(() => {
    if (phase !== 'ENTRY') return;
    const interval = setInterval(() => {
      setDisplayCount(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.min(36, Math.max(3, prev + delta));
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    // Avoid auto-scrolling the page on initial load; only scroll
    // when new messages arrive after the first render.
    if (!hasInitialMessagesRendered) {
      setHasInitialMessagesRendered(true);
      return;
    }
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, hasInitialMessagesRendered]);

  // --- MEDITATION TIMER ---

  useEffect(() => {
    if (!meditationActive || !meditationStartTime) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - meditationStartTime) / 1000);
      setElapsedSeconds(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [meditationActive, meditationStartTime]);

  // At committed duration: ring bell once; timer keeps running until user taps End & Reflect
  const COMMITMENT_CHIME_URL = 'https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/VideoCues/chimes.mp3';
  useEffect(() => {
    if (!meditationActive || hasRungCommitmentBellRef.current) return;
    const targetSeconds = durationMinutes * 60;
    if (elapsedSeconds >= targetSeconds) {
      hasRungCommitmentBellRef.current = true;
      try {
        const audio = new Audio(COMMITMENT_CHIME_URL);
        audio.volume = 0.6;
        audio.play().catch(() => {});
      } catch {
        // ignore
      }
    }
  }, [elapsedSeconds, meditationActive, durationMinutes]);

  // Background music for live meditation
  useRestMusic({
    isActive: phase === 'ACTIVE',
    isPaused: !musicEnabled,
    shouldStopImmediate: false,
  });

  // Keep screen awake during meditation (best-effort)
  useEffect(() => {
    let wakeLock: any;
    const requestWakeLock = async () => {
      try {
        // @ts-ignore - experimental API
        if ('wakeLock' in navigator && meditationActive) {
          // @ts-ignore
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Silent fail – some browsers don’t support this
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock && typeof wakeLock.release === 'function') {
        wakeLock.release();
      }
    };
  }, [meditationActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const addHistorySession = (session: StoredMeditationSession) => {
    setHistorySessions(prev => {
      const updated = [...prev, session];
      try {
        window.localStorage.setItem(
          MEDITATION_HISTORY_STORAGE_KEY,
          JSON.stringify(updated)
        );
      } catch (error) {
        console.error('[Live Meditation] Failed to save history', error);
      }
      return updated;
    });
  };

  const handleStartFlow = () => {
    setPhase('INTENTION');
  };

  const handleStartMeditation = () => {
    const now = Date.now();
    setMeditationStartTime(now);
    setElapsedSeconds(0);
    setMeditationActive(true);
    setPhase('ACTIVE');
    hasSharedThisSessionRef.current = false;
    hasRungCommitmentBellRef.current = false;

    // Reset music track for a fresh random selection
    restMusicService.resetTrack();

    // When you enter the room, add to the live count (cap 9)
    setUserCount(prev => Math.min(9, prev + 1));

    // Add current user to active meditators list
    setActiveMeditators(prev => {
      const exists = prev.find(p => p.id === -1);
      if (exists) return prev;
      return [
        {
          id: -1,
          name: user || 'You',
          initial: user ? user.charAt(0).toUpperCase() : 'Y',
          durationMinutes,
          startedAt: now,
        },
        ...prev,
      ];
    });
  };

  const handleLeaveMeditation = () => {
    // When you leave, gently reduce the live count by 1 (down to minimum 3)
    setUserCount(prev => Math.max(3, prev - 1));
    handleCompleteSession(true);
  };

  const handleCompleteSession = (isManualExit: boolean) => {
    if (!meditationActive && !isManualExit) return;

    const completedAt = Date.now();
    const totalMinutesSat = Math.max(1, Math.round(elapsedSeconds / 60));

    setMeditationActive(false);
    setPhase('FEED'); // Skip Meditation Complete / comments — go straight to certificate download

    // Capture when this sit actually ended so the feed timestamp is accurate
    setLastSessionEndTime(completedAt);

    // Persist to local history (use local date so "today" resets at midnight)
    const d = new Date(completedAt);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    addHistorySession({
      id: completedAt,
      date: dayKey,
      durationMinutes: totalMinutesSat,
      focus: selectedTheme,
      intention: (intention || '').trim() || undefined,
      reflection: (reflection || '').trim() || undefined,
      completedAt,
    });
    window.dispatchEvent(new CustomEvent('live_meditation_completed'));

    // Remove "you" from active meditators
    setActiveMeditators(prev => prev.filter(p => p.id !== -1));
  };

  const handleShareToFeed = () => {
    if (!(reflection || '').trim() && !(intention || '').trim()) {
      return;
    }
    if (hasSharedThisSessionRef.current) return;
    hasSharedThisSessionRef.current = true;

    setIsSharingToFeed(true);
    const completion: MeditationMessage = {
      id: Date.now(),
      type: 'meditation_completion',
      user: user || 'You',
      intention: (intention || '').trim() || undefined,
      reflection: (reflection || '').trim() || undefined,
      durationMinutes: totalMinutesSat,
      timestamp: lastSessionEndTime ?? Date.now(),
      participantsAtCompletion: userCount,
      source: 'real',
    };
    setMessages(prev => trimFeedToCap([...prev, completion], MAX_FEED_MESSAGES));
    setTimeout(() => {
      setIsSharingToFeed(false);
      setPhase('FEED');
    }, 600);
  };

  const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);

  // --- MEDITATION HISTORY DERIVED DATA ---
  const historyByDate: Record<
    string,
    { totalMinutes: number; sessions: StoredMeditationSession[] }
  > = historySessions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = { totalMinutes: 0, sessions: [] };
    acc[s.date].totalMinutes += s.durationMinutes;
    acc[s.date].sessions.push(s);
    return acc;
  }, {} as Record<string, { totalMinutes: number; sessions: StoredMeditationSession[] }>);

  const today = new Date();

  const historyDateSet = new Set(
    Object.keys(historyByDate).filter(k => historyByDate[k].totalMinutes > 0)
  );

  // Last 6 days with meditation duration for the minimal feed
  const last6DaysWithDuration = (() => {
    const out: { dateStr: string; label: string; totalMinutes: number }[] = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const totalMinutes = historyByDate[dateStr]?.totalMinutes ?? 0;
      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      out.push({ dateStr, label, totalMinutes });
      d.setDate(d.getDate() - 1);
    }
    return out;
  })();

  // Current streak
  let currentStreak = 0;
  {
    const d = new Date(today);
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (!historyDateSet.has(key)) break;
      currentStreak += 1;
      d.setDate(d.getDate() - 1);
    }
  }

  // Longest streak
  let longestStreak = 0;
  {
    const sortedDays = Array.from(historyDateSet).sort();
    let streak = 0;
    let prev: Date | null = null;
    for (const key of sortedDays) {
      const d = new Date(key);
      if (prev && (d.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24) === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
      longestStreak = Math.max(longestStreak, streak);
      prev = d;
    }
  }

  // Monthly stats
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();
  let totalMinutesThisMonth = 0;
  let totalSessionsThisMonth = 0;
  historySessions.forEach(s => {
    const d = new Date(s.completedAt);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      totalMinutesThisMonth += s.durationMinutes;
      totalSessionsThisMonth += 1;
    }
  });

  // Heatmap bucket helpers removed (no calendar UI currently)

  const currentTheme = MEDITATION_THEMES.find(t => t.id === selectedTheme) || MEDITATION_THEMES[0];
  const CurrentThemeIcon = currentTheme.icon;

  const totalMinutesSat = Math.max(1, Math.round(elapsedSeconds / 60));

  const getMinutesAgo = (startedAt: number) => {
    const diffMs = Date.now() - startedAt;
    return Math.max(0, Math.floor(diffMs / 1000 / 60));
  };

  const backgroundGradient =
    phase === 'FEED'
      ? 'from-[#152532] via-[#0f1e2a] to-[#152a38]'
      : theme === 'dark'
      ? 'from-[#0D1821] via-[#050812] to-[#10182A]'
      : 'from-[#0D1821] via-[#050812] to-[#10182A]';

  // Stable blessing index based on last session end time
  const blessingIndex =
    SHARE_BLESSINGS.length > 0
      ? Math.abs(
          Math.floor((lastSessionEndTime ?? Date.now()) / (1000 * 60))
        ) % SHARE_BLESSINGS.length
      : 0;
  const selectedBlessing = SHARE_BLESSINGS[blessingIndex] ?? '';

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-b ${backgroundGradient} text-white relative overflow-hidden`}>
      {/* Subtle grain + warm ambient orbs */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-soft-light"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '3px 3px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-40 -left-32 w-80 h-80 bg-emerald-500/14 blur-3xl rounded-full" />
        <div className="absolute top-20 right-[-120px] w-96 h-96 bg-amber-500/12 blur-3xl rounded-full" />
        <div className="absolute bottom-[-160px] left-[-40px] w-80 h-80 bg-rose-500/14 blur-3xl rounded-full" />
      </div>

      {/* HEADER (currently hidden in all flow states to keep full-screen focus) */}
      {phase !== 'ENTRY' && phase !== 'INTENTION' && phase !== 'DURATION' && phase !== 'ACTIVE' && phase !== 'COMPLETE' && phase !== 'FEED' && (
        <div className="flex justify-between items-center bg-[#020617]/80 backdrop-blur-2xl sticky top-0 z-20 border-b border-white/5 px-6 pt-12 pb-4">
          <button
            onClick={() => navigate('/')}
            className="relative p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all duration-300 border border-white/20 shadow-lg active:scale-95 group"
          >
            <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <ArrowLeft size={20} className="relative z-10" />
          </button>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300 animate-pulse" />
              </span>
              <span className="font-bold tracking-[0.25em] text-[10px] uppercase text-emerald-300">
                Live Meditation
              </span>
            </div>
            <span
              className={`text-[11px] sm:text-[14px] font-light tracking-[0.12em] text-white/95 transition-opacity duration-500 ${
                countVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {userCount.toLocaleString()} hearts are breathing with you
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideTimer(prev => !prev)}
              className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] border border-white/10 bg-white/5 hover:bg-white/10 transition-colors items-center gap-1.5"
            >
              <Clock size={12} />
              {hideTimer ? 'Show Timer' : 'Hide Timer'}
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 overflow-hidden">
        {/* LEFT: FLOW + MEDITATION ROOM */}
        <div className={`flex-1 flex flex-col p-4 lg:p-8 gap-4 lg:gap-6 ${phase === 'ENTRY' ? 'min-h-0 overflow-hidden' : ''}`}>
          {/* ENTRY / INTENTION / DURATION / ACTIVE / COMPLETE */}
          {phase === 'ENTRY' && (
            <div
              className="flex-1 flex flex-col items-center justify-center relative px-5"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
              }}
            >
              {/* Main card */}
              <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl px-5 py-8 sm:px-7 sm:py-10 backdrop-blur-2xl shadow-[0_18px_65px_rgba(15,23,42,0.9)] flex flex-col items-center">
                {/* Back button + Meditation icon row */}
                <div className="relative w-full flex items-center justify-center">
                  {/* Back button - left aligned, same height as icon */}
                  <button
                    onClick={() => navigate('/')}
                    className="absolute left-1 z-30 p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-300 border border-white/20 active:scale-95"
                  >
                    <ArrowLeft size={20} />
                  </button>

                {/* Meditation icon with ripple circles + particles (centered) */}
                <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/2 top-1/2 w-16 h-16 rounded-full border-2 border-cyan-400/40 animate-ripple -translate-x-1/2 -translate-y-1/2 origin-center" style={{ animationDelay: '0s' }} />
                    <div className="absolute left-1/2 top-1/2 w-16 h-16 rounded-full border-2 border-cyan-400/35 animate-ripple -translate-x-1/2 -translate-y-1/2 origin-center" style={{ animationDelay: '2s' }} />
                    <div className="absolute left-1/2 top-1/2 w-16 h-16 rounded-full border-2 border-cyan-400/30 animate-ripple -translate-x-1/2 -translate-y-1/2 origin-center" style={{ animationDelay: '4s' }} />
                  </div>
                  <div className="relative w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-300/40 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.35)] z-10">
                    <span className="text-2xl animate-icon-float" aria-hidden="true">🧘‍♂️</span>
                  </div>
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-particle-drift pointer-events-none"
                      style={{
                        left: `${45 + (i - 2) * 8}%`,
                        bottom: '-10%',
                        animationDelay: `${i * 1.5}s`,
                      }}
                    />
                  ))}
                </div>
                </div>

                {/* LIVE badge + count */}
                <div className="flex items-baseline gap-2 mt-6">
                  <span className="inline-flex items-center gap-1.5 text-[20px] font-bold text-white">
                    <CircleDot size={16} className="text-emerald-400" />
                    LIVE
                  </span>
                  <span
                    className={`text-[12px] font-medium text-white/60 transition-opacity duration-500 ${
                      countVisible ? 'opacity-60' : 'opacity-0'
                    }`}
                  >
                    {displayCount} meditating
                  </span>
                </div>

                {/* Main heading */}
                <h1
                  className="text-2xl sm:text-3xl font-serif font-light text-white mt-4"
                  style={{ fontFamily: '"Crimson Text", "Spectral", "Source Serif Pro", serif' }}
                >
                  Sit with the world.
                </h1>

                {/* Intention cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-max mx-auto mt-8">
                  {MEDITATION_THEMES.map(themeItem => {
                    const isSelected = selectedTheme === themeItem.id;
                    const ThemeIcon = themeItem.icon;
                    const animClass = {
                      float: 'animate-icon-float',
                      pulse: 'animate-icon-pulse',
                      breathingGlow: 'animate-icon-breathing-glow',
                      shimmer: 'animate-icon-shimmer',
                      fadeInOut: 'animate-icon-fade-in-out',
                      heartbeat: 'animate-icon-heartbeat',
                    }[themeItem.animation];
                    return (
                      <button
                        key={themeItem.id}
                        onClick={() => setSelectedTheme(themeItem.id)}
                        className={`flex flex-col items-center justify-center rounded-2xl transition-all duration-300 ease-out w-[120px] h-[120px] ${
                          isSelected
                            ? 'scale-[1.05] border-[3px] border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] bg-white/10'
                            : 'opacity-50 hover:opacity-70 border border-white/10 bg-white/5'
                        }`}
                      >
                        <ThemeIcon
                          strokeWidth={1.8}
                          className={`mb-2 w-10 h-10 sm:w-11 sm:h-11 ${themeItem.iconClassName} ${animClass}`}
                        />
                        <span className="text-[14px] font-medium text-white">{themeItem.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* BEGIN button */}
                <button
                  onClick={() => {
                    setButtonRipple(true);
                    setTimeout(() => setButtonRipple(false), 600);
                    handleStartFlow();
                  }}
                  className="relative w-full max-w-[260px] py-3.5 sm:py-4 rounded-2xl bg-[#88C0A8] text-slate-950 font-medium text-[16px] sm:text-[18px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-[0_18px_45px_rgba(136,192,168,0.45)] hover:bg-[#7CB89D] overflow-hidden animate-begin-pulse mt-8"
                >
                  {buttonRipple && (
                    <span className="absolute left-1/2 top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 animate-button-ripple" />
                  )}
                  <Play size={18} className="relative z-10" />
                  <span className="relative z-10">BEGIN</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'INTENTION' && (
            <div
              className="flex-1 flex flex-col items-center justify-center px-5 overflow-y-auto"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
              }}
            >
              <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl px-5 py-7 sm:px-7 sm:py-9 backdrop-blur-2xl shadow-[0_18px_65px_rgba(15,23,42,0.9)] flex flex-col items-center">
                {/* Top row: back button + live status */}
                <div className="relative w-full flex items-center justify-center mb-6">
                  <button
                    onClick={() => setPhase('ENTRY')}
                    className="absolute left-1 p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-300 border border-white/20 active:scale-95"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300 animate-pulse" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                      Live
                    </span>
                    <span className="text-[11px] text-white/50 font-light">
                      {userCount} meditating
                    </span>
                  </div>
                </div>

                {/* Subtle label */}
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/90">
                  Based on your intention
                </p>

                {/* Dynamic title */}
                <h2
                  className="text-xl sm:text-2xl font-serif font-light text-white text-center mt-3"
                  style={{ fontFamily: '"Crimson Text", "Spectral", "Source Serif Pro", serif' }}
                >
                  <span className="inline-flex items-center">
                    <CurrentThemeIcon size={18} strokeWidth={1.9} className={`mr-2 ${currentTheme.iconClassName}`} />
                    Refine your intention for {currentTheme.label}
                  </span>
                </h2>

                {/* Soft divider */}
                <div className="w-12 h-px bg-white/10 mt-4" />

                {/* Themed intention cards */}
                <div className="flex flex-col gap-3 w-full mt-7">
                  {(THEMED_INTENTIONS[selectedTheme] || []).map((text, idx) => {
                    const isSelected = intention === text;
                    return (
                      <button
                        key={idx}
                        onClick={() => setIntention(isSelected ? '' : text)}
                        className={`w-full text-left px-5 py-4 rounded-2xl text-[13px] sm:text-sm leading-relaxed transition-all duration-300 ${
                          isSelected
                            ? 'bg-white/10 border-[2px] border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.35)] text-white'
                            : 'bg-white/5 border border-white/10 text-slate-200/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>

                {/* Or write your own */}
                <div className="w-full mt-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2 text-center">
                    Or write your own
                  </p>
                  <textarea
                    value={!(THEMED_INTENTIONS[selectedTheme] || []).includes(intention) ? intention : ''}
                    onChange={e => setIntention(e.target.value)}
                    rows={2}
                    maxLength={180}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none"
                    placeholder="One simple sentence is enough..."
                  />
                </div>

                {/* ENTER THE ROOM - goes directly to Live room (20 min default) */}
                <button
                  onClick={handleStartMeditation}
                  disabled={!(intention || '').trim()}
                  className={`w-full max-w-[280px] py-3.5 sm:py-4 rounded-2xl font-medium text-[16px] sm:text-[18px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all mt-7 ${
                    (intention || '').trim()
                      ? 'bg-[#88C0A8] text-slate-950 shadow-[0_18px_45px_rgba(136,192,168,0.45)] hover:bg-[#7CB89D] active:scale-95'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  <Play size={18} />
                  <span>Enter the Room</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'ACTIVE' && (
            <div
              className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 overflow-hidden"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
              }}
            >
              <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl px-6 py-9 sm:px-8 sm:py-12 backdrop-blur-2xl shadow-[0_18px_65px_rgba(15,23,42,0.9)] flex flex-col items-center relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute inset-0 pointer-events-none opacity-30">
                  <div className="absolute -top-32 left-10 w-64 h-64 bg-emerald-500/30 blur-3xl rounded-full" />
                  <div className="absolute bottom-[-120px] right-[-40px] w-72 h-72 bg-indigo-500/25 blur-3xl rounded-full" />
                </div>

                {/* Floating zen particles */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={`zen-${i}`}
                    className="absolute rounded-full pointer-events-none animate-particle-drift"
                    style={{
                      width: `${2 + (i % 3)}px`,
                      height: `${2 + (i % 3)}px`,
                      background: i % 2 === 0
                        ? 'rgba(34, 211, 238, 0.5)'
                        : 'rgba(52, 211, 153, 0.4)',
                      left: `${8 + (i * 7.5) % 84}%`,
                      bottom: `${-5 + (i * 3) % 10}%`,
                      animationDelay: `${i * 0.7}s`,
                      animationDuration: `${6 + (i % 4) * 2}s`,
                    }}
                  />
                ))}

                {/* Top row: close + live status + music */}
                <div className="relative w-full flex items-center justify-between mb-4 z-10">
                  <button
                    onClick={handleLeaveMeditation}
                    className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20 active:scale-95"
                  >
                    <X size={20} />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="rounded-full h-2.5 w-2.5 bg-emerald-300 animate-pulse" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      Live
                    </span>
                    <span className="text-sm text-white/50">
                      {userCount} sitting
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMusicEnabled(!musicEnabled);
                    }}
                    className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    aria-label={musicEnabled ? 'Mute' : 'Unmute'}
                  >
                    {musicEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-white/50" />}
                  </button>
                </div>

                {/* Theme + intention */}
                <div className="flex flex-col items-center text-center z-10 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                    Meditating Now
                  </p>
                  <h2
                    className="text-2xl sm:text-3xl font-serif font-light text-white mt-1.5"
                    style={{ fontFamily: '"Crimson Text", "Spectral", "Source Serif Pro", serif' }}
                  >
                    <span className="inline-flex items-center">
                      <CurrentThemeIcon size={24} strokeWidth={1.9} className={`mr-2 ${currentTheme.iconClassName}`} />
                      {currentTheme.label}
                    </span>
                  </h2>
                  {(intention || '').trim() && (
                    <p className="mt-1.5 text-sm text-white/50 italic max-w-sm">
                      &ldquo;{(intention || '').trim()}&rdquo;
                    </p>
                  )}
                  {/* Duration pill — tappable to change */}
                  <button
                    onClick={() => setShowDurationPicker(true)}
                    className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors"
                  >
                    <Clock size={14} className="text-white/50" />
                    Sitting for {durationMinutes} min
                    <ChevronDown size={12} className="text-white/40" />
                  </button>
                </div>

                {/* Orb — single ring */}
                <div className="relative my-6 sm:my-8 flex items-center justify-center z-10">
                  <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br from-emerald-300/30 via-emerald-400/10 to-transparent border border-emerald-200/50 flex items-center justify-center animate-orb-breathe">
                    <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full border border-emerald-100/30 flex items-center justify-center">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-400/60 blur-md" />
                    </div>
                  </div>
                </div>

                {/* Timer */}
                {!hideTimer && (
                  <div className="relative z-10 text-center mb-4">
                    <span className="font-mono text-3xl sm:text-4xl font-light tracking-wider text-white/90">
                      {formatTime(elapsedSeconds)}
                    </span>
                    <p className="text-xs text-white/25 mt-1">
                      of {durationMinutes} min
                    </p>
                  </div>
                )}

                {/* Duration picker bottom sheet */}
                {showDurationPicker && (
                  <>
                    <div
                      className="fixed inset-0 bg-black/50 z-[200]"
                      onClick={() => setShowDurationPicker(false)}
                      aria-hidden
                    />
                    <div
                      className="fixed bottom-0 left-0 right-0 z-[201] bg-white/10 dark:bg-brand-darkSurface/95 backdrop-blur-xl rounded-t-3xl border-t border-white/20 p-6 pb-safe"
                      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-4">
                        Sitting duration
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {PRESET_DURATIONS_MINUTES.map((min) => (
                          <button
                            key={min}
                            onClick={() => {
                              setDurationMinutes(min);
                              setShowDurationPicker(false);
                            }}
                            className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                              durationMinutes === min
                                ? 'bg-[#88C0A8] text-slate-950'
                                : 'bg-white/10 text-white/80 hover:bg-white/20'
                            }`}
                          >
                            {min >= 60 ? `${min / 60}h` : `${min}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* End & Reflect — subtle glow so it's easy to find */}
                <button
                  onClick={handleLeaveMeditation}
                  className="relative z-10 px-6 py-2.5 rounded-full bg-white/5 border border-white/20 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/10 hover:text-white/90 transition-all mt-2 shadow-[0_0_20px_rgba(255,255,255,0.12),0_0_40px_rgba(136,192,168,0.08)] hover:shadow-[0_0_24px_rgba(255,255,255,0.18),0_0_48px_rgba(136,192,168,0.12)]"
                >
                  End &amp; Reflect
                </button>
              </div>
            </div>
          )}

          {phase === 'COMPLETE' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full max-w-2xl mx-auto">
              {/* Top bar: generous margins + large back button (match Sangha Stream / app) */}
              <div className="pt-safe pt-16 pb-4 px-5 border-b border-white/10 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setPhase('ENTRY')}
                  className="p-3.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-md active:scale-95 shadow-lg"
                  aria-label="Back"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300 animate-pulse" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                    Live
                  </span>
                  <span className="text-[11px] text-white/50 font-light">
                    {userCount} meditating
                  </span>
                </div>
                <div className="w-14" />
              </div>

              <div
                className="flex-1 overflow-y-auto px-5 py-6"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
              >
                <div className="w-full max-w-md mx-auto bg-white/5 border border-white/10 rounded-3xl px-5 py-7 sm:px-7 sm:py-9 backdrop-blur-2xl shadow-[0_18px_65px_rgba(15,23,42,0.9)] flex flex-col items-center relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none opacity-35">
                    <div className="absolute -top-32 left-6 w-64 h-64 bg-emerald-500/25 blur-3xl rounded-full" />
                    <div className="absolute bottom-[-160px] right-[-40px] w-80 h-80 bg-cyan-500/20 blur-3xl rounded-full" />
                  </div>

                  <div className="relative flex flex-col items-center mb-4">
                  <div className="mb-3 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-400/25 flex items-center justify-center border border-emerald-200/70">
                      <Heart size={20} className="text-emerald-100 fill-emerald-300/40" />
                    </div>
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-serif font-light text-white mt-3 text-center"
                    style={{ fontFamily: '"Crimson Text", "Spectral", "Source Serif Pro", serif' }}
                  >
                    Meditation Complete
                  </h2>
                  <p className="text-xs text-slate-200/80 text-center mt-2 max-w-sm">
                    Notice your breath before you move on.
                  </p>
                </div>

                <div
                  ref={shareCardRef}
                  className="relative w-full grid gap-2 text-sm text-slate-100 rounded-3xl bg-[#060D1B]/75 border border-white/10 px-4 py-4"
                >
                  <div className="flex items-center justify-between mb-0">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                        School of Breath
                      </p>
                      <p className="text-[11px] text-slate-200/90">
                        Live Meditation
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {new Date(lastSessionEndTime ?? Date.now()).toLocaleDateString(
                        undefined,
                        { month: 'short', day: 'numeric' }
                      )}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-black/30 border border-white/10 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      Focus
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <CurrentThemeIcon size={14} className={currentTheme.iconClassName} />
                      {currentTheme.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                    <span className="text-[11px] text-slate-200/90 flex items-center gap-1.5">
                      <Clock size={14} />
                      Time
                    </span>
                    <span className="font-semibold text-sm">
                      {totalMinutesSat} min
                      {totalMinutesSat > durationMinutes && (
                        <span className="block text-[11px] text-amber-400/90">+{totalMinutesSat - durationMinutes} bonus</span>
                      )}
                    </span>
                  </div>

                  {(intention || '').trim() && (
                    <div className="rounded-2xl bg-emerald-400/10 border border-emerald-300/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200 mb-0.5">
                        Intention
                      </p>
                      <p className="text-xs text-emerald-50/95">“{(intention || '').trim()}”</p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-black/30 border border-white/10 px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      Hearts
                    </span>
                    <span className="text-sm font-semibold">
                      {userCount.toLocaleString()}
                    </span>
                  </div>

                  {(reflection || '').trim() && (
                    <div className="rounded-2xl bg-black/40 border border-white/10 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300 mb-0.5">
                        Shared
                      </p>
                      <p className="text-xs text-slate-100/95 italic" style={{ lineHeight: 1.5 }}>
                        “{(reflection || '').trim()}”
                      </p>
                    </div>
                  )}

                  {selectedBlessing && (
                    <div className="rounded-2xl bg-black/30 border border-white/5 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300 mb-0.5">
                        For all beings
                      </p>
                      <p className="text-xs text-slate-100/90 italic" style={{ lineHeight: 1.6 }}>
                        {selectedBlessing}
                      </p>
                    </div>
                  )}
                </div>

                <div className="relative w-full border-t border-white/10 mt-6 pt-5">
                  <p className="text-xs text-slate-200/90 mb-3">
                    Share with sangha or skip.
                  </p>
                  <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 mb-3 resize-none"
                    placeholder='e.g. "Felt deep peace"…'
                  />
                  <div className="text-[11px] text-white/45 mb-3">
                    {reflection.length}/500
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setPhase('FEED')}
                      className="py-3 rounded-2xl border border-white/20 bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:bg-white/5 transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleShareToFeed}
                      disabled={isSharingToFeed}
                      className="py-3 rounded-2xl bg-[#88C0A8] text-slate-950 text-xs font-bold uppercase tracking-[0.22em] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {isSharingToFeed ? (
                        <>
                          <Pause size={14} />
                          Posting…
                        </>
                      ) : (
                        <>
                          <MessageCircle size={14} />
                          Share with Sangha
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}

          {phase === 'FEED' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full max-w-2xl mx-auto">
              {/* Minimal header — extra top margin for phone safe area */}
              <div className="pt-safe pt-36 pb-4 px-5 border-b border-white/10 flex items-center justify-between shrink-0 gap-5">
                <button
                  onClick={() => navigate('/')}
                  className="p-3.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-md active:scale-95 shadow-lg shrink-0"
                  aria-label="Back to home"
                >
                  <ArrowLeft size={24} />
                </button>
                <span className="text-sm font-semibold text-white/95 uppercase tracking-[0.12em]">Meditation History</span>
                <div className="w-14" />
              </div>

              {/* Content — no redundant Meditation History label */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                <div>
                  <p className="text-[11px] text-[#B8C5D0] opacity-80">Last 90 days with the sangha</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#EAE4FF]">
                  <div className="rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
                    <p className="uppercase tracking-[0.15em] text-[9px] text-[#B8C5D0] mb-0.5">Current Streak</p>
                    <p className="text-sm font-semibold">{currentStreak} days</p>
                  </div>
                  <div className="rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
                    <p className="uppercase tracking-[0.15em] text-[9px] text-[#B8C5D0] mb-0.5">Longest Streak</p>
                    <p className="text-sm font-semibold">{longestStreak} days</p>
                  </div>
                  <div className="rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
                    <p className="uppercase tracking-[0.15em] text-[9px] text-[#B8C5D0] mb-0.5">Sessions This Month</p>
                    <p className="text-sm font-semibold">{totalSessionsThisMonth}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
                    <p className="uppercase tracking-[0.15em] text-[9px] text-[#B8C5D0] mb-0.5">Minutes This Month</p>
                    <p className="text-sm font-semibold">{totalMinutesThisMonth}</p>
                  </div>
                </div>

                {/* Last 6 days — each day's duration */}
                <div className="pt-2">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#B8C5D0] mb-2">Last 6 days</p>
                  <div className="space-y-1.5">
                    {last6DaysWithDuration.map(({ dateStr, label, totalMinutes }) => (
                      <div
                        key={dateStr}
                        className="flex items-center justify-between rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-[11px]"
                      >
                        <span className="text-white/80">{label}</span>
                        <span className="text-white/60">{totalMinutes > 0 ? `${totalMinutes} min` : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hidden story card for export */}
              <div
                ref={storyCardRef}
                className="absolute -left-[9999px] top-0"
                style={{ width: 1080, height: 1920 }}
              >
                <LiveMeditationStoryCard
                  static
                  data={{
                    date: new Date(lastSessionEndTime ?? Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    focus: currentTheme.label,
                    FocusIcon: CurrentThemeIcon,
                    focusIconColor: '#8EE6C1',
                    durationMinutes: totalMinutesSat,
                    quote: (intention || '').trim() || (THEMED_INTENTIONS[currentTheme.id]?.[0] ?? 'Each breath invites tenderness and repair.'),
                    heartsReceived: userCount,
                    spiritualChallenge: getDailySpiritualChallenge(new Date(lastSessionEndTime ?? Date.now())),
                    userName: user?.trim() || undefined,
                  }}
                />
              </div>

              {/* Download Achievement — bottom with margin */}
              <div className="px-4 pt-4 pb-safe shrink-0" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!storyCardRef.current) return;
                    try {
                      await exportLiveMeditationStory(
                        storyCardRef.current,
                        `live-meditation-achievement-${Date.now()}.png`
                      );
                    } catch (error) {
                      console.error('[Live Meditation] Failed to download achievement', error);
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-[#88C0A8] text-slate-950 text-xs font-bold uppercase tracking-[0.18em] flex items-center justify-center gap-2 shadow-md active:scale-[0.98] hover:brightness-105 transition-all"
                >
                  <Download size={14} />
                  Download Achievement
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Sangha Stream — only shown after session (FEED), not during ACTIVE */}
        {phase === 'ACTIVE' && false && (
        <div className="lg:w-[360px] xl:w-[400px] border-l border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-200" />
              <span className="text-sm font-semibold">Sangha Stream</span>
            </div>
            <span className="text-[11px] text-[#B8C5D0] opacity-75">
              Real-time completions & presence
            </span>
          </div>

          {/* Live participants */}
          <div className="px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-[0.24em] text-[#8A9BAF] opacity-60">
                Meditating Now
              </span>
              <span className="text-xs text-[#B8C5D0] opacity-75 flex items-center gap-1">
                <Users size={13} className="text-emerald-300" />
                {userCount.toLocaleString()} souls present
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {activeMeditators.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center my-10">
                  When you sit, you become visible here, breathing with others across the world.
                </p>
              ) : (
                activeMeditators.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-7 h-7 rounded-full bg-emerald-400/30 flex items-center justify-center text-[11px] font-semibold text-emerald-50">
                        {m.initial}
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_0_4px_rgba(16,185,129,0.4)]" />
                      </div>
                      <div>
                    <p className="text-[11px] font-semibold text-white/95">{m.name}</p>
                    <p className="text-[10px] text-[#B8C5D0] opacity-75">
                          Started {getMinutesAgo(m.startedAt)} min ago • {m.durationMinutes} min
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#B8C5D0] opacity-75">
                      {Math.max(0, m.durationMinutes - getMinutesAgo(m.startedAt))} min left
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Community feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {sortedMessages.slice(0, 6).map(msg => {
              const isHearted = heartedMessages.includes(msg.id);
              const isBot = msg.source === 'bot';
              return (
              <div
                key={msg.id}
                className={`my-1 rounded-3xl border p-4 text-xs space-y-2 animate-fade-in ${
                  isBot
                    ? 'bg-[rgba(255,255,255,0.02)] border-white/5 opacity-90'
                    : 'bg-[rgba(255,255,255,0.03)] border-white/10 text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                      isBot ? 'bg-teal-400/20 text-teal-100/90' : 'bg-emerald-400/30 text-emerald-50'
                    }`}>
                      {msg.user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[11px] font-semibold ${isBot ? 'text-white/80' : 'text-white/95'}`}>{msg.user}</p>
                        {isBot && (
                          <span className="text-[9px] text-teal-300/80 flex items-center gap-0.5">
                            <Sparkles size={10} className="text-teal-300/70" />
                            Sangha
                          </span>
                        )}
                        {msg.source === 'real' && (
                          <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
                            <Sparkles size={10} className="text-amber-400" />
                            Sangha
                          </span>
                        )}
                      </div>
                      {msg.durationMinutes && (
                        <p className="text-[10px] text-[#B8C5D0] opacity-75 flex items-center gap-1.5">
                          <span className="inline-flex h-3 w-3 items-center justify-center">
                            <Moon size={10} className="text-[#B8C5D0]/70" />
                          </span>
                          <span>
                            {msg.durationMinutes}{' '}
                            {msg.durationMinutes === 1 ? 'minute of stillness' : 'minutes of stillness'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-[#B8C5D0] opacity-75">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {msg.intention && (
                  <div className="rounded-2xl bg-emerald-400/10 border border-emerald-300/30 px-3 py-2">
                    <p className="text-xs text-emerald-50/95">“{msg.intention}”</p>
                  </div>
                )}

                {msg.reflection && (
                  <p
                    className="mt-4 text-[10px] text-slate-100/95 italic"
                    style={{ lineHeight: 1.75 }}
                  >
                    {msg.reflection}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    disabled={isHearted}
                    onClick={() => {
                      if (isHearted) return;
                      setHeartedMessages(prev => [...prev, msg.id]);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 border text-[11px] transition-colors ${
                      isHearted
                        ? 'bg-emerald-400/15 border-emerald-300 text-emerald-50 cursor-default'
                        : 'bg-white/5 border-white/10 text-slate-100 hover:bg-white/10'
                    }`}
                  >
                    <Heart
                      size={11}
                      className={isHearted ? 'text-[#FFB3BA] fill-[#FFB3BA]' : 'text-emerald-200'}
                    />
                    <span>{isHearted ? 'Heart Sent' : 'Send Heart'}</span>
                  </button>
                  {msg.participantsAtCompletion && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="inline-flex h-3 w-3 items-center justify-center">
                        <Heart size={11} className="text-[#FF9AA2] animate-pulse" />
                      </span>
                      <span>
                        Breathed with {msg.participantsAtCompletion.toLocaleString()}{' '}
                        <span className="text-[#FFB3BA]">hearts</span>
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )})}
            <div ref={feedEndRef} />
          </div>

          {/* Meditation History (summary only) */}
          <div className="px-4 pb-5 pt-4 space-y-4 border-t border-white/10 bg-[rgba(15,40,50,0.9)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#C6B3FF]">
                  Meditation History
                </p>
                <p className="text-[11px] text-[#B8C5D0] opacity-75">
                  Last 90 days with the sangha
                </p>
              </div>
            </div>

            {/* Stats summary cards */}
            <div className="grid grid-cols-2 gap-3 text-[11px] text-[#EAE4FF]">
              <div className="rounded-2xl bg-[rgba(63,46,89,0.7)] px-3 py-3 border border-[rgba(177,144,214,0.5)]">
                <p className="uppercase tracking-[0.18em] text-[9px] text-[#D3C1FF] mb-1">
                  Current Streak
                </p>
                <p className="text-base font-semibold">{currentStreak} days</p>
              </div>
              <div className="rounded-2xl bg-[rgba(63,46,89,0.4)] px-3 py-3 border border-[rgba(177,144,214,0.35)]">
                <p className="uppercase tracking-[0.18em] text-[9px] text-[#D3C1FF] mb-1">
                  Longest Streak
                </p>
                <p className="text-base font-semibold">{longestStreak} days</p>
              </div>
              <div className="rounded-2xl bg-[rgba(63,46,89,0.35)] px-3 py-3 border border-[rgba(177,144,214,0.25)]">
                <p className="uppercase tracking-[0.18em] text-[9px] text-[#D3C1FF] mb-1">
                  Sessions This Month
                </p>
                <p className="text-base font-semibold">{totalSessionsThisMonth}</p>
              </div>
              <div className="rounded-2xl bg-[rgba(63,46,89,0.35)] px-3 py-3 border border-[rgba(177,144,214,0.25)]">
                <p className="uppercase tracking-[0.18em] text-[9px] text-[#D3C1FF] mb-1">
                  Minutes This Month
                </p>
                <p className="text-base font-semibold">{totalMinutesThisMonth}</p>
              </div>
            </div>

          </div>
        </div>
        )}
      </div>

      {/* Meditation history modal */}
      {isHistoryModalOpen && selectedHistoryDay && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#151320] border border-[rgba(177,144,214,0.6)] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#C6B3FF]">
                  {new Date(selectedHistoryDay.date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-white/90">
                  {selectedHistoryDay.sessions.length} session
                  {selectedHistoryDay.sessions.length === 1 ? '' : 's'} •{' '}
                  {selectedHistoryDay.sessions.reduce(
                    (sum, s) => sum + s.durationMinutes,
                    0
                  )}{' '}
                  minutes
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {selectedHistoryDay.sessions.map(s => (
                <div
                  key={s.id}
                  className="rounded-2xl bg-[rgba(46,35,64,0.9)] border border-[rgba(177,144,214,0.5)] px-3 py-2 space-y-1 text-[11px]"
                >
                  <p className="text-[#EAE4FF]">
                    {s.durationMinutes} min •{' '}
                    <span className="uppercase tracking-[0.16em] text-[9px] text-[#C6B3FF]">
                      {s.focus}
                    </span>
                  </p>
                  {s.intention && (
                    <p className="text-[11px] text-[#D6CFFF] italic">
                      “{s.intention}”
                    </p>
                  )}
                  {s.reflection && (
                    <p className="text-[11px] text-[#BFD1E3]" style={{ lineHeight: 1.7 }}>
                      {s.reflection}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
