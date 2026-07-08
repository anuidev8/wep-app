import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, Trophy, TrendingUp, RefreshCw, ArrowLeft } from 'lucide-react';
import { StatCard } from '../components/progress/StatCard';
import { CourseProgressCard } from '../components/progress/CourseProgressCard';
import { CircularProgress } from '../components/CircularProgress';
import { getMyProgress, getCoursesForProgress, Course, CourseError } from '../services/courseService';
import { getStoredAuth } from '../services/authService';
import { ProgressStats, CourseProgress } from '../types';
import { ZenLoadingScreen } from '../components/ZenLoadingScreen';
import { useMinimumDisplayTime } from '../hooks/useMinimumDisplayTime';

export const ProgressTracking: React.FC = () => {
  const navigate = useNavigate();
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Ensure loading screen displays for minimum 300ms
  const shouldShowLoading = useMinimumDisplayTime(isLoading, 300);

  const fetchData = async () => {
    try {
      const authData = await getStoredAuth();
      if (!authData) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      const [stats, coursesData] = await Promise.all([
        getMyProgress(authData.token),
        getCoursesForProgress(authData.email, authData.token),
      ]);
      setProgressStats(stats);
      setCourses(coursesData.courses || []);
      setError(null);
    } catch (err: any) {
      console.error('[ProgressTracking] Failed to fetch progress:', err);
      if (err instanceof CourseError) {
        setError(err.message);
      } else {
        setError('Failed to load progress data');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleCourseClick = (course: Course) => {
    if (!course.hasAccess) {
      // Navigate to subscription/upgrade page or show message
      alert('This course requires a premium subscription. Please upgrade to access.');
      return;
    }
    const courseId = course._id || course.id;
    navigate(`/course/${courseId}`, { state: { course } });
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  // Build progress map for quick lookup
  const progressMap = new Map<string, CourseProgress>(
    progressStats?.courseProgress?.map((p) => [p.courseId, p]) || []
  );

  // Not authenticated view
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream to-white dark:from-brand-darkBase dark:to-brand-darkSurface flex items-center justify-center p-6 transition-colors duration-300">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-brand-light dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-brand-primary dark:text-brand-gold" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-brand-dark dark:text-white mb-3">
            Track Your Journey
          </h2>
          <p className="text-brand-medium dark:text-brand-darkTextMuted mb-6">
            Sign in to view your learning progress and continue where you left off.
          </p>
          <button
            onClick={handleLoginClick}
            className="px-8 py-3 bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark font-semibold rounded-xl hover:bg-brand-dark dark:hover:bg-brand-primary transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream to-white dark:from-brand-darkBase dark:to-brand-darkSurface transition-colors duration-300">
        <ZenLoadingScreen 
          fullScreen={true}
          messages={[
            "Calculating progress...",
            "Gathering your journey data...",
            "Reflecting on your growth...",
            "Preparing insights...",
          ]}
        />
      </div>
    );
  }

  // Error state
  if (error && !progressStats) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream to-white dark:from-brand-darkBase dark:to-brand-darkSurface flex items-center justify-center p-6 transition-colors duration-300">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-brand-dark dark:text-white mb-3">
            Error Loading Progress
          </h2>
          <p className="text-brand-medium dark:text-brand-darkTextMuted mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-brand-light dark:bg-white/5 text-brand-dark dark:text-white rounded-xl font-medium"
            >
              Go Home
            </button>
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark rounded-xl font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream to-white dark:from-brand-darkBase dark:to-brand-darkSurface pb-32 transition-colors duration-300">
      {/* Header */}
      <div className="bg-brand-dark dark:bg-brand-darkSurface text-white px-6 py-8 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-transparent"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/')}
              className="relative p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all duration-300 border-2 border-white/20 shadow-xl shadow-white/10 active:scale-95 group"
              style={{
                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
              }}
            >
              <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <ArrowLeft size={20} className="relative z-10 group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-bold mb-2">My Progress</h1>
              <p className="text-white/70">Track your learning journey</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-10">
        {/* Overall Progress Card */}
        <div className="bg-white dark:bg-brand-darkSurface rounded-3xl shadow-xl p-6 mb-8 border border-brand-light dark:border-brand-darkBorder transition-colors duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular Progress */}
            <CircularProgress
              progress={progressStats?.completedPercentage || 0}
              size={100}
              strokeWidth={8}
              progressColor="#D4A574"
              trackColor="#F0F6F8"
              labelColor="#1A4D5C"
            />

            {/* Stats */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-brand-dark dark:text-white mb-1">
                Overall Completion
              </h2>
              <p className="text-brand-medium dark:text-brand-darkTextMuted text-sm mb-3">
                Keep going! You're making great progress.
              </p>

              {/* Mini Stats */}
              <div className="flex flex-wrap gap-4 text-sm justify-center sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-brand-dark dark:text-white font-semibold">
                    {progressStats?.completedCourses || 0}
                  </span>
                  <span className="text-brand-medium dark:text-brand-darkTextMuted">completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-gold" />
                  <span className="text-brand-dark dark:text-white font-semibold">
                    {progressStats?.inProgressCourses || 0}
                  </span>
                  <span className="text-brand-medium dark:text-brand-darkTextMuted">in progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={BookOpen}
            value={progressStats?.totalCourses || 0}
            label="Total Courses"
            iconColor="#2F5A6C"
            valueColor="#2F5A6C"
          />
          <StatCard
            icon={CheckCircle2}
            value={progressStats?.completedCourses || 0}
            label="Completed"
            iconColor="#16A34A"
            valueColor="#16A34A"
          />
          <StatCard
            icon={Clock}
            value={progressStats?.inProgressCourses || 0}
            label="In Progress"
            iconColor="#D4A574"
            valueColor="#D4A574"
          />
        </div>

        {/* Course Progress Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-bold text-brand-dark dark:text-white">
              Course Progress
            </h2>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`
                text-sm font-medium text-brand-primary dark:text-brand-gold hover:text-brand-dark dark:hover:text-white
                transition-colors flex items-center gap-1
                ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Course List */}
          <div className="space-y-4">
            {courses.map((course) => {
              const courseId = course._id || course.id;
              return (
                <CourseProgressCard
                  key={courseId}
                  course={course}
                  progress={progressMap.get(courseId)}
                  isLocked={!course.hasAccess}
                  onClick={() => handleCourseClick(course)}
                />
              );
            })}
          </div>

          {courses.length === 0 && (
            <div className="text-center py-12 text-brand-medium dark:text-brand-darkTextMuted">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No courses available yet.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

