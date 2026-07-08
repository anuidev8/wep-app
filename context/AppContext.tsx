
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { UserStats, Badge, GratitudeEntry, IntentionEntry, PatternProgress, AIProfile, DailyPreference, UserFavorites, FavoriteCategory, UserPreferences, NotificationPreferences } from '../types';
import { fetchGratitudeEntries, createGratitudeEntry, deleteGratitudeEntryApi } from '../services/gratitudeService';
import { getIntentionHistory, createIntention, deleteIntention } from '../services/intentionApi';
import { getLatestHoroscope } from '../services/horoscopeService';
import { INITIAL_BADGES } from '../constants';
import { initializeCapacitor } from '../services/capacitorInit';
import { initializeSocialLogin } from '../services/socialLoginService';
import { getStoredAuth } from '../services/authService';
import { updateNotificationPreferences } from '../services/notificationsService';
import { getOnboardingCompletionStatus } from '../services/onboardingService';

export type MembershipStatus = 'Free' | 'Premium Membership' | 'Trial' | 'Grace Period' | 'Expired';

interface AppContextType {
  user: string;
  stats: UserStats;
  gratitudeEntries: GratitudeEntry[];
  gratitudeTodayCompleted: boolean;
  intentionEntries: IntentionEntry[];
  intentionTodayCompleted: boolean;
  hasHoroscopeToday: boolean;
  hasCompletedOnboarding: boolean;
  isOnboardingStatusResolved: boolean;
  patternProgress: Record<string, PatternProgress>;
  aiProfile: AIProfile;
  favorites: UserFavorites;
  heartedMantraIds: string[];
  heartedGuidedIds: string[];
  userPreferences: UserPreferences | null;
  notificationPrefs: NotificationPreferences;
  updateNotificationPrefs: (prefs: NotificationPreferences | ((prev: NotificationPreferences) => NotificationPreferences)) => void;
  membershipStatus: MembershipStatus;
  setMembershipStatus: (status: MembershipStatus) => void;
  membershipIsLoading: boolean;
  setMembershipIsLoading: (loading: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  addCalmPoints: (points: number) => void;
  incrementStreak: () => void;
  unlockBadge: (badgeId: string) => void;
  resetProgress: () => void;
  addGratitudeEntry: (items: string[]) => Promise<void>;
  deleteGratitudeEntry: (id: string) => Promise<void>;
  addIntentionEntry: (text: string) => Promise<void>;
  deleteIntentionEntry: (id: string) => Promise<void>;
  markOnboardingComplete: () => void;
  saveUserPreferences: (prefs: UserPreferences) => void;
  registerBreathCycle: (patternId: string) => void;
  levelUpPattern: (patternId: string) => void;
  levelDownPattern: (patternId: string) => void;
  resetPatternLevel: (patternId: string) => void;
  togglePatternFreeze: (patternId: string) => void;
  updateDifficultyScore: (delta: number, entry: DailyPreference) => void;
  toggleFavorite: (id: string, category: FavoriteCategory) => void;
  toggleHeartMantra: (id: string) => void;
  toggleHeartGuided: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper function to get today's date as YYYY-MM-DD string (Local Time)
const getTodayDateString = (): string => {
  const now = new Date();
  // 'en-CA' locale outputs YYYY-MM-DD format
  return now.toLocaleDateString('en-CA');
};

// Helper function to calculate days difference between two dates
const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Calculate streak from array of session dates
const calculateStreakFromDates = (sessionDates: string[]): number => {
  if (!sessionDates || sessionDates.length === 0) return 0;
  
  // Sort dates and remove duplicates
  const uniqueDates = [...new Set(sessionDates)].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
  
  if (uniqueDates.length === 0) return 0;
  
  const today = getTodayDateString();
  const todayDate = new Date(today);
  
  // Check if today or yesterday is in the list
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // If today is not in the list, check if yesterday is (streak can continue from yesterday)
  let startDate: Date;
  if (uniqueDates.includes(today)) {
    // Today has a session - count from today
    startDate = new Date(today);
  } else if (uniqueDates.includes(yesterdayStr)) {
    // Yesterday has a session but not today - count from yesterday
    startDate = new Date(yesterdayStr);
  } else {
    // No recent activity (today or yesterday) - streak is broken
    return 0;
  }
  
  // Count consecutive days backwards from start date
  let streak = 0;
  let checkDate = new Date(startDate);
  
  // Limit to checking last 365 days to avoid infinite loops
  const maxDaysToCheck = 365;
  let daysChecked = 0;
  
  while (daysChecked < maxDaysToCheck) {
    const checkDateStr = checkDate.toISOString().split('T')[0];
    
    if (uniqueDates.includes(checkDateStr)) {
      streak++;
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1);
      daysChecked++;
    } else {
      // Gap found - streak is broken
      break;
    }
  }
  
  return streak;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState('Abhi');
  const [stats, setStats] = useState<UserStats>({
    streakDays: 0, // Start at 0, will be calculated from sessionDates
    totalCalmPoints: 0,
    sessionsCompleted: 0,
    badges: INITIAL_BADGES,
    sessionDates: [], // Track all session dates for accurate streak calculation
  });
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [gratitudeTodayCompleted, setGratitudeTodayCompleted] = useState(false);
  const [intentionEntries, setIntentionEntries] = useState<IntentionEntry[]>([]);
  const [intentionTodayCompleted, setIntentionTodayCompleted] = useState(false);
  const [hasHoroscopeToday, setHasHoroscopeToday] = useState(false);

  useEffect(() => {
    // Check if horoscope is available in local storage for today
    const checkHoroscopeStatus = () => {
      try {
        const today = getTodayDateString();
        const last = localStorage.getItem('daily_horoscope_last_generated_v1');
        
        if (last && JSON.parse(last).date === today) {
          // Double check if we have the content
          const cache = localStorage.getItem('daily_horoscope_result_v1_' + today);
          if (cache) {
            setHasHoroscopeToday(true);
            return;
          }
        }
        setHasHoroscopeToday(false);
      } catch {
        setHasHoroscopeToday(false);
      }
    };

    checkHoroscopeStatus();
    // Listen for storage events in case it changes in another tab/window
    window.addEventListener('storage', checkHoroscopeStatus);
    // Custom event for when horoscope is generated within the app
    window.addEventListener('horoscope_generated', checkHoroscopeStatus);
    
    return () => {
      window.removeEventListener('storage', checkHoroscopeStatus);
      window.removeEventListener('horoscope_generated', checkHoroscopeStatus);
    };
  }, []);
  
  // Lazy init to prevent race condition on initial load redirect
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    return localStorage.getItem('breathAppOnboardingComplete') === 'true';
  });
  const [isOnboardingStatusResolved, setIsOnboardingStatusResolved] = useState(false);
  const [onboardingStatusEmail, setOnboardingStatusEmail] = useState<string | null>(null);

  const [patternProgress, setPatternProgress] = useState<Record<string, PatternProgress>>({});
  const [favorites, setFavorites] = useState<UserFavorites>({});
  const [heartedMantraIds, setHeartedMantraIds] = useState<string[]>([]);
  const [heartedGuidedIds, setHeartedGuidedIds] = useState<string[]>([]);
  
  // AI Personalization State
  const [aiProfile, setAiProfile] = useState<AIProfile>({
      difficultyScore: 5, // Default Moderate
      history: []
  });

  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

  const resolveOnboardingStatus = useCallback(async (email: string | null, isActiveRef: () => boolean) => {
    if (!email) {
      if (!isActiveRef()) return;
      setOnboardingStatusEmail(null);
      setHasCompletedOnboarding(false);
      setIsOnboardingStatusResolved(false);
      return;
    }

    try {
      const status = await getOnboardingCompletionStatus();
      if (!isActiveRef()) return;
      if (typeof status === 'boolean') {
        setHasCompletedOnboarding(status);
        localStorage.setItem('breathAppOnboardingComplete', status ? 'true' : 'false');
      }
    } catch (error) {
      console.warn('[AppContext] Failed to resolve onboarding status', error);
    } finally {
      if (!isActiveRef()) return;
      setOnboardingStatusEmail(email);
      setIsOnboardingStatusResolved(true);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const isActiveRef = () => isActive;

    const checkAuthAndResolve = async () => {
      const auth = await getStoredAuth();
      const email = auth?.email || null;
      if (!isActive) return;

      if (email !== onboardingStatusEmail || !isOnboardingStatusResolved) {
        await resolveOnboardingStatus(email, isActiveRef);
      }
    };

    checkAuthAndResolve();

    // Only poll while not yet resolved — once resolved, auth changes arrive via
    // login/logout events and this effect re-runs via state deps. Continuous polling
    // in the background would hammer Preferences.get() every 2s indefinitely.
    if (isOnboardingStatusResolved) {
      return () => { isActive = false; };
    }

    const interval = window.setInterval(checkAuthAndResolve, 2000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [isOnboardingStatusResolved, onboardingStatusEmail, resolveOnboardingStatus]);

  // --- NOTIFICATION PREFERENCES ---
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const defaultNotificationPrefs: NotificationPreferences = {
    masterEnabled: true,
    hasPermission: false,
    timezone: defaultTimezone,
    morningRitual: {
      enabled: true,
      time: '07:00',
      lastSent: null,
    },
    eveningWindDown: {
      enabled: true,
      time: '20:00',
      lastSent: null,
    },
    courseReminders: {
      enabled: true,
      lastSent: null,
      triggerOnChapterComplete: true,
    },
    newReleases: {
      enabled: true,
      lastSent: null,
      manualTrigger: true,
    },
  };

  const normalizeNotificationPrefs = (raw: any): NotificationPreferences => {
    if (!raw || typeof raw !== 'object') {
      return defaultNotificationPrefs;
    }

    const hasNewShape =
      raw.morningRitual || raw.eveningWindDown || raw.courseReminders || raw.newReleases;

    if (hasNewShape) {
      return {
        ...defaultNotificationPrefs,
        ...raw,
        timezone: typeof raw.timezone === 'string' ? raw.timezone : defaultNotificationPrefs.timezone,
        morningRitual: { ...defaultNotificationPrefs.morningRitual, ...(raw.morningRitual || {}) },
        eveningWindDown: { ...defaultNotificationPrefs.eveningWindDown, ...(raw.eveningWindDown || {}) },
        courseReminders: { ...defaultNotificationPrefs.courseReminders, ...(raw.courseReminders || {}) },
        newReleases: { ...defaultNotificationPrefs.newReleases, ...(raw.newReleases || {}) },
      };
    }

    return {
      ...defaultNotificationPrefs,
      hasPermission: typeof raw.hasPermission === 'boolean' ? raw.hasPermission : defaultNotificationPrefs.hasPermission,
      timezone: typeof raw.timezone === 'string' ? raw.timezone : defaultNotificationPrefs.timezone,
      morningRitual: {
        ...defaultNotificationPrefs.morningRitual,
        enabled: raw.mindfulReminders?.enabled ?? defaultNotificationPrefs.morningRitual.enabled,
        time: raw.mindfulReminders?.time || defaultNotificationPrefs.morningRitual.time,
      },
      eveningWindDown: {
        ...defaultNotificationPrefs.eveningWindDown,
        enabled: raw.bedtimeReminders?.enabled ?? defaultNotificationPrefs.eveningWindDown.enabled,
        time: raw.bedtimeReminders?.time || defaultNotificationPrefs.eveningWindDown.time,
      },
      courseReminders: {
        ...defaultNotificationPrefs.courseReminders,
        enabled: raw.gratitudeCheckins?.enabled ?? defaultNotificationPrefs.courseReminders.enabled,
      },
      newReleases: {
        ...defaultNotificationPrefs.newReleases,
        enabled: raw.newContentAlerts?.enabled ?? defaultNotificationPrefs.newReleases.enabled,
      },
    };
  };

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() => {
    // Support both the legacy key and the generic key used elsewhere
    const legacy = localStorage.getItem('breathAppNotificationPrefs');
    const generic = localStorage.getItem('notificationPreferences');
    const raw = legacy || generic;
    if (raw) {
      try {
        const normalized = normalizeNotificationPrefs(JSON.parse(raw));
        const serialized = JSON.stringify(normalized);
        localStorage.setItem('breathAppNotificationPrefs', serialized);
        localStorage.setItem('notificationPreferences', serialized);
        return normalized;
      } catch (e) {
        console.error('Failed to parse notification prefs', e);
      }
    }
    // If nothing stored, seed both keys with defaults (all toggles ON)
    try {
      const serialized = JSON.stringify(defaultNotificationPrefs);
      localStorage.setItem('breathAppNotificationPrefs', serialized);
      localStorage.setItem('notificationPreferences', serialized);
    } catch {
      // ignore storage errors
    }
    return defaultNotificationPrefs;
  });

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationPrefs(prev => ({ ...prev, hasPermission: true }));
      } else if (Notification.permission === 'denied') {
        setNotificationPrefs(prev => ({ ...prev, hasPermission: false }));
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const syncTimezone = async () => {
      try {
        const auth = await getStoredAuth();
        if (!auth?.email) return;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        if (notificationPrefs.timezone === tz) return;
        const nextPrefs = { ...notificationPrefs, timezone: tz };
        updateNotificationPrefs(nextPrefs);
        await updateNotificationPreferences(nextPrefs);
      } catch (err) {
        if (!cancelled) {
          console.warn('[AppContext] Failed to sync timezone', err);
        }
      }
    };
    syncTimezone();
    return () => {
      cancelled = true;
    };
  }, [notificationPrefs.timezone]);

  const updateNotificationPrefs = (prefsOrUpdater: NotificationPreferences | ((prev: NotificationPreferences) => NotificationPreferences)) => {
    setNotificationPrefs(prev => {
      const next = typeof prefsOrUpdater === 'function' ? prefsOrUpdater(prev) : prefsOrUpdater;
      try {
        const serialized = JSON.stringify(next);
        localStorage.setItem('breathAppNotificationPrefs', serialized);
        localStorage.setItem('notificationPreferences', serialized);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // --- MEMBERSHIP STATUS ---
  // Membership is determined only by RevenueCat/Systeme.io sync (useMembershipState), not from login response.
  const [membershipStatus, setMembershipStatusState] = useState<MembershipStatus>(() => {
    const saved = localStorage.getItem('breathAppMembershipStatus');
    if (saved === 'Premium Membership' || saved === 'Trial' || saved === 'Grace Period' || saved === 'Expired') {
      return saved;
    }
    return 'Free';
  });

  const setMembershipStatus = (status: MembershipStatus) => {
    setMembershipStatusState(status);
    localStorage.setItem('breathAppMembershipStatus', status);
  };

  // Tracks whether membership has been synced for the current auth session.
  // Used by UI (SideMenu) to avoid showing stale "Free" immediately after login.
  const [membershipIsLoading, setMembershipIsLoading] = useState<boolean>(true);

  // --- THEME MANAGEMENT ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      const savedTheme = localStorage.getItem('breathAppTheme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
      }
      return 'light';
  });

  useEffect(() => {
      const root = window.document.documentElement;
      if (theme === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
      localStorage.setItem('breathAppTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Initialize Capacitor on mount (ensures plugins are ready)
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeCapacitor();
        await initializeSocialLogin();
      } catch (e) {
        console.error('[AppContext] Failed to initialize native services', e);
      }
    };

    initialize();
  }, []);

  // Load stats from local storage and validate/update streak
  useEffect(() => {
    const saved = localStorage.getItem('breathAppStats_v2');
    if (saved) {
      try {
        const loadedStats = JSON.parse(saved);
        
        // Ensure sessionDates array exists (for backward compatibility)
        const sessionDates = loadedStats.sessionDates || [];
        
        // If we have lastSessionDate but no sessionDates, migrate it
        if (loadedStats.lastSessionDate && sessionDates.length === 0) {
          sessionDates.push(loadedStats.lastSessionDate);
        }
        
        // Calculate streak from actual session dates
        const calculatedStreak = calculateStreakFromDates(sessionDates);
        
        // Update stats with calculated streak
          setStats({
            ...loadedStats,
          streakDays: calculatedStreak,
          sessionDates: sessionDates,
          lastSessionDate: sessionDates.length > 0 ? sessionDates[sessionDates.length - 1] : undefined,
          });
      } catch (e) {
        console.error("Failed to parse stats", e);
      }
    }

    /* localStorage for intentions removed
    const savedIntentions = localStorage.getItem('breathAppIntentions');
    if (savedIntentions) {
      try {
        setIntentionEntries(JSON.parse(savedIntentions));
      } catch (e) {
        console.error("Failed to parse intentions", e);
      }
    }
    */

    const savedPatterns = localStorage.getItem('breathAppPatterns');
    if (savedPatterns) {
        try {
            setPatternProgress(JSON.parse(savedPatterns));
        } catch(e) {
            console.error("Failed to parse patterns", e);
        }
    }

    const savedFavorites = localStorage.getItem('breathAppFavorites_v2');
    if (savedFavorites) {
        try {
            setFavorites(JSON.parse(savedFavorites));
        } catch(e) {
            console.error("Failed to parse favorites", e);
        }
    }

    const savedHearted = localStorage.getItem('breathAppHeartedMantras');
    if (savedHearted) {
        try {
            setHeartedMantraIds(JSON.parse(savedHearted));
        } catch(e) {
            console.error("Failed to parse hearted mantras", e);
        }
    }

    const savedHeartedGuided = localStorage.getItem('breathAppHeartedGuided');
    if (savedHeartedGuided) {
        try {
            setHeartedGuidedIds(JSON.parse(savedHeartedGuided));
        } catch(e) {
            console.error("Failed to parse hearted guided", e);
        }
    }

    const savedAI = localStorage.getItem('breathAppAIProfile');
    if (savedAI) {
        try {
            setAiProfile(JSON.parse(savedAI));
        } catch(e) {
            console.error("Failed to parse AI profile", e);
        }
    }

    const savedPrefs = localStorage.getItem('breathAppUserPrefs');
    if (savedPrefs) {
      try {
        setUserPreferences(JSON.parse(savedPrefs));
      } catch(e) {
        console.error("Failed to parse preferences", e);
      }
    }
  }, []);

  // Save stats to local storage
  useEffect(() => {
    localStorage.setItem('breathAppStats_v2', JSON.stringify(stats));
  }, [stats]);


  /* localStorage save removed
  useEffect(() => {
    localStorage.setItem('breathAppIntentions', JSON.stringify(intentionEntries));
  }, [intentionEntries]);
  */


  // Save patterns to local storage
  useEffect(() => {
      localStorage.setItem('breathAppPatterns', JSON.stringify(patternProgress));
  }, [patternProgress]);

  // Save favorites
  useEffect(() => {
      localStorage.setItem('breathAppFavorites_v2', JSON.stringify(favorites));
  }, [favorites]);

  // Save Hearted Mantras
  useEffect(() => {
      localStorage.setItem('breathAppHeartedMantras', JSON.stringify(heartedMantraIds));
  }, [heartedMantraIds]);

  // Save Hearted Guided
  useEffect(() => {
      localStorage.setItem('breathAppHeartedGuided', JSON.stringify(heartedGuidedIds));
  }, [heartedGuidedIds]);

  // Save AI Profile
  useEffect(() => {
      localStorage.setItem('breathAppAIProfile', JSON.stringify(aiProfile));
  }, [aiProfile]);

  const addCalmPoints = (points: number) => {
    setStats(prev => ({
      ...prev,
      totalCalmPoints: prev.totalCalmPoints + points,
      sessionsCompleted: prev.sessionsCompleted + 1
    }));
  };

  const incrementStreak = () => {
    setStats(prev => {
      const today = getTodayDateString();
      const sessionDates = prev.sessionDates || [];
      
      // If today is already in the session dates, don't add it again
      if (sessionDates.includes(today)) {
        // Recalculate streak in case it changed
        const calculatedStreak = calculateStreakFromDates(sessionDates);
        return {
          ...prev,
          streakDays: calculatedStreak,
          lastSessionDate: today,
        };
      }
      
      // Add today to session dates
      const updatedSessionDates = [...sessionDates, today];
      
      // Calculate streak from all session dates
      const calculatedStreak = calculateStreakFromDates(updatedSessionDates);
      
      // Keep only recent dates (last 30 days) to avoid storage bloat
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredDates = updatedSessionDates.filter(date => {
        const dateObj = new Date(date);
        return dateObj >= thirtyDaysAgo;
      });
      
        return {
          ...prev,
        streakDays: calculatedStreak,
          lastSessionDate: today,
        sessionDates: filteredDates,
        };
    });
  };

  const unlockBadge = (badgeId: string) => {
    setStats(prev => ({
      ...prev,
      badges: prev.badges.map(b => b.id === badgeId ? { ...b, unlocked: true } : b)
    }));
  };

  const resetProgress = () => {
      setStats({
        streakDays: 0,
        totalCalmPoints: 0,
        sessionsCompleted: 0,
        badges: INITIAL_BADGES,
        lastSessionDate: undefined,
        sessionDates: [],
      });
  };

  const addGratitudeEntry = async (items: string[]) => {
    try {
      const auth = await getStoredAuth();
      if (!auth?.email) throw new Error('User not authenticated');

      const newEntry = await createGratitudeEntry(auth.email, items);
      setGratitudeEntries(prev => [newEntry, ...prev]);
      setGratitudeTodayCompleted(true);
    } catch (e) {
      console.error('Failed to add gratitude entry:', e);
      throw e;
    }
  };

  const deleteGratitudeEntry = async (id: string) => {
    try {
      const auth = await getStoredAuth();
      if (!auth?.email) throw new Error('User not authenticated');

      // Check if the deleted entry is today's entry
      const entryToDelete = gratitudeEntries.find(e => e.id === id);
      const isToday = entryToDelete && entryToDelete.date === getTodayDateString();

      await deleteGratitudeEntryApi(auth.email, id);
      setGratitudeEntries(prev => prev.filter(e => e.id !== id));
      
      if (isToday) {
          setGratitudeTodayCompleted(false);
      }
    } catch (e) {
      console.error('Failed to delete gratitude entry:', e);
      throw e;
    }
  };

  // Fetch gratitude, intention, and horoscope completion on load/auth change + visibility/daily-rituals:refresh
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (onboardingStatusEmail) {
          // Fetch Gratitude (API is source of truth for todayCompleted)
          const gratData = await fetchGratitudeEntries(onboardingStatusEmail);
          setGratitudeEntries(gratData.entries);
          setGratitudeTodayCompleted(gratData.todayCompleted);

          // Fetch Intentions (API is source of truth for todayCompleted)
          const intData = await getIntentionHistory();
          setIntentionEntries(intData.entries);
          setIntentionTodayCompleted(intData.todayCompleted);

          // Sync Horoscope completion from API (fallback when localStorage may be stale)
          try {
            const latest = await getLatestHoroscope();
            if (latest?.localDate && latest.content) {
              const today = getTodayDateString();
              setHasHoroscopeToday(latest.localDate === today);
            }
          } catch {
            // Keep existing hasHoroscopeToday; API sync is best-effort
          }
        }
      } catch (e) {
        console.error('Failed to fetch data:', e);
      }
    };
    
    if (isOnboardingStatusResolved) {
        fetchData();
    }

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && onboardingStatusEmail) {
            fetchData();
        }
    };
    const handleDailyRitualsRefresh = () => {
        if (onboardingStatusEmail) fetchData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('daily-rituals:refresh', handleDailyRitualsRefresh);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('daily-rituals:refresh', handleDailyRitualsRefresh);
    };
  }, [onboardingStatusEmail, isOnboardingStatusResolved]);

  const addIntentionEntry = async (text: string) => {
    try {
      // createIntention handles auth/headers internally
      const newEntry = await createIntention(text);
      setIntentionEntries(prev => [newEntry, ...prev]);
      setIntentionTodayCompleted(true);
    } catch (e) {
      console.error('Failed to add intention entry:', e);
      throw e;
    }
  };

  const deleteIntentionEntry = async (id: string) => {
    try {
      // deleteIntention handles auth/headers internally
      const entryToDelete = intentionEntries.find(e => e.id === id);
      // Use local date string comparison
      const todayStr = getTodayDateString();
      const isToday = entryToDelete && entryToDelete.date === todayStr;

      await deleteIntention(id);
      setIntentionEntries(prev => prev.filter(e => e.id !== id));
      
      if (isToday) {
          setIntentionTodayCompleted(false);
      }
    } catch (e) {
      console.error('Failed to delete intention entry:', e);
      throw e;
    }
  };

  const markOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('breathAppOnboardingComplete', 'true');
  };

  const saveUserPreferences = (prefs: UserPreferences) => {
    setUserPreferences(prefs);
    localStorage.setItem('breathAppUserPrefs', JSON.stringify(prefs));
  };

  // --- ADAPTIVE DIFFICULTY LOGIC ---
  const registerBreathCycle = (patternId: string) => {
    setPatternProgress(prev => {
        const current = prev[patternId] || { level: 1, isFrozen: false, cyclesInLevel: 0 };
        return {
            ...prev,
            [patternId]: { ...current, cyclesInLevel: current.cyclesInLevel + 1 }
        };
    });
  };

  const levelUpPattern = (patternId: string) => {
      setPatternProgress(prev => {
          const current = prev[patternId] || { level: 1, isFrozen: false, cyclesInLevel: 0 };
          
          // CAP FIRE BREATH AT LEVEL 6
          const isFirePattern = ['ENERGY', 'BHASTRIKA', 'DETOX'].includes(patternId);
          if (isFirePattern && current.level >= 6) return prev;

          return {
              ...prev,
              [patternId]: { 
                  ...current, 
                  level: current.level + 1,
                  cyclesInLevel: 0 
              }
          };
      });
  };

  const levelDownPattern = (patternId: string) => {
      setPatternProgress(prev => {
          const current = prev[patternId] || { level: 1, isFrozen: false, cyclesInLevel: 0 };
          // Don't drop below level 1
          if (current.level <= 1) return prev;
          
          return {
              ...prev,
              [patternId]: { 
                  ...current, 
                  level: current.level - 1,
                  cyclesInLevel: 0 
              }
          };
      });
  };

  const resetPatternLevel = (patternId: string) => {
    setPatternProgress(prev => ({
        ...prev,
        [patternId]: { level: 1, isFrozen: false, cyclesInLevel: 0 }
    }));
  };

  const togglePatternFreeze = (patternId: string) => {
      setPatternProgress(prev => {
          const current = prev[patternId] || { level: 1, isFrozen: false, cyclesInLevel: 0 };
          return {
              ...prev,
              [patternId]: { ...current, isFrozen: !current.isFrozen }
          };
      });
  };

  const updateDifficultyScore = (delta: number, entry: DailyPreference) => {
      setAiProfile(prev => {
          // Clamp between 1 and 10
          const newScore = Math.min(10, Math.max(1, prev.difficultyScore + delta));
          // Keep last 30 entries for history
          const newHistory = [entry, ...prev.history].slice(0, 30);
          return {
              difficultyScore: newScore,
              history: newHistory
          };
      });
  };

  const toggleFavorite = (id: string, category: FavoriteCategory) => {
      setFavorites(prev => {
          const currentFavorite = prev[category];
          // If the clicked item is already the favorite, remove it (toggle off)
          if (currentFavorite === id) {
              const newState = { ...prev };
              delete newState[category];
              return newState;
          }
          // Otherwise, overwrite with the new ID
          return {
              ...prev,
              [category]: id
          };
      });
  };

  const toggleHeartMantra = async (id: string) => {
      try {
          const auth = await getStoredAuth();
          if (auth?.token) {
              // Sync with API
              const { toggleMantraFavorite } = await import('../services/mantrasService');
              await toggleMantraFavorite(auth.token, id);
          }
          
          // Update local state optimistically
          setHeartedMantraIds(prev => {
              if (prev.includes(id)) {
                  return prev.filter(mid => mid !== id);
              }
              return [...prev, id];
          });
      } catch (error) {
          console.error('[AppContext] Failed to toggle mantra favorite:', error);
          // Still update local state even if API call fails
          setHeartedMantraIds(prev => {
              if (prev.includes(id)) {
                  return prev.filter(mid => mid !== id);
              }
              return [...prev, id];
          });
      }
  };

  const toggleHeartGuided = (id: string) => {
      setHeartedGuidedIds(prev => {
          if (prev.includes(id)) {
              return prev.filter(mid => mid !== id);
          }
          return [...prev, id];
      });
  };

  const contextValue = useMemo(() => ({
      user,
      stats,
      gratitudeEntries,
      gratitudeTodayCompleted,
      intentionEntries,
      intentionTodayCompleted,
      hasHoroscopeToday,
      hasCompletedOnboarding,
      isOnboardingStatusResolved,
      patternProgress,
      aiProfile,
      favorites,
      heartedMantraIds,
      heartedGuidedIds,
      userPreferences,
      notificationPrefs,
      updateNotificationPrefs,
      membershipStatus,
      setMembershipStatus,
      membershipIsLoading,
      setMembershipIsLoading,
      theme,
      toggleTheme,
      addCalmPoints, 
      incrementStreak, 
      unlockBadge, 
      resetProgress, 
      addGratitudeEntry, 
      deleteGratitudeEntry, 
      addIntentionEntry,
      deleteIntentionEntry,
      markOnboardingComplete, 
      saveUserPreferences,
      registerBreathCycle, 
      levelUpPattern,
      levelDownPattern,
      resetPatternLevel,
      togglePatternFreeze,
      updateDifficultyScore,
      toggleFavorite,
      toggleHeartMantra,
      toggleHeartGuided
  }), [
      user, 
      stats, 
      gratitudeEntries,
      gratitudeTodayCompleted,
      intentionEntries,
      intentionTodayCompleted,
      hasHoroscopeToday,
      hasCompletedOnboarding,
      isOnboardingStatusResolved,
      patternProgress,
      aiProfile,
      favorites,
      heartedMantraIds,
      heartedGuidedIds,
      userPreferences,
      notificationPrefs,
      membershipStatus,
      membershipIsLoading,
      theme
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
