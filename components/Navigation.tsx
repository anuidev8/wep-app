import React from 'react';
import { Home, BookOpen, Music, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCourseAudioPlayer } from '../context/CourseAudioPlayerContext';

export const Navigation: React.FC = () => {
  const location = useLocation();
  useCourseAudioPlayer();

  const isHomeActive = location.pathname === '/';
  const isCoursesActive = location.pathname === '/courses';
  const isSleepActive = location.pathname === '/sleep-music';
  const isProgressActive = location.pathname === '/progress';
  const isChatActive = location.pathname === '/chat';

  const getActiveStyles = (isActive: boolean) =>
    isActive
      ? 'text-brand-primary dark:text-brand-gold'
      : 'text-gray-400 dark:text-gray-600';

  // Equal-width tabs: icon centered above label, optional active dot below label
  const navLinkBase =
    'flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 pb-2 transition-colors duration-200 active:scale-95';

  const ActiveDot = () => (
    <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-600/90 dark:bg-amber-500/90 shrink-0" aria-hidden />
  );

  return (
    <div className="relative w-full">
      {/* Flat solid background — no glass, no blur */}
      <div className="absolute inset-0 bg-white dark:bg-brand-darkBase border-t border-gray-200 dark:border-gray-800 transition-colors duration-300" />

      {/* Content row — even distribution, icon above label, active dot below */}
      <div
        className="relative w-full px-2 flex items-center justify-items-center"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
          paddingTop: '0.5rem',
          minHeight: '56px',
        }}
      >
        {/* Home */}
        <Link to="/" className={`relative ${navLinkBase} ${getActiveStyles(isHomeActive)}`}>
          <Home size={22} strokeWidth={isHomeActive ? 2.5 : 1.8} className="shrink-0" />
          <span className={`text-[10px] leading-none tracking-wide text-center ${isHomeActive ? 'font-bold' : 'font-medium'}`}>
            Home
          </span>
          {isHomeActive && <ActiveDot />}
        </Link>

        {/* Courses */}
        <Link to="/courses" className={`${navLinkBase} ${getActiveStyles(isCoursesActive)}`}>
          <BookOpen size={22} strokeWidth={isCoursesActive ? 2.5 : 1.8} className="shrink-0" />
          <span className={`text-[10px] leading-none tracking-wide text-center ${isCoursesActive ? 'font-bold' : 'font-medium'}`}>
            Courses
          </span>
          {isCoursesActive && <ActiveDot />}
        </Link>

        {/* Chat — same width as others, icon stack + label + active dot */}
        <Link
          to="/chat"
          className={`${navLinkBase} ${
            isChatActive ? 'text-brand-primary dark:text-brand-gold' : 'text-gray-400 dark:text-gray-600'
          }`}
        >
          <div className="relative shrink-0">
            <div className="absolute top-0 right-0 z-10 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-brand-darkBase" aria-hidden />
            <div className="pointer-events-none absolute inset-[-3px] rounded-full border-2 border-brand-gold/70" />
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-brand-darkSurface border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <img
                src="https://storage.googleapis.com/schoolbreathvideos/breathinstructionsabhi/App%20Images/ChatbotImage.jpg"
                alt="Coach"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <span
            className={`text-[10px] leading-none tracking-wide text-center ${
              isChatActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Chat
          </span>
          {isChatActive && <ActiveDot />}
        </Link>

        {/* Sleep Music */}
        <Link to="/sleep-music" className={`${navLinkBase} ${getActiveStyles(isSleepActive)}`}>
          <Music size={22} strokeWidth={isSleepActive ? 2.5 : 1.8} className="shrink-0" />
          <span className={`text-[10px] leading-none tracking-wide text-center ${isSleepActive ? 'font-bold' : 'font-medium'}`}>
            Sleep
          </span>
          {isSleepActive && <ActiveDot />}
        </Link>

        {/* Progress */}
        <Link to="/progress" className={`${navLinkBase} ${getActiveStyles(isProgressActive)}`}>
          <BarChart3 size={22} strokeWidth={isProgressActive ? 2.5 : 1.8} className="shrink-0" />
          <span className={`text-[10px] leading-none tracking-wide text-center ${isProgressActive ? 'font-bold' : 'font-medium'}`}>
            Progress
          </span>
          {isProgressActive && <ActiveDot />}
        </Link>
      </div>
    </div>
  );
};
