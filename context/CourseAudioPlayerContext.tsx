import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CourseAudioMiniPlayer } from '../components/CourseAudioMiniPlayer';
import { Lesson } from '../types';

interface CourseAudioPlayerState {
  lesson: Lesson;
  courseId: string;
  sectionId: string;
  onComplete?: () => void;
}

interface CourseAudioPlayerContextValue {
  activeAudio: CourseAudioPlayerState | null;
  hasActiveAudio: boolean;
  isMiniPlayerVisible: boolean;
  openAudioLesson: (
    lesson: Lesson,
    courseId: string,
    sectionId: string,
    options?: { onComplete?: () => void }
  ) => void;
  closeAudioLesson: () => void;
  suppressMiniPlayer: (value: boolean) => void;
  isMiniPlayerSuppressed: boolean;
}

const CourseAudioPlayerContext = createContext<CourseAudioPlayerContextValue | null>(null);

export const CourseAudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeAudio, setActiveAudio] = useState<CourseAudioPlayerState | null>(null);
  const [isMiniPlayerSuppressed, setIsMiniPlayerSuppressed] = useState(false);
  const location = useLocation();
  const isCourseDetail = location.pathname.startsWith('/course/');
  const isCourseArea = location.pathname.startsWith('/courses') || isCourseDetail;
  const isMiniPlayerVisible = Boolean(activeAudio) && isCourseArea && !isMiniPlayerSuppressed;

  useEffect(() => {
    if (!activeAudio) return;
    if (isCourseArea) return;
    setActiveAudio(null);
  }, [activeAudio, isCourseArea]);

  const openAudioLesson = useCallback(
    (lesson: Lesson, courseId: string, sectionId: string, options?: { onComplete?: () => void }) => {
      setActiveAudio({ lesson, courseId, sectionId, onComplete: options?.onComplete });
    },
    []
  );

  const closeAudioLesson = useCallback(() => {
    setActiveAudio(null);
  }, []);

  const suppressMiniPlayer = useCallback((value: boolean) => {
    setIsMiniPlayerSuppressed(value);
  }, []);

  const value = useMemo(
    () => ({
      activeAudio,
      hasActiveAudio: Boolean(activeAudio),
      isMiniPlayerVisible,
      openAudioLesson,
      closeAudioLesson,
      suppressMiniPlayer,
      isMiniPlayerSuppressed,
    }),
    [activeAudio, isMiniPlayerVisible, openAudioLesson, closeAudioLesson, suppressMiniPlayer, isMiniPlayerSuppressed]
  );

  return (
    <CourseAudioPlayerContext.Provider value={value}>
      {children}
      {activeAudio && (
        <CourseAudioMiniPlayer
          key={activeAudio.lesson._id || activeAudio.lesson.id}
          lesson={activeAudio.lesson}
          courseId={activeAudio.courseId}
          sectionId={activeAudio.sectionId}
          onClose={closeAudioLesson}
          onComplete={activeAudio.onComplete}
          elevatedOffset={!isCourseDetail}
          isVisible={isMiniPlayerVisible}
        />
      )}
    </CourseAudioPlayerContext.Provider>
  );
};

export const useCourseAudioPlayer = () => {
  const context = useContext(CourseAudioPlayerContext);
  if (!context) {
    throw new Error('useCourseAudioPlayer must be used within CourseAudioPlayerProvider');
  }
  return context;
};
