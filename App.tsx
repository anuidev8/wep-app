import * as React from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { ensureAudioConfigured } from './services/audioInit';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { CourseAudioPlayerProvider } from './context/CourseAudioPlayerContext';
import { ModalProvider } from './context/ModalContext';
import { SideMenu } from './components/SideMenu';
import { logout, getStoredAuth } from './services/authService';
import { getUserDisplayName, isApplePrivateRelayEmail } from './utils/userDisplay';
import { useMembershipStore } from './store/membershipStore';
import { useNativeModal } from './hooks/useNativeModal';
import { CheckCircle2, LogOut } from 'lucide-react';
import { PageTransition } from './components/PageTransition';
import { Home } from './pages/Home';
import { BreathingSession } from './pages/BreathingSession';
import { ChatPage } from './pages/Chat';
import { Meditate } from './pages/Meditate';
import { AudioPlayer } from './pages/AudioPlayer';
import { VideoPlayerPage } from './pages/VideoPlayer';
import { Astrology } from './pages/Astrology';
import { HoroscopeResult } from './pages/HoroscopeResult';
import { MorningRitual } from './pages/MorningRitual';
import { GratitudeJournal } from './pages/GratitudeJournal';
import { IntentionJournal } from './pages/IntentionJournal';
import { LiveSession } from './pages/LiveSession';
import { Studio } from './pages/Studio';
import { Onboarding } from './pages/Onboarding';
import { MantraExplorer } from './pages/MantraExplorer';
import { Courses } from './pages/Courses';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { PdfViewer } from './pages/PdfViewer';
import { ProgressTracking } from './pages/ProgressTracking';
import { RelaxationPreview } from './pages/RelaxationPreview';
import { ChakraMantras } from './pages/ChakraMantras';
import { ChangePassword } from './pages/ChangePassword';
import { NotificationSettings } from './pages/NotificationSettings';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { SleepMusic } from './pages/SleepMusic';
import { Subscription } from './pages/Subscription';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfServices } from './pages/TermsOfServices';
import { AboutUs } from './pages/AboutUs';
import { RiveDemo } from './pages/RiveDemo';
import { ProtectedRoute } from './components/ProtectedRoute';
import { usePushNotifications } from './hooks/usePushNotifications';
import { PatternSelection } from './pages/PatternSelection';
import { MembershipSyncManager } from './components/MembershipSyncManager';
import { Navigation } from './components/Navigation';
import { useModalContext } from './context/ModalContext';

// Shared transition config for overlays
const nativeModalTransition = {
  backdrop: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
  sheet: { type: 'spring' as const, damping: 28, stiffness: 400, mass: 0.8 },
};

const CAME_FROM_PLAYER_KEY = 'mantraExplorer_cameFromPlayer';
const CAME_FROM_PLAYER_GUIDED_KEY = 'guidedExplorer_cameFromPlayer';

/** Remounts MantraExplorer when returning from the player so the next navigation to player
 *  (from Library or Recently Played) starts from a fresh state — fixes control desync. */
const MantraExplorerWithRefreshOnReturn = () => {
  const [refreshKey] = React.useState(() => {
    let key = 0;
    try {
      if (typeof sessionStorage === 'undefined') return 0;
      const flag = sessionStorage.getItem(CAME_FROM_PLAYER_KEY);
      if (flag) {
        sessionStorage.removeItem(CAME_FROM_PLAYER_KEY);
        key = Date.now();
      }
    } catch {
      // sessionStorage may be unavailable on first WebView init; ignore
    }
    return key;
  });

  return <MantraExplorer key={refreshKey} />;
};

/** Remounts the guided meditation list when returning from the player — fixes "Guided Meditation
 *  Unavailable" / control desync when clicking Recently Played or Release after coming back. */
const GuidedExplorerWithRefreshOnReturn = () => {
  const [refreshKey] = React.useState(() => {
    let key = 0;
    try {
      if (typeof sessionStorage === 'undefined') return 0;
      const flag = sessionStorage.getItem(CAME_FROM_PLAYER_GUIDED_KEY);
      if (flag) {
        sessionStorage.removeItem(CAME_FROM_PLAYER_GUIDED_KEY);
        key = Date.now();
      }
    } catch {
      // sessionStorage may be unavailable on first WebView init; ignore
    }
    return key;
  });

  return <Meditate key={refreshKey} forcedTab="guided" />;
};

const LogoutOverlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const navigate = useNavigate();
  useNativeModal(isOpen, onClose);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      await logout().catch(() => {});
      onClose();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="logout-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={nativeModalTransition.backdrop}
          className="fixed inset-0 z-[10200] w-full min-h-[100dvh] h-[100dvh] max-h-[100dvh] bg-brand-dark/95 backdrop-blur-xl flex items-center justify-center p-6 text-white overflow-hidden touch-none"
          onClick={onClose}
          style={{ touchAction: 'none' }}
        >
          <motion.div
            key="logout-sheet"
            initial={{ y: 24, opacity: 0.9, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0.9, scale: 0.98 }}
            transition={nativeModalTransition.sheet}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/5 border border-white/10 rounded-[40px] px-8 pt-8 w-full max-w-sm text-center shadow-2xl shrink-0"
            style={{
              maxHeight: 'min(90dvh, 90vh)',
              overflow: 'auto',
              willChange: 'transform',
              transform: 'translateZ(0)',
              paddingBottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom, 0px)))',
            }}
          >
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
              <LogOut size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-4">Logout</h2>
            <p className="text-sm text-white/60 mb-10 leading-relaxed">Are you sure you want to log out of your session?</p>
            <div className="space-y-3">
              <button
                onClick={onClose}
                disabled={isLoggingOut}
                className="w-full py-4 bg-white/10 rounded-2xl font-bold hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full py-4 bg-white text-brand-dark rounded-2xl font-bold active:scale-95 transition-transform disabled:opacity-50"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const getTodayDateISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

// Global side menu layer — rendered via portal so it overlays all routes
// without coupling to any single page. Opening is triggered by dispatching
// a 'sidemenu:open' custom event from any page.
const SideMenuLayer = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeOverlay, setActiveOverlay] = React.useState<'LOGOUT' | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  // Initialize synchronously from localStorage (web fast path) to avoid 'Loading...' flash
  const [userEmail, setUserEmail] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('breathAppAuth') || '{}').email || ''; } catch { return ''; }
  });
  const [userFullName, setUserFullName] = React.useState(() => {
    try { const a = JSON.parse(localStorage.getItem('breathAppAuth') || '{}'); return a.fullName || a.email?.split('@')[0] || ''; } catch { return ''; }
  });
  const [userDisplayName, setUserDisplayName] = React.useState(() => {
    try { const a = JSON.parse(localStorage.getItem('breathAppAuth') || '{}'); return a.fullName || a.email?.split('@')[0] || ''; } catch { return ''; }
  });
  const [userDisplayEmail, setUserDisplayEmail] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('breathAppAuth') || '{}').email || ''; } catch { return ''; }
  });
  // Premium is determined only by membershipStatus (RevenueCat/Systeme.io sync), not from login response.
  // Read from global Redux-pattern store (single source of truth).
  // Use API-backed completion flags (intentionTodayCompleted, gratitudeTodayCompleted) for check marks
  const { hasHoroscopeToday, intentionTodayCompleted, gratitudeTodayCompleted } = useApp();
  const { status: membershipStatus, isLoading: membershipIsLoading } = useMembershipStore();
  const location = useLocation();

  // Clear sidebar display state and membership on logout so next user doesn't see previous data
  React.useEffect(() => {
    const onLogout = () => {
      setUserEmail('');
      setUserFullName('');
      setUserDisplayName('');
      setUserDisplayEmail('');
      useMembershipStore.getState().reset(); // Reset Redux store
    };
    window.addEventListener('app:logout', onLogout);
    return () => window.removeEventListener('app:logout', onLogout);
  }, []);

  // Close on route change
  React.useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Listen for open/close events dispatched from any page
  React.useEffect(() => {
    const show = () => setIsOpen(true);
    const hide = () => setIsOpen(false);
    window.addEventListener('sidemenu:open', show);
    window.addEventListener('sidemenu:close', hide);
    return () => {
      window.removeEventListener('sidemenu:open', show);
      window.removeEventListener('sidemenu:close', hide);
    };
  }, []);

  const fetchUser = React.useCallback(async () => {
    try {
      const auth = await getStoredAuth();
      if (auth) {
        setUserEmail(auth.email);
        setUserFullName(auth.fullName || auth.email.split('@')[0]);
        setUserDisplayName(getUserDisplayName({ fullName: auth.fullName, email: auth.email }));
        setUserDisplayEmail(isApplePrivateRelayEmail(auth.email) ? 'Hidden by Apple' : auth.email);
      } else {
        setUserEmail('');
        setUserFullName('');
        setUserDisplayName('');
        setUserDisplayEmail('');
      }
    } catch {
      setUserEmail('');
      setUserFullName('');
      setUserDisplayName('');
      setUserDisplayEmail('');
    }
  }, []);

  // When menu opens: fetch current user, refresh membership, and refresh daily rituals completion
  React.useEffect(() => {
    if (isOpen) {
      fetchUser();
      try {
        window.dispatchEvent(new CustomEvent('membership:refresh'));
        window.dispatchEvent(new CustomEvent('daily-rituals:refresh'));
      } catch {}
    }
  }, [isOpen, fetchUser]);

  // Also fetch once on mount
  React.useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Use context's API-backed completion flags for Menu check marks (single source of truth)
  const hasIntentionToday = intentionTodayCompleted;
  const hasGratitudeToday = gratitudeTodayCompleted;

  const [liveMeditationRefresh, setLiveMeditationRefresh] = React.useState(0);
  React.useEffect(() => {
    const onCompleted = () => setLiveMeditationRefresh((r) => r + 1);
    window.addEventListener('live_meditation_completed', onCompleted);
    return () => window.removeEventListener('live_meditation_completed', onCompleted);
  }, []);

  const hasLiveMeditationToday = React.useMemo(() => {
    try {
      const today = getTodayDateISO();
      const raw = localStorage.getItem('liveMeditationHistory_v1');
      if (!raw) return false;
      const sessions = JSON.parse(raw);
      return Array.isArray(sessions) && sessions.some((s: { date?: string }) => s.date === today);
    } catch { return false; }
  }, [liveMeditationRefresh, isOpen]);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const content = (
    <>
      <SideMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        showToast={showToast}
        setActiveOverlay={setActiveOverlay}
        hasHoroscopeToday={hasHoroscopeToday}
        hasIntentionToday={hasIntentionToday}
        hasGratitudeToday={hasGratitudeToday}
        hasLiveMeditationToday={hasLiveMeditationToday}
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        userDisplayEmail={userDisplayEmail}
        userFullName={userFullName}
        isPremium={membershipStatus === 'Premium Membership'}
        isMembershipLoading={membershipIsLoading}
      />
      <LogoutOverlay
        isOpen={activeOverlay === 'LOGOUT'}
        onClose={() => setActiveOverlay(null)}
      />
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10300] bg-brand-dark text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2 text-sm font-bold pointer-events-none">
          <CheckCircle2 size={18} className="text-brand-gold" /> {toast}
        </div>
      )}
    </>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

// Routes where bottom navigation should be hidden (fullscreen/auth experiences)
const HIDE_NAV_ROUTES = [
  '/login', '/register', '/onboarding',
  '/player', '/video', '/morning-ritual',
  '/pdf-viewer', '/rive-demo', '/live',
  '/privacy-policy', '/terms-of-services', '/about-us',
  '/pattern-selection', '/breathe',
];

const NavigationLayer = () => {
  const location = useLocation();
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const { isModalOpen } = useModalContext();

  React.useEffect(() => {
    const show = () => setOverlayOpen(true);
    const hide = () => setOverlayOpen(false);
    window.addEventListener('overlay:open', show);
    window.addEventListener('overlay:close', hide);
    return () => {
      window.removeEventListener('overlay:open', show);
      window.removeEventListener('overlay:close', hide);
    };
  }, []);

  const shouldHide = HIDE_NAV_ROUTES.some(
    route => location.pathname === route || location.pathname.startsWith(route + '/')
  );
  const isHidden = shouldHide || overlayOpen || isModalOpen;

  const navContent = (
    <AnimatePresence>
      {!isHidden && (
        <motion.div
          key="bottom-navigation"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{
            type: 'tween',
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94] // Native iOS-like easing curve
          }}
          className="fixed bottom-0 left-0 right-0 z-[9999] w-full"
          style={{ isolation: 'isolate' }}
        >
          <Navigation />
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Portal to document.body so nav is always fixed to viewport (not affected by route scroll/transform)
  return typeof document !== 'undefined'
    ? createPortal(navContent, document.body)
    : navContent;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      {/* @ts-ignore: Routes key prop is required for AnimatePresence to work correctly */}
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
        <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
        <Route path="/terms-of-services" element={<PageTransition><TermsOfServices /></PageTransition>} />
        <Route path="/about-us" element={<PageTransition><AboutUs /></PageTransition>} />
        
        {/* Protected routes */}
        <Route
          path="/"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/breathe"
          element={
            <PageTransition>
              <ProtectedRoute>
                <BreathingSession />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/chat"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/meditate"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Meditate />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/guided-explorer"
          element={
            <PageTransition>
              <ProtectedRoute>
                <GuidedExplorerWithRefreshOnReturn />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/sleep-music"
          element={
            <PageTransition>
              <ProtectedRoute>
                <SleepMusic />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/player"
          element={
            <PageTransition>
              <ProtectedRoute>
                <AudioPlayer />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/video"
          element={
            <PageTransition>
              <ProtectedRoute>
                <VideoPlayerPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/astrology"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Astrology />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/horoscope-result"
          element={
            <PageTransition>
              <ProtectedRoute>
                <HoroscopeResult />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/morning-ritual"
          element={
            <PageTransition>
              <ProtectedRoute>
                <MorningRitual />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/gratitude"
          element={
            <PageTransition>
              <ProtectedRoute>
                <GratitudeJournal />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/intention"
          element={
            <PageTransition>
              <ProtectedRoute>
                <IntentionJournal />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/live"
          element={
            <PageTransition>
              <ProtectedRoute>
                <LiveSession />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/studio"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Studio />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/mantra-explorer"
          element={
            <PageTransition>
              <ProtectedRoute>
                <MantraExplorerWithRefreshOnReturn />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/courses"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/course/:courseId"
          element={
            <PageTransition>
              <ProtectedRoute>
                <CourseDetailPage />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/pdf-viewer"
          element={
            <PageTransition>
              <ProtectedRoute>
                <PdfViewer />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/progress"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ProgressTracking />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/relaxation-preview"
          element={
            <PageTransition>
              <ProtectedRoute>
                <RelaxationPreview />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/chakra-mantras"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ChakraMantras />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/change-password"
          element={
            <PageTransition>
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/notification-settings"
          element={
            <PageTransition>
              <ProtectedRoute>
                <NotificationSettings />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/subscription"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        <Route
          path="/rive-demo"
          element={
            <PageTransition>
              <ProtectedRoute>
                <RiveDemo />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        
        <Route
          path="/pattern-selection"
          element={
            <PageTransition>
              <ProtectedRoute>
                <PatternSelection />
              </ProtectedRoute>
            </PageTransition>
          }
        />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  usePushNotifications();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      console.log('[Splash] Native app ready, hiding splash', { platform });
      SplashScreen.hide()
        .then(() => console.log('[Splash] Hidden successfully'))
        .catch((err) => console.warn('[Splash] Hide error', err));

      // Initialize NativeAudio early — nativeAudioService awaits this before first preload
      void ensureAudioConfigured();
    }
  }, []);

  return (
    <AppProvider>
      <ModalProvider>
        <MembershipSyncManager />
        <HashRouter>
          <CourseAudioPlayerProvider>
            <AnimatedRoutes />
            <NavigationLayer />
            <SideMenuLayer />
          </CourseAudioPlayerProvider>
        </HashRouter>
      </ModalProvider>
    </AppProvider>
  );
};

export default App;
