import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CourseDetailComponent } from '../components/CourseDetail';
import { CourseVideoPlayer } from '../components/CourseVideoPlayer';
import { getCourseSections, CourseError, Course, DEFAULT_INSTRUCTOR_BIO } from '../services/courseService';
import { getStoredAuth } from '../services/authService';
import { CourseDetail, Section, Lesson } from '../types';
import { Loader2, AlertCircle } from 'lucide-react';
import { useCourseAudioPlayer } from '../context/CourseAudioPlayerContext';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<{
    lesson: Lesson;
    sectionId: string;
  } | null>(null);
  const { openAudioLesson, closeAudioLesson, isMiniPlayerVisible } = useCourseAudioPlayer();

  useEffect(() => {
    if (!courseId) {
      setError('Course ID is required');
      setIsLoading(false);
      return;
    }

    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async (silent = false) => {
    if (!courseId) return;
    
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Get user email from auth
      const authData = await getStoredAuth();
      if (!authData) {
        throw new CourseError('Not authenticated. Please login again.', 'UNAUTHORIZED', 401);
      }

      // Check if course data was passed via navigation state
      const courseFromState = location.state?.course as Course | null;
      
      // Fetch course sections
      const data = await getCourseSections(courseId, authData.email);
      
      // Build course object - use data from state if available, otherwise construct from sections
      const courseData: CourseDetail = courseFromState ? {
        _id: courseFromState._id || courseFromState.id,
        id: courseFromState.id || courseFromState._id || courseId,
        title: courseFromState.title,
        description: courseFromState.description,
        image: courseFromState.image || courseFromState.thumbnail || '',
        type: courseFromState.type || '',
        days: courseFromState.days || '',
        time: courseFromState.time || '',
        progress: courseFromState.progress || 0,
        author: courseFromState.author ? {
          _id: courseFromState.author._id || '',
          name: courseFromState.author.name,
          bio: courseFromState.author.bio || DEFAULT_INSTRUCTOR_BIO,
          profileImage: courseFromState.author.profileImage || '',
        } : {
          _id: '',
          name: 'Abhi',
          bio: DEFAULT_INSTRUCTOR_BIO,
          profileImage: '',
        },
        sections: data.sections,
      } : {
        _id: courseId,
        id: courseId,
        title: 'Course',
        description: '',
        image: '',
        type: '',
        days: '',
        time: '',
        progress: 0,
        author: {
          _id: '',
          name: 'Abhi',
          bio: DEFAULT_INSTRUCTOR_BIO,
          profileImage: '',
        },
        sections: data.sections,
      };

      setCourse(courseData);
      setSections(data.sections || []);
    } catch (err: any) {
      console.error('[CourseDetailPage] Error:', err);
      if (err instanceof CourseError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleLessonClick = (lesson: Lesson, sectionId: string) => {
    const audioUrl = lesson.audioUrl || lesson.file || '';
    const fileUrl = lesson.file || '';

    if (lesson.type === 'file' || fileUrl) {
      if (fileUrl && /\.pdf(\?|#|$)/i.test(fileUrl)) {
        navigate(`/pdf-viewer?url=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(lesson.title)}`);
      } else if (fileUrl) {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (lesson.type === 'audio' || audioUrl) {
      setActiveLesson(null);
      openAudioLesson(lesson, courseId!, sectionId, { onComplete: fetchCourseData });
      return;
    }

    closeAudioLesson();
    setActiveLesson({ lesson, sectionId });
  };

  const handleVideoBack = () => {
    setActiveLesson(null);
    // Silent refresh so we don't show loading — user sees course detail immediately with updated progress
    fetchCourseData(true);
  };

  const handleBack = () => {
    navigate('/courses');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary dark:text-brand-gold mx-auto mb-4" />
          <p className="text-brand-medium dark:text-brand-darkTextMuted">Loading course...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase flex items-center justify-center p-6">
        <div className="bg-white dark:bg-brand-darkSurface rounded-2xl p-8 max-w-md w-full border border-red-200 dark:border-red-800">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-2 text-center">Error</h3>
          <p className="text-sm text-brand-medium dark:text-brand-darkTextMuted mb-6 text-center">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 py-3 bg-brand-light dark:bg-brand-darkSurface rounded-xl text-brand-dark dark:text-white font-semibold"
            >
              Back to Courses
            </button>
            <button
              onClick={fetchCourseData}
              className="flex-1 py-3 bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark rounded-xl font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Video player view
  if (activeLesson && course) {
    const { lesson, sectionId } = activeLesson;
    const startTime = lesson.watchTimeInSeconds ? lesson.watchTimeInSeconds / 100 : 0;
    
    return (
      <CourseVideoPlayer
        videoUrl={lesson.videoUrl}
        isYoutube={lesson.isFromYoutube || false}
        title={lesson.title}
        courseId={courseId!}
        sectionId={sectionId}
        lessonId={lesson._id || lesson.id}
        startTime={startTime}
        duration={lesson.duration}
        onBack={handleVideoBack}
        onComplete={handleVideoBack}
      />
    );
  }

  // Course detail view
  if (!course) {
    return null;
  }

  return (
    <CourseDetailComponent
      course={course}
      sections={sections}
      onLessonClick={handleLessonClick}
      onBack={handleBack}
      onRefresh={fetchCourseData}
      hasActiveAudio={isMiniPlayerVisible}
    />
  );
};
