
export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export interface UserStats {
  streakDays: number;
  totalCalmPoints: number;
  sessionsCompleted: number;
  badges: Badge[];
  lastSessionDate?: string; // ISO date string of last session (for streak calculation)
  sessionDates?: string[]; // Array of dates when sessions occurred (YYYY-MM-DD format)
}

export interface PatternProgress {
  level: number;
  isFrozen: boolean;
  cyclesInLevel: number;
}

export interface AppNotification {
  id: string;
  userName: string;
  action: string; // "added a comment" | "replied to you"
  courseName: string;
  timestamp: string;
  isRead: boolean;
}

export interface Comment {
  id: string;
  courseId: string;
  chapterId: string;
  author: string;
  text: string;
  timestamp: number;
  likes: number;
  parentId?: string; // For nested replies
  isAdmin?: boolean;
}

export interface GratitudeEntry {
  id: string;
  date: string;
  items: string[];
}

export interface IntentionEntry {
  id: string;
  date: string;
  content: string;
}

export interface DailyPreference {
  date: string;
  questionId: string;
  answer: string;
  scoreImpact: number;
}

export interface AIProfile {
  difficultyScore: number; 
  history: DailyPreference[];
}

export interface UserPreferences {
  motivations: string[];
  experienceLevel: string;
  preferredPractices: string[];
  sessionDuration: string;
  supportType: string[];
  desiredFeelings: string[];
}

export interface NotificationPreferences {
  masterEnabled: boolean;
  hasPermission: boolean;
  timezone?: string;
  morningRitual: {
    enabled: boolean;
    time: string;
    lastSent: string | null;
  };
  eveningWindDown: {
    enabled: boolean;
    time: string;
    lastSent: string | null;
  };
  courseReminders: {
    enabled: boolean;
    lastSent: string | null;
    triggerOnChapterComplete: boolean;
  };
  newReleases: {
    enabled: boolean;
    lastSent: string | null;
    manualTrigger: boolean;
  };
}

export type FavoriteCategory = 'PATTERN' | 'GUIDED' | 'MANTRA' | 'SLEEP' | 'CHAKRA' | 'PODCAST' | 'SHIVA';

export interface UserFavorites {
  PATTERN?: string;
  GUIDED?: string;
  MANTRA?: string;
  SLEEP?: string;
  CHAKRA?: string;
  PODCAST?: string;
  SHIVA?: string;
}

export enum BreathPhase {
  IDLE = 'IDLE',
  INHALE = 'INHALE',
  HOLD = 'HOLD',
  EXHALE = 'EXHALE',
  HOLD_EMPTY = 'HOLD_EMPTY',
  COMPLETED = 'COMPLETED'
}

export interface BreathingPattern {
  id: string;
  name: string;
  inhale: number; 
  hold: number;
  exhale: number;
  holdEmpty?: number;
  description: string;
  category: string;
  colorClass: string;
  iconName?: string;
  labels?: Partial<Record<BreathPhase, string>>;
  outcomeLabel?: string;
  benefit?: string;
}

export type SoundscapeMode = 'DRONE' | 'RAIN' | 'OCEAN' | 'FOREST';

export interface SoundscapeOption {
  id: SoundscapeMode;
  label: string;
  icon: any; 
  color: string;
}

export const PATTERNS: Record<string, BreathingPattern> = {
  CALM: { 
    id: 'CALM', 
    name: 'Diaphragmatic',
    outcomeLabel: 'Stress Relief',
    benefit: 'Calm the nervous system',
    inhale: 6, 
    hold: 3, 
    exhale: 9, 
    description: 'Long exhales trigger the parasympathetic nervous system for instant calm.', 
    category: 'CALM',
    colorClass: 'bg-orange-500', 
    iconName: 'Leaf'
  },
  REST: { 
    id: 'REST', 
    name: 'Relaxation', 
    outcomeLabel: 'Sleep',
    benefit: 'Drift into deep rest',
    inhale: 4, 
    hold: 7, 
    exhale: 8, 
    description: 'The natural tranquilizer for the nervous system.', 
    category: 'REST',
    colorClass: 'bg-sky-500', 
    iconName: 'Moon'
  },
  FOCUS: { 
    id: 'FOCUS', 
    name: 'Box Breathing', 
    outcomeLabel: 'Focus',
    benefit: 'Sharpen your mind',
    inhale: 4, 
    hold: 4, 
    exhale: 4, 
    holdEmpty: 4, 
    labels: { HOLD_EMPTY: 'hold' },
    description: 'Used by Navy SEALs to heighten performance and concentration.', 
    category: 'FOCUS',
    colorClass: 'bg-yellow-500', 
    iconName: 'Target'
  },
  BALANCE: { 
    id: 'BALANCE', 
    name: 'Alternate Nostril', 
    outcomeLabel: 'Balance',
    benefit: 'Harmonize left & right brain',
    inhale: 6, 
    hold: 3, 
    exhale: 6, 
    description: 'Balancing energy channels to center the mind.', 
    category: 'BALANCE',
    colorClass: 'bg-teal-500', 
    iconName: 'Scale'
  },
  ENERGY: { 
    id: 'ENERGY', 
    name: 'Breath of Fire', 
    outcomeLabel: 'Energy',
    benefit: 'Rapid vitality boost',
    inhale: 0.45, 
    hold: 0, 
    exhale: 0.45, 
    labels: { INHALE: ' ', EXHALE: 'exhale' },
    description: 'Rapid, rhythmic breaths to wake up the body and mind.', 
    category: 'ENERGY',
    colorClass: 'bg-red-500', 
    iconName: 'Zap'
  },
  BHASTRIKA: { 
    id: 'BHASTRIKA', 
    name: 'Bhastrika', 
    outcomeLabel: 'Power',
    benefit: 'Surge of Prana',
    inhale: 1, 
    hold: 0, 
    exhale: 1,
    labels: { INHALE: 'force in', EXHALE: 'force out' },
    description: 'Forceful inhale and exhale to clear the mind and boost heat.', 
    category: 'ENERGY',
    colorClass: 'bg-amber-500', 
    iconName: 'Flame'
  },
  BHRAMARI: { 
    id: 'BHRAMARI', 
    name: 'Humming Bee', 
    outcomeLabel: 'Soothe',
    benefit: 'Vibration for calm',
    inhale: 6, 
    hold: 0, 
    exhale: 12, 
    labels: { INHALE: 'inhale', EXHALE: 'hmmm...' },
    description: 'Inhale deeply, exhale with a chanting sound to vibrate the skull.', 
    category: 'CALM',
    colorClass: 'bg-purple-400', 
    iconName: 'Music'
  },
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isTyping?: boolean;
  bullets?: string[];
  steps?: string[];
  shortcuts?: string[];
  backgroundColor?: string;
  source?: 'navigation' | 'general' | string;
  groundingMetadata?: any;
}

export interface AssistantResponse {
  answer: string;
  bullets?: string[];
  steps?: string[];
  shortcuts?: string[];
  backgroundColor?: string;
  source?: 'navigation' | 'general';
  destination?: string;
  threadId?: string;
}

export interface Ritual {
  id: string;
  title: string;
  duration: string;
  icon: any; 
  color: string;
  patternId: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  duration: number; 
  category: 'GUIDED' | 'MANTRA' | 'SLEEP' | 'CHAKRA' | 'PODCAST' | 'SHIVA';
  tags: string[]; // These act as keywords for the "Feel" logic
  description: string;
  color: string;
  teacher?: string;
  releaseDate?: number;
  image?: string;
  audioUrl?: string;
  patternId?: string; 
  pointsReward?: number; 
  visualUrl?: string; 
  deity?: 'SHIVA' | 'HANUMAN' | 'KRISHNA' | 'DEVI' | 'GANESHA' | 'GURU' | 'UNIVERSAL';
  benefit?: 'ENERGY' | 'CALM' | 'SLEEP' | 'PROTECTION' | 'HEALING' | 'DEVOTION' | 'CONFIDENCE' | 'FORGIVENESS';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  popularityScore?: number;
  isPremium?: boolean;
}

// Guided Meditation API Types
export interface Category {
  _id: string;
  name: string;
  type: string;
  slug: string;
}

export interface MusicTrack {
  _id: string;
  name: string;
  description: string;
  position: number;
  favorites: string[];
  audioFilename: string;
  imageFilename: string;
  categories: Category[];
  isPremium: boolean;
  typeContent: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  /** Duration in seconds - from API when available */
  duration?: number;
}

export interface GuidedMeditationResponse {
  musicList: MusicTrack[];
  isPremium: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface Chakra {
  id: string;
  name: string;
  sanskritName: string;
  color: string;
  colorClass: string;
  description: string;
  frequency: string;
  note?: string;
  visualUrl?: string;
  audioUrl?: string;
  thumbnail?: string;
  mantra?: string;
}

export interface BirthDetails {
  name: string;
  date: string;
  time: string;
  place: string;
}

export interface Horoscope {
  ascendant: string;
  moonSign: string;
  prediction: string;
  luckyMantra: string; 
  cosmicTip: string;
  recommendedPractice: string;
}

export interface BreathHoroscope {
  sign: string;
  theme: string;
  prediction: string;
  focus: string[];
  aware: string[];
  action: {
    do: string;
    breath: string;
  };
  meta: {
    lucky_time: string;
    color: string;
    lucky_number: string;
  };
}

export interface RecommendationResponse {
  patternId: string;
  techniqueName: string;
  reasoning: string;
  config: {
    ratio: {
      inhale: number;
      hold: number;
      exhale: number;
      holdBottom: number;
    };
    cycles: number;
    difficulty: string;
  };
  screenTitle: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  reassurance: string;
}

// CRIT-4: Explicit lifecycle state priority order
export type SubscriptionLifecycleStatus = 
  | 'BILLING_ISSUE'    // Priority 1: Most restrictive - always deny access
  | 'EXPIRED'          // Priority 2: Subscription expired, no access
  | 'GRACE_PERIOD'     // Priority 3: Limited access during grace period
  | 'TRIAL'            // Priority 4: Trial access
  | 'ACTIVE'           // Priority 5: Full access
  | 'INACTIVE';        // No subscription

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  description: string;
  productId: string;
}

export type UISubscriptionPlan = SubscriptionPlan & {
  displayPriceUSD: string;
};

export interface CustomerInfo {
  customerId: string;
  email: string;
  activeSubscriptions: string[];
  allPurchasedProductIds: string[];
  latestExpirationDate?: string;
  managementURL?: string;
  originalPurchaseDate?: string;
  requestDate?: string;
  // CRIT-3 & CRIT-9: Grace period and billing issue fields
  gracePeriodEndDate?: string; // ISO 8601 UTC date string
  billingIssueDetectedAt?: string; // ISO 8601 UTC date string
  trialEndDate?: string; // ISO 8601 UTC date string
}

// Course System Types
export interface Author {
  name: string;
  bio: string;
  profileImage: string;
  _id: string;
}

export interface Lesson {
  id: string;
  _id?: string;
  title: string;
  videoUrl: string;
  isFromYoutube?: boolean;
  type?: "video" | "file" | "audio";
  file?: string;
  audioUrl?: string;
  completed: boolean;
  watchTimeInSeconds?: number; // Backend stores as seconds * 100, divide by 100 for actual seconds
  duration?: number; // Total video duration in seconds
}

export interface Subsection {
  title: string;
  lessons: Lesson[];
}

export interface Section {
  _id: string;
  section: string;
  subsections?: Subsection[];
  lessons?: Lesson[];
  resources?: { id: string; title: string; url: string }[];
  isCompleted: boolean;
}

export interface Review {
  id: string;
  reviewer: string;
  rating: number;
  text: string;
}

export interface CourseDetail {
  _id: string;
  id: string;
  title: string;
  description: string;
  image: string;
  type: string;
  days: string;
  time: string;
  courseTheme?: string;
  sections?: Section[];
  lessons?: Section[];
  reviews?: Review[];
  author: Author;
  accessTags?: string[];
  hasAccess?: boolean;
  progress: number;
}

export interface ResumeLearningData {
  courseId: string;
  courseTitle: string;
  sectionId: string;
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  fromYoutube: boolean;
  completed: boolean;
  watchTimeInSeconds: number;
  duration: number;
  lastWatched: string;
  progress: number;
}

// Progress Tracking Types
export interface CourseProgress {
  courseId: string;
  completionPercentage: number;
  completedLessons: number;
  totalLessons: number;
  completedSections: number;
  totalSections: number;
  lastAccessDate?: string;
}

export interface ProgressStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  completedPercentage: number;
  courseProgress: CourseProgress[];
}
