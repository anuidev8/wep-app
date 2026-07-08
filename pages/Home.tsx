
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
    Wind, Moon, Sun, Flame, Award, Play, BookOpen, Headphones, Mic, Circle,
    Menu, X, Leaf, Sparkles, Target, Scale, Droplets, Zap, Heart, TrendingUp,
    Smile, ChevronRight, CreditCard, Lock, Bell,
    CheckCircle2, AlertCircle, Info, LogOut, 
    Clock, Hand, Star
} from 'lucide-react';
import { Clock as ClockIcon } from 'lucide-react';
import { TechniqueIntroCard } from '../components/TechniqueIntroCard';
import { getTechniqueInfo, shouldShowIntro } from '../data/techniques';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { PATTERNS } from '../types';
import { GUIDED_SESSIONS, MANTRAS, CHAKRAS, PODCASTS } from '../constants';
import { logout, getStoredAuth } from '../services/authService';
import { getUserDisplayName, getUserInitials, isApplePrivateRelayEmail } from '../utils/userDisplay';
import { triggerHaptic } from '../utils/hapticFeedback';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { NotificationPromptModal } from '../components/NotificationPromptModal';
import { hasShownNotificationPrompt, markNotificationPromptShown } from '../services/notificationsService';
import { updateNotificationsEnabled, getUnreadNotificationCount } from '../services/notificationsService';
import { NOTIFICATION_UPDATED_EVENT } from '../utils/notificationEvents';
import { dashboardTaglines } from '../config/dashboardTaglines';
import { resolveDirectPlayUrl } from '../utils/taglineDirectPlay';
import { LuxMessageMandala } from '../components/LuxMessageMandala';
import { useNativeModal } from '../hooks/useNativeModal';
import { motion, AnimatePresence } from 'framer-motion';

// --- MAIN HOME COMPONENT ---

export const Home: React.FC = () => {
  const { 
    user,
    stats,
    favorites,
    intentionEntries,
    intentionTodayCompleted,
    gratitudeEntries,
    gratitudeTodayCompleted,
    hasHoroscopeToday,
    hasCompletedOnboarding,
    isOnboardingStatusResolved,
    theme,
    toggleTheme,
    resetProgress,
    setSubscription,
    notificationPrefs,
    updateNotificationPrefs,
    membershipStatus
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Use membershipStatus from context
  const isSubscribed = membershipStatus === 'Premium Membership';
  const [toast, setToast] = useState<string | null>(null);

  // Real user data from authentication
  const [userEmail, setUserEmail] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [userDisplayEmail, setUserDisplayEmail] = useState<string>('');
  
  const [greeting, setGreeting] = useState("Good Morning");
  const taglinesLength = dashboardTaglines.length;
  const [taglineIndex, setTaglineIndex] = useState(() =>
    taglinesLength > 0 ? Math.floor(Math.random() * taglinesLength) : 0
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showTechniqueIntro, setShowTechniqueIntro] = useState<string | null>(null);
  const [techniqueIntroForced, setTechniqueIntroForced] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationPromptLoading, setNotificationPromptLoading] = useState(false);

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationBadgeFading, setNotificationBadgeFading] = useState(false);
  const scrollPositionRef = useRef(0);

  // Clamp index when taglines array length changes (e.g. after deleting messages) to prevent blank screen
  const safeTaglineIndex = taglinesLength > 0
    ? Math.min(Math.max(0, taglineIndex), taglinesLength - 1)
    : 0;
  const activeTagline = dashboardTaglines[safeTaglineIndex] ?? {
    id: 0,
    text: 'Breathe deeply. The journey continues.',
    route: '/courses',
    category: 'breathwork' as const,
  };
  const isHoroscopePrompt = activeTagline.route === '/astrology' || activeTagline.route === '/horoscope-result';
  const headlineSizeClass = useMemo(() => {
    const len = activeTagline.text.length;
    if (len >= 38) return 'text-[clamp(1.1rem,3.8vw,1.55rem)]';
    if (len >= 31) return 'text-[clamp(1.2rem,4vw,1.65rem)]';
    return 'text-[clamp(1.3rem,4.2vw,1.75rem)]';
  }, [activeTagline.text]);
  const isScrollableHeadline = activeTagline.text.length > 30;
  const marqueeDurationSec = useMemo(
    () => Math.min(33, Math.max(18, activeTagline.text.length * 0.62)),
    [activeTagline.text.length]
  );

  /** Map tagline route to highlight id for card glow */
  const taglineHighlightId = useMemo(() => {
    const dp = activeTagline.directPlay;
    if (dp) {
      if (dp.type === 'SLEEP') return 'SLEEP';
      if (dp.type === 'GUIDED') return 'GUIDED';
      if (dp.type === 'MANTRA' || dp.type === 'SHIVA') return 'MANTRAS';
      if (dp.type === 'CHAKRA') return 'CHAKRAS';
    }
    const r = activeTagline.route;
    if (r === '/courses') return 'COURSES';
    if (r === '/sleep-music') return 'SLEEP';
    if (r === '/meditate') return 'GUIDED';
    if (r === '/mantra-explorer') return 'MANTRAS';
    if (r === '/chakra-mantras' || r.startsWith('/meditate?tab=chakra')) return 'CHAKRAS';
    if (r === '/morning-ritual') return 'RITUAL';
    if (r === '__pattern-selection__') return 'TRAINING';
    return null;
  }, [activeTagline.route, activeTagline.directPlay]);

  const getTodayDateISO = () => {
    const n = new Date();
    // Use the same helper or format as context: 'YYYY-MM-DD' in local time
    // But since context handles entries and completion status, we can rely on that directly now.
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };

  // We now use context-provided completion flags for consistency
  const hasIntentionToday = intentionTodayCompleted;
  const hasGratitudeToday = gratitudeTodayCompleted;
  
  // For Horoscope, we rely on context's hasHoroscopeToday, which listens to storage events
  // const todaysHoroscope = ... (removed local calculation)
   
  // Fetch real user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const authData = await getStoredAuth();
        if (authData) {
          setUserEmail(authData.email);
          setUserFullName(authData.fullName || authData.email.split('@')[0]);
          setUserDisplayName(
            getUserDisplayName({ fullName: authData.fullName, email: authData.email })
          );
          setUserDisplayEmail(
            isApplePrivateRelayEmail(authData.email) ? 'Hidden by Apple' : authData.email
          );
        }
      } catch (error) {
        console.error('[Home] Error fetching user data', error);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!isOnboardingStatusResolved) return;
    if (!hasCompletedOnboarding) navigate('/onboarding');
  }, [hasCompletedOnboarding, isOnboardingStatusResolved, navigate]);

  useEffect(() => {
    if (searchParams.get('select_pattern') === 'true') navigate('/pattern-selection');
  }, [searchParams, navigate]);

  // Fetch unread notification count for badge on Bell icon
  const refreshUnreadCount = React.useCallback(async () => {
    const count = await getUnreadNotificationCount();
    setUnreadNotificationCount(count);
    setNotificationBadgeFading(false);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handler = () => refreshUnreadCount();
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_UPDATED_EVENT, handler);
  }, [refreshUnreadCount]);

  // Reset badge fade state when user returns to home
  useEffect(() => {
    if (location.pathname === '/') setNotificationBadgeFading(false);
  }, [location.pathname]);

  // First-time notification prompt: show modal on first app launch when permission not yet asked
  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    if (!Capacitor.isNativePlatform()) return;

    const checkAndShow = async () => {
      try {
        if (await hasShownNotificationPrompt()) return;
        const status = await PushNotifications.checkPermissions();
        if (status.receive !== 'granted' && status.receive !== 'denied') {
          setTimeout(() => setShowNotificationPrompt(true), 800);
        }
      } catch {
        /* ignore */
      }
    };
    checkAndShow();
  }, [hasCompletedOnboarding]);

  // Disable body scroll when modals are open (iOS/Android best practice)
  useEffect(() => {
    const hasModalOpen = showTechniqueIntro !== null || showNotificationPrompt;
    
    if (hasModalOpen) {
      // Save current scroll position
      scrollPositionRef.current = window.scrollY;
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // Get computed styles to preserve existing styles
      const bodyStyle = window.getComputedStyle(document.body);
      const originalPosition = bodyStyle.position;
      const originalTop = bodyStyle.top;
      const originalWidth = bodyStyle.width;
      const originalOverflow = bodyStyle.overflow;
      const originalTouchAction = bodyStyle.touchAction;
      
      // Disable body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = `-${scrollX}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Prevent iOS bounce scroll and Android gesture scrolling
      document.body.style.touchAction = 'none';
      
      // Also prevent scrolling on html element (some browsers)
      const html = document.documentElement;
      html.style.overflow = 'hidden';
      html.style.position = 'fixed';
      html.style.width = '100%';

    } else {
      // Ensure body is scrollable when no modals are open
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.width = '';
      document.body.style.touchAction = '';
      
      const html = document.documentElement;
      html.style.overflow = '';
      html.style.position = '';
      html.style.width = '';

      // Restore scroll position
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, [showTechniqueIntro, showNotificationPrompt]);

  // Set time-based greeting consistently on mount and update hourly
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 5) setGreeting("Good Late Night");
      else if (hour < 12) setGreeting("Good Morning");
      else if (hour < 18) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");
    };

    // Set initial greeting
    updateGreeting();

    // Update greeting every hour to keep it accurate
    const interval = setInterval(updateGreeting, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, []);

  // Keep taglineIndex in bounds when taglines array shrinks (e.g. after deleting messages)
  useEffect(() => {
    if (taglinesLength > 0 && taglineIndex >= taglinesLength) {
      setTaglineIndex(Math.min(taglineIndex, taglinesLength - 1));
    }
  }, [taglinesLength, taglineIndex]);

  // Rotate through taglines every 15 seconds (use current length so index never goes out of range)
  useEffect(() => {
    const len = dashboardTaglines.length;
    if (len === 0) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setTaglineIndex(prev => (prev + 1) % len);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 400); // Fade out duration
    }, 15000); // 15 seconds interval

    return () => clearInterval(timer);
  }, [taglinesLength]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const getHighlightClass = (id: string) => {
    const isActive = taglineHighlightId === id;
    
    // Subtle, shared interaction baseline
    const base =
      'active:scale-[0.98] transition-transform duration-200';
    
    if (!isActive) return base;

    // When the concierge message is pointing at a specific area,
    // gently lift and glow that card so users know where to tap.
    // Make this a bit more pronounced than the horoscope/intention pill,
    // since that pill already has its own bespoke styling.
    return `${base} ring-2 ring-brand-gold/70 shadow-[0_0_30px_rgba(212,165,116,0.35)] scale-[1.01]`;
  };



  const handleNotificationPromptAllow = async () => {
    setNotificationPromptLoading(true);
    try {
      // Only attempt native push permissions on mobile (Capacitor native).
      if (!Capacitor.isNativePlatform()) {
        showToast('Push notifications are only available in the mobile app.');
        return;
      }
      const status = await PushNotifications.requestPermissions();
      if (status.receive === 'granted') {
        await PushNotifications.register();
        // Persist to backend DB first (User.notificationsEnabled)
        try {
          await updateNotificationsEnabled(true);
        } catch (e) {
          console.warn('[Home] Failed to store notification pref in DB', e);
        }
        updateNotificationPrefs(prev => ({ ...prev, masterEnabled: true, hasPermission: true }));
        showToast('Notifications enabled');
      }
    } catch (e) {
      console.warn('[Home] Notification permission error', e);
    } finally {
      await markNotificationPromptShown();
      setShowNotificationPrompt(false);
      setNotificationPromptLoading(false);
    }
  };

  const handleNotificationPromptNotNow = async () => {
    await markNotificationPromptShown();
    setShowNotificationPrompt(false);
  };

  const handleTaglineClick = () => {
    triggerHaptic('light');
    const route = activeTagline.route;
    if (route === '__pattern-selection__') {
      navigate('/pattern-selection');
      return;
    }
    if (route === '/astrology' || route === '/horoscope-result') {
      navigate(hasHoroscopeToday ? '/horoscope-result' : '/astrology');
      return;
    }
    if (activeTagline.directPlay) {
      const playerUrl = resolveDirectPlayUrl(activeTagline.directPlay);
      if (playerUrl) {
        navigate(playerUrl);
        return;
      }
    }
    navigate(route);
  };

  return (
    <div className="h-[100dvh] min-h-0 bg-black relative flex flex-col overflow-hidden">
      {/* MAIN CONTENT WRAPPER */}
      <div className="flex flex-col flex-1 min-h-0 bg-brand-cream dark:bg-brand-darkBase shadow-2xl transition-colors duration-300">
        {/* Scrollable Content Area - only this scrolls; bottom padding reserves space for fixed nav */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full pb-32 no-scrollbar">
      
      {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[120] bg-brand-dark text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 animate-fade-in flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 size={18} className="text-brand-gold"/> {toast}
          </div>
      )}

      <NotificationPromptModal
        open={showNotificationPrompt}
        onAllow={handleNotificationPromptAllow}
        onNotNow={handleNotificationPromptNotNow}
        isLoading={notificationPromptLoading}
      />

      {/* ELEGANT BACKGROUND RIPPLES */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
           <div className="absolute w-[600px] h-[600px] border border-brand-primary/5 dark:border-brand-primary/10 rounded-full animate-ripple"></div>
           <div className="absolute w-[500px] h-[500px] border border-brand-primary/5 dark:border-brand-primary/10 rounded-full animate-ripple" style={{ animationDelay: '2s' }}></div>
           <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-sage/10 dark:bg-brand-sage/5 rounded-full blur-[100px] animate-pulse-slow"></div>
      </div>

      <div className="relative z-10">
        {/* Luxury Header with Gold & Blue */}
        <div className="bg-gradient-to-b from-[#0F1A2E] via-[#1A4D5C] to-[#1A3A47] pb-20 rounded-b-[40px] relative z-0 shadow-2xl dark:shadow-none overflow-hidden transition-all duration-500"
             style={{
                 background: 'linear-gradient(135deg, #0F1A2E 0%, #1A4D5C 50%, #1A3A47 100%)',
                 boxShadow: 'inset 0 1px 0 rgba(212, 165, 116, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)'
             }}>
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,_rgba(212,165,116,0.3)_0%,_transparent_70%)] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,_transparent_48%,_rgba(212,165,116,0.02)_49%,_rgba(212,165,116,0.02)_51%,_transparent_52%)] bg-[length:20px_20px] pointer-events-none"></div>
            {/* Warm transition overlay - echoes peach-to-mint from Start Breathing card below */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-gradient-to-b from-transparent via-transparent to-[#FFCFA3]/50" style={{ mixBlendMode: 'soft-light' }}></div>
            
            {/* Header Bar - Fixed height container */}
            <div className="pt-16 pb-3 px-6 relative z-10">
                <div className="flex justify-between items-center w-full">
                    {/* Menu Button - Gold Circle */}
                    <button 
                        onClick={() => window.dispatchEvent(new Event('sidemenu:open'))}
                        className="relative w-12 h-12 rounded-full border border-[#D4A574]/80 bg-gradient-to-br from-[#F6D894]/40 via-[#D4A574]/22 to-[#8A6236]/35 backdrop-blur-sm hover:brightness-110 active:scale-95 transition-all duration-300 overflow-hidden flex items-center justify-center shrink-0"
                        style={{
                            borderWidth: '1.5px',
                            boxShadow: 'inset 0 2px 3px rgba(255, 255, 255, 0.25), inset 0 -3px 4px rgba(118, 79, 38, 0.35), 0 0 18px rgba(212, 165, 116, 0.35)'
                        }}
                        aria-label="Open menu"
                    >
                        <div className="absolute -inset-2 rounded-full bg-[#D4A574]/25 blur-md animate-bell-gold-halo pointer-events-none"></div>
                        <div className="absolute inset-[2px] rounded-full border border-white/25 pointer-events-none"></div>
                        <div className="absolute -left-10 top-[-10%] h-[120%] w-8 bg-white/50 blur-[2px] rotate-[20deg] animate-bell-gold-shine pointer-events-none"></div>
                        <Menu size={24} className="text-[#F5D78D] relative z-10" strokeWidth={2.6} />
                    </button>
                    
                    {/* Center Title with Decorative Lines - Constrained width prevents push */}
                    <div className="flex-1 flex flex-col items-center justify-center px-2 relative max-w-[240px] mx-auto">
                        {/* Top Decorative Line with Flourish */}
                        <div className="relative w-full mb-1">
                            <div className="absolute left-0 top-1/2 w-[30%] h-px bg-gradient-to-r from-transparent via-[#D4A574] to-[#D4A574] overflow-hidden">
                                <span className="logo-line-sparkle logo-line-sparkle-left"></span>
                            </div>
                            <div className="absolute left-[35%] top-1/2 -translate-y-1/2 w-[30%] flex justify-center">
                                <div className="w-1 h-1 rounded-full bg-[#D4A574] shadow-[0_0_6px_rgba(212,165,116,0.6)] logo-dot-breathe"></div>
                            </div>
                            <div className="absolute right-0 top-1/2 w-[30%] h-px bg-gradient-to-l from-transparent via-[#D4A574] to-[#D4A574] overflow-hidden">
                                <span className="logo-line-sparkle logo-line-sparkle-right"></span>
                            </div>
                        </div>
                        
                        {/* Main Title - Luxury Gold Text */}
                        <h1 
                            className="text-[13px] font-serif font-bold tracking-[0.17em] text-[#D4A574] relative z-10 whitespace-nowrap logo-title-glow text-center w-full"
                            style={{
                                textShadow: '0 0 20px rgba(212, 165, 116, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            THE SCHOOL OF BREATH
                        </h1>
                        
                        {/* Bottom Decorative Line with Flourish */}
                        <div className="relative w-full mt-1">
                            <div className="absolute left-0 top-1/2 w-[30%] h-px bg-gradient-to-r from-transparent via-[#D4A574] to-[#D4A574] overflow-hidden">
                                <span className="logo-line-sparkle logo-line-sparkle-left" style={{ animationDelay: '6s' }}></span>
                            </div>
                            <div className="absolute left-[35%] top-1/2 -translate-y-1/2 w-[30%] flex justify-center">
                                <div className="w-1 h-1 rounded-full bg-[#D4A574] shadow-[0_0_6px_rgba(212,165,116,0.6)] logo-dot-breathe" style={{ animationDelay: '3s' }}></div>
                            </div>
                            <div className="absolute right-0 top-1/2 w-[30%] h-px bg-gradient-to-l from-transparent via-[#D4A574] to-[#D4A574] overflow-hidden">
                                <span className="logo-line-sparkle logo-line-sparkle-right" style={{ animationDelay: '3s' }}></span>
                            </div>
                        </div>
                        <span className="logo-title-sweep"></span>
                    </div>
                    
                    {/* Notification Button - Gold Circle */}
                    <button 
                        onClick={() => {
                          if (unreadNotificationCount > 0) {
                            setNotificationBadgeFading(true);
                            setTimeout(() => navigate('/notification-settings'), 200);
                          } else {
                            navigate('/notification-settings');
                          }
                        }}
                        className="relative w-12 h-12 rounded-full border border-[#D4A574]/80 bg-gradient-to-br from-[#F6D894]/40 via-[#D4A574]/22 to-[#8A6236]/35 backdrop-blur-sm hover:brightness-110 active:scale-95 transition-all duration-300 overflow-visible flex items-center justify-center shrink-0"
                        style={{
                            borderWidth: '1.5px',
                            boxShadow: 'inset 0 2px 3px rgba(255, 255, 255, 0.25), inset 0 -3px 4px rgba(118, 79, 38, 0.35), 0 0 18px rgba(212, 165, 116, 0.35)'
                        }}
                        aria-label={unreadNotificationCount > 0 ? `View notifications (${unreadNotificationCount} unread)` : 'View notifications'}
                    >
                        {/* Inner container for overflow effects to prevent clipping the badge */}
                        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                            <div className="absolute -inset-2 rounded-full bg-[#D4A574]/25 blur-md animate-bell-gold-halo"></div>
                            <div className="absolute inset-[2px] rounded-full border border-white/25"></div>
                            <div className="absolute -left-10 top-[-10%] h-[120%] w-8 bg-white/50 blur-[2px] rotate-[20deg] animate-bell-gold-shine"></div>
                        </div>
                        
                        <Bell size={24} className="text-[#F5D78D] relative z-10 animate-bell-gold-sway" strokeWidth={2.6} />
                        {unreadNotificationCount > 0 && (
                          <span
                            className={`absolute -top-0.5 -right-0.5 z-20 flex items-center justify-center bg-red-500 text-white font-bold rounded-full border-2 border-white animate-notification-badge-pulse transition-opacity duration-200 ${
                              unreadNotificationCount === 1
                                ? 'w-2 h-2 min-w-[8px] min-h-[8px]'
                                : 'min-w-[20px] h-5 px-1.5 text-[10px]'
                            } ${notificationBadgeFading ? 'opacity-0' : ''}`}
                          >
                            {unreadNotificationCount > 1 ? (unreadNotificationCount > 99 ? '99+' : unreadNotificationCount) : null}
                          </span>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Greeting Section - Positioned Lower */}
            <div className="text-center px-6 relative z-10 mt-3">
                <button
                  onClick={handleTaglineClick}
                  className="group relative w-full max-w-[600px] mx-auto mb-4 rounded-[20px] border px-4 sm:px-5 py-2 overflow-hidden transition-all duration-300 cursor-pointer border-brand-gold/40 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),rgba(212,165,116,0.08),rgba(255,255,255,0.06))] hover:border-brand-gold/55 hover:bg-[linear-gradient(120deg,rgba(255,255,255,0.16),rgba(212,165,116,0.12),rgba(255,255,255,0.08))] active:scale-[0.995] lux-message-button"
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 22px rgba(0,0,0,0.2)'
                  }}
                  aria-label={`${activeTagline.text}. Tap to open.`}
                >
                    <LuxMessageMandala patternIndex={safeTaglineIndex} />
                    <span className="lux-message-sheen"></span>
                    <span className="lux-message-screen-tint"></span>
                    <span className="relative z-10 flex items-center justify-center min-h-[38px] w-full min-w-0">
                      <span className={`relative flex-1 min-w-0 flex justify-center ${isScrollableHeadline ? 'overflow-hidden' : ''}`}>
                        {isScrollableHeadline ? (
                          <span className="lux-message-marquee-viewport">
                            <span
                              className={`lux-message-marquee-track ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                              style={{ ['--lux-marquee-duration' as any]: `${marqueeDurationSec}s` }}
                            >
                              <span className="lux-message-marquee-group">
                                <span
                                  className={`${headlineSizeClass} lux-message-marquee-item font-serif text-white leading-tight`}
                                  style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                                >
                                  {activeTagline.text}
                                </span>
                                <span className="lux-message-marquee-sep">•</span>
                              </span>
                              <span aria-hidden className="lux-message-marquee-group">
                                <span
                                  className={`${headlineSizeClass} lux-message-marquee-item font-serif text-white leading-tight`}
                                  style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                                >
                                  {activeTagline.text}
                                </span>
                                <span className="lux-message-marquee-sep">•</span>
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span
                            className={`block text-center w-full ${headlineSizeClass} font-serif text-white leading-tight transition-opacity duration-500 ${
                              isTransitioning ? 'opacity-0' : 'opacity-100'
                            }`}
                            style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                          >
                            {activeTagline.text}
                          </span>
                        )}
                      </span>
                    </span>
                </button>
                <div className={`inline-flex bg-white/10 backdrop-blur-md border-2 border-brand-gold/50 rounded-2xl p-1 items-center scale-90 shadow-lg shadow-black/20 mb-[9px] ${
                    isHoroscopePrompt ? 'ring-1 ring-brand-gold/70 shadow-brand-gold/40' : ''
                }`}>
                    <button
                        type="button"
                        className={`flex items-center gap-2 px-5 py-2 border-r border-white/10 cursor-pointer rounded-2xl bg-white/5 hover:bg-white/15 active:translate-y-[1px] active:shadow-inner transition-all duration-150 ${
                            hasHoroscopeToday ? '' : 'ring-2 ring-brand-gold/50 shadow-[0_0_20px_rgba(212,165,116,0.35)]'
                        } ${isHoroscopePrompt && !hasHoroscopeToday ? 'bg-white/20 shadow-md shadow-brand-gold/50' : ''}`}
                        onClick={() => navigate(hasHoroscopeToday ? '/horoscope-result' : '/astrology')}
                    >
                        {hasHoroscopeToday ? (
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        ) : (
                          <Star size={12} className="text-brand-gold fill-brand-gold" />
                        )}
                        <span className="text-[10px] font-bold text-white tracking-[0.18em] uppercase">
                            Horoscope
                        </span>
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-2 cursor-pointer rounded-2xl bg-white/10 hover:bg-white/20 active:translate-y-[1px] active:shadow-inner transition-all duration-150 shrink-0 ring-2 ring-brand-gold/45 shadow-[0_0_12px_rgba(212,165,116,0.25)]"
                        onClick={() => navigate('/live')}
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#D4A574] shrink-0" />
                        <span className="text-[10px] font-bold text-white tracking-[0.1em] uppercase whitespace-nowrap">
                            Live Meditation
                        </span>
                    </button>
                </div>
            </div>
        </div>

        {/* Start Breathing Banner */}
        <div className="px-6 relative z-10 -mt-10 mb-8">
            <div onClick={() => navigate('/morning-ritual')} className={`relative rounded-[32px] p-[3px] bg-white dark:bg-brand-darkBorder transition-all duration-300 cursor-pointer ${getHighlightClass('RITUAL')}`}>
                <div className="rounded-[29px] px-5 py-[26px] flex items-center justify-between min-h-[108px]" style={{ background: 'linear-gradient(100deg, #FFCFA3 0%, #FFF5E9 45%, #9CD8C8 100%)' }}>
                     <div className="flex items-center gap-5 relative z-10">
                        <div className="relative w-14 h-14 rounded-[20px] bg-white/40 flex items-center justify-center shrink-0 border border-white/50 overflow-visible">
                            <style>{`
                              @keyframes breath-pulse {
                                0%, 100% { transform: scale(1); opacity: 0.35; }
                                50% { transform: scale(1.18); opacity: 0.65; }
                              }
                              .animate-breath-pulse { animation: breath-pulse 4s ease-in-out infinite; }
                            `}</style>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="absolute w-8 h-8 rounded-full border-2 border-[#1A4D5C]/40 animate-breath-pulse" />
                                <div className="absolute w-12 h-12 rounded-full border-2 border-[#1A4D5C]/30 animate-breath-pulse" style={{ animationDelay: '-2s' }} />
                            </div>
                            <Wind size={28} className="text-[#1A4D5C] relative z-10" />
                        </div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <h3 className="text-xl font-serif font-bold text-[#1A4D5C] leading-tight">Daily Breathing</h3>
                            <p className="text-[#1A4D5C] text-sm font-medium tracking-wide opacity-90">Sacred Breath Session</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 border border-white/5"><Play size={16} className="ml-0.5 text-[#1A4D5C] fill-[#1A4D5C]" /></div>
                </div>
            </div>
        </div>

        {/* Practice Grid */}
        <div className="px-6 mt-8">
            <h3 className="text-[11px] font-bold text-brand-primary dark:text-brand-darkTextMuted uppercase tracking-[1.2px] mb-5 px-2">Main Practices</h3>
            <div className="grid grid-cols-2 gap-4">
                {[
                    { id: 'COURSES', title: 'My Courses', sub: 'Explore', path: '/courses', icon: BookOpen, color: '#E6DBF6', text: '#5D3E91' },
                    { id: 'GUIDED', title: 'Meditation', sub: 'Guided', path: '/meditate?tab=guided', icon: Headphones, color: '#D9F1ED', text: '#3BA199' },
                    { id: 'SLEEP', title: 'Sleep Music', sub: 'Rest', path: '/sleep-music', icon: Moon, color: '#E4E2F4', text: '#A59ED0' },
                    { id: 'MANTRAS', title: 'Mantras', sub: 'Chant', path: '/meditate?tab=mantra', icon: Sun, color: '#FFF0D9', text: '#D4A574' }
                ].map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => {
                            triggerHaptic('medium');
                            navigate(item.path);
                        }} 
                        className={`group bg-white dark:bg-brand-darkSurface p-5 card-standard cursor-pointer flex flex-col items-center text-center gap-3 transition-all duration-150 ease-out hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] active:scale-[0.98] active:opacity-90 relative overflow-hidden border border-brand-light/30 dark:border-brand-darkBorder/50 ${
                            taglineHighlightId === item.id
                                ? 'bg-[#FFF8EC] dark:bg-brand-darkSurface scale-[1.02] shadow-[0_4px_16px_rgba(0,0,0,0.14)]'
                                : ''
                        } ${getHighlightClass(item.id)}`}
                    >
                        <div className="absolute inset-0 rounded-[21px] bg-brand-gold/0 group-hover:bg-brand-gold/5 transition-all duration-300 pointer-events-none"></div>
                        <div className="relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300" style={{ background: item.color }}>
                            <item.icon size={20} style={{ color: item.text }} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-bold text-brand-dark dark:text-brand-darkText text-base mb-0.5 font-serif group-hover:text-brand-gold dark:group-hover:text-brand-gold transition-colors duration-300">{item.title}</h3>
                            <p className="text-[9px] text-brand-primary dark:text-brand-darkTextMuted font-bold uppercase tracking-[1.2px]">{item.sub}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {/* Breath Training - same width as Start Breathing, zen gold aesthetics */}
        <div className="px-6 mt-8">
            <div 
                onClick={() => navigate('/pattern-selection')}
                className={`relative w-full rounded-[32px] p-[3px] bg-gradient-to-br from-[#D4A574]/60 via-[#D4A574]/40 to-[#8A6236]/50 transition-all duration-300 cursor-pointer ${getHighlightClass('TRAINING')}`}
            >
                <div className="group relative rounded-[29px] px-5 py-[26px] flex items-center justify-between min-h-[108px] bg-[#1A4D5C] dark:bg-brand-darkSurface overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/[0.03] to-transparent pointer-events-none" />
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="relative w-14 h-14 rounded-[22px] bg-white/5 flex items-center justify-center shrink-0 border border-brand-gold/30 backdrop-blur-md overflow-hidden">
                            <div className="absolute inset-0 rounded-[22px] bg-brand-gold/10 animate-pulse-slow"></div>
                            <div className="absolute w-10 h-10 rounded-full border border-brand-gold/40 animate-breath-training-pulse"></div>
                            <div className="absolute w-6 h-6 rounded-full border border-brand-gold/25 animate-breath-training-pulse" style={{ animationDelay: '-1s' }}></div>
                            <Wind
                              size={24}
                              className="text-brand-gold relative z-10"
                              style={{
                                filter: 'drop-shadow(0 0 8px rgba(212, 165, 116, 0.45))',
                              }}
                            />
                        </div>
                        <div className="flex flex-col justify-center gap-0.5">
                            <h3 className="text-lg font-serif font-bold text-white leading-tight">Breath Training</h3>
                            <p className="text-white/65 text-sm font-medium leading-tight">Calm focus in 3 mins</p>
                        </div>
                    </div>
                    <div className="relative w-12 h-12 rounded-full border-2 border-brand-gold/60 flex items-center justify-center text-white/90 animate-breath-training-pulse overflow-hidden group-hover:border-cyan-400/70 group-hover:shadow-[0_0_24px_rgba(34,211,238,0.5)] transition-all duration-300 z-10">
                        <div className="absolute inset-0 rounded-full bg-cyan-400/0 group-hover:bg-cyan-400/25 transition-all duration-300" />
                        <Play size={20} className="ml-1 fill-white relative z-10" />
                    </div>
                </div>
            </div>
        </div>

        {/* Chakras */}
        <div className="px-6 mt-10 mb-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6 px-1">
                <h3 className="text-2xl font-serif font-bold text-brand-dark dark:text-white">Chakra Music</h3>
                <button onClick={() => navigate('/meditate?tab=chakra')} className="text-xs font-bold text-brand-primary dark:text-brand-darkTextMuted uppercase tracking-[1.2px]">SEE ALL</button>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 snap-x snap-mandatory pb-6">
                {CHAKRAS.map((chakra) => (
                    <div key={chakra.id} className="shrink-0 w-44 snap-center relative group">
                         <div className="relative aspect-[4/5] rounded-[21px] overflow-hidden bg-white card-standard transition-all duration-150 ease-out group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.14)] active:scale-[0.98] active:opacity-90 cursor-pointer"
                             onClick={() => navigate(`/chakra-mantras?chakra=${chakra.id}`)}
                         >
                             <img 
                                src={chakra.thumbnail} 
                                alt={chakra.name} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                             <div className="absolute bottom-0 left-0 right-0 bg-[#1A4D5C] py-4 px-2 flex items-center justify-center border-t border-white/10 transition-all duration-300">
                                <span className="text-[14px] font-serif font-bold text-white tracking-wider group-hover:text-brand-gold transition-colors duration-300">{chakra.name} {chakra.mantra}</span>
                             </div>
                             {/* Play Music Button */}
                             {chakra.visualUrl && (
                                <div 
                                    className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors active:scale-95"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const trackId = `chakra_${chakra.id}`;
                                        navigate(`/player?track=${trackId}&type=CHAKRA&visualUrl=${encodeURIComponent(chakra.visualUrl)}`);
                                    }}
                                >
                                    <Play size={16} fill="white" className="text-white ml-0.5" />
                                </div>
                             )}
                         </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Technique Intro Card */}
      {showTechniqueIntro && getTechniqueInfo(showTechniqueIntro) && (
        <TechniqueIntroCard
          technique={getTechniqueInfo(showTechniqueIntro)!}
          onStart={() => {
            navigate(`/breathe?pattern=${showTechniqueIntro}`);
            setShowTechniqueIntro(null);
            setTechniqueIntroForced(false);
          }}
          onClose={() => {
            setShowTechniqueIntro(null);
            setTechniqueIntroForced(false);
          }}
          forceShow={techniqueIntroForced}
        />
      )}
        </div>
      </div>
    </div>
  );
};
