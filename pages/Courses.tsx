
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Play,
    BookOpen,
    Lock,
    Unlock,
    Sparkles,
    Wind,
    Compass,
    Loader2,
    AlertCircle,
    CheckCircle,
    Award,
    Clock,
    TrendingUp,
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { ZenLoadingScreen } from '../components/ZenLoadingScreen';
import { useMinimumDisplayTime } from '../hooks/useMinimumDisplayTime';
import { getCourses, Course, CourseError, getCoursesForProgress, getMyProgress, getResumeLearning } from '../services/courseService';
import { getStoredAuth } from '../services/authService';
import { triggerHaptic } from '../utils/hapticFeedback';
import type { ResumeLearningData, ProgressStats, CourseProgress } from '../types';
import { CourseProgressCard } from '../components/progress/CourseProgressCard';
import { getPageCache, setPageCache } from '../utils/pageCache';

const COURSES_CACHE_KEY = 'courses';

type CoursesCache = {
  courses: Course[];
  progressStats: ProgressStats | null;
  resumeLearning: ResumeLearningData | null;
};

function readCoursesCache(): CoursesCache | null {
  return getPageCache<CoursesCache>(COURSES_CACHE_KEY);
}

export const Courses: React.FC = () => {
    const navigate = useNavigate();
    const cached = readCoursesCache();
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
    const [courses, setCourses] = useState<Course[]>(cached?.courses ?? []);
    const [progressStats, setProgressStats] = useState<ProgressStats | null>(cached?.progressStats ?? null);
    const [isLoading, setIsLoading] = useState(!cached);
    const [error, setError] = useState<string | null>(null);
    const [resumeLearning, setResumeLearning] = useState<ResumeLearningData | null>(cached?.resumeLearning ?? null);
    const [isResumeLoading, setIsResumeLoading] = useState(!cached);
    
    // Ensure loading screen displays for minimum 300ms (only when we actually show loading)
    const shouldShowLoading = useMinimumDisplayTime(isLoading, 300);

    const getResumeStartTime = (resume: ResumeLearningData) => {
        const watchTime = Number(resume.watchTimeInSeconds || 0);
        return Math.max(0, watchTime / 100);
    };

    const getResumeProgressPercent = (resume: ResumeLearningData) => {
        const startTime = getResumeStartTime(resume);
        if (resume.duration > 0) {
            return Math.min(100, (startTime / resume.duration) * 100);
        }
        if (typeof resume.progress === 'number') {
            return Math.min(100, Math.max(0, resume.progress));
        }
        return 0;
    };

    const buildResumeLearningUrl = (resume: ResumeLearningData) => {
        const startTime = getResumeStartTime(resume);
        const params = new URLSearchParams({
            videoUrl: resume.videoUrl || '',
            fromYoutube: resume.fromYoutube ? 'true' : 'false',
            title: resume.lessonTitle || '',
            courseId: resume.courseId || '',
            sectionId: resume.sectionId || '',
            lessonId: resume.lessonId || '',
            completed: resume.completed ? 'true' : 'false',
            startTime: String(startTime),
            duration: String(resume.duration || 0),
            courseTitle: resume.courseTitle || '',
        });

        return `/video?${params.toString()}`;
    };

    // Fetch courses from API; restore from cache first so back navigation is instant
    useEffect(() => {
        const hadCache = !!readCoursesCache();
        const fetchCoursesData = async () => {
            if (!hadCache) {
                setIsLoading(true);
                setIsResumeLoading(true);
            }
            setError(null);
            try {
                const authData = await getStoredAuth();
                if (!authData) {
                    const data = await getCourses();
                    setCourses(data);
                    setResumeLearning(null);
                    setProgressStats(null);
                    setPageCache(COURSES_CACHE_KEY, { courses: data, progressStats: null, resumeLearning: null });
                    setIsLoading(false);
                    setIsResumeLoading(false);
                    return;
                }

                const [stats, coursesData, resumeData] = await Promise.all([
                    getMyProgress(authData.token),
                    getCoursesForProgress(authData.email, authData.token),
                    getResumeLearning(authData.token),
                ]);

                setProgressStats(stats);
                const data = coursesData.courses || [];
                let coursesToCache = data;

                if (data.length === 0) {
                    if (!hadCache) setError('No courses found. Please check your API connection.');
                } else {
                    const progressMap = new Map(
                        stats?.courseProgress?.map((p, index) => [p.courseId, { ...p, index }]) || []
                    );
                    const sorted = data.sort((a, b) => {
                        const courseIdA = a._id || a.id;
                        const courseIdB = b._id || b.id;
                        const progressA = progressMap.get(courseIdA);
                        const progressB = progressMap.get(courseIdB);
                        if (progressA && progressB) return progressA.index - progressB.index;
                        if (progressA) return -1;
                        if (progressB) return 1;
                        return 0;
                    });
                    coursesToCache = sorted;
                    setCourses(sorted);
                }

                setResumeLearning(resumeData);
                setPageCache(COURSES_CACHE_KEY, {
                    courses: coursesToCache,
                    progressStats: stats,
                    resumeLearning: resumeData,
                });
            } catch (err: any) {
                console.error('[Courses] Error:', err);
                if (err instanceof CourseError) {
                    setError(err.message);
                } else {
                    setError(err instanceof Error ? err.message : 'Failed to fetch courses');
                }
            } finally {
                setIsLoading(false);
                setIsResumeLoading(false);
            }
        };
        fetchCoursesData();
    }, []);

    const shouldShowResume = !isResumeLoading && resumeLearning && !resumeLearning.completed && !!resumeLearning.videoUrl;

    const filteredCourses = activeFilter === 'ALL' 
        ? courses 
        : activeFilter === 'IN_PROGRESS'
        ? courses.filter(c => c.progress > 0 && c.progress < 100)
        : courses.filter(c => c.progress === 100);

    const corePrograms = filteredCourses.filter(c => c.group === 'CORE' || c.category === 'CORE' || c.category === 'BREATHWORK' || !c.category);
    const yogaPrograms = filteredCourses.filter(c => c.group === 'YOGA' || c.category === 'YOGA');

    // Progress map for quick lookup
    const progressMap = new Map<string, CourseProgress>(
        progressStats?.courseProgress?.map((p) => [p.courseId, p]) || []
    );

    const handleCourseUnlock = () => {
        triggerHaptic('warning');
        navigate('/subscription');
    };

    const handleCourseOpen = (course: Course) => {
        if (course.isComingSoon) return;
        if (course.hasAccess === false) {
            handleCourseUnlock();
            return;
        }
        const courseId = course._id || course.id;
        navigate(`/course/${courseId}`, { state: { course } });
    };

    // Chakra colors in order: Root (Red), Sacral (Orange), Solar Plexus (Yellow), 
    // Heart (Green), Throat (Blue), Third Eye (Indigo), Crown (Violet)
    const getChakraColor = (index: number): { light: string; dark: string } => {
        const chakraColors = [
            { light: 'rgba(220, 38, 38, 0.08)', dark: 'rgba(220, 38, 38, 0.12)' },   // Root - Red
            { light: 'rgba(234, 88, 12, 0.08)', dark: 'rgba(234, 88, 12, 0.12)' },   // Sacral - Orange
            { light: 'rgba(234, 179, 8, 0.08)', dark: 'rgba(234, 179, 8, 0.12)' },   // Solar Plexus - Yellow
            { light: 'rgba(22, 163, 74, 0.08)', dark: 'rgba(22, 163, 74, 0.12)' },   // Heart - Green
            { light: 'rgba(37, 99, 235, 0.08)', dark: 'rgba(37, 99, 235, 0.12)' },   // Throat - Blue
            { light: 'rgba(79, 70, 229, 0.08)', dark: 'rgba(79, 70, 229, 0.12)' },   // Third Eye - Indigo
            { light: 'rgba(147, 51, 234, 0.08)', dark: 'rgba(147, 51, 234, 0.12)' },  // Crown - Violet
        ];
        return chakraColors[index % chakraColors.length];
    };

    const renderCourseCard = (course: Course, index: number) => {
        const courseId = course._id || course.id;
        const isLocked = course.hasAccess === false;
        const chakraColors = getChakraColor(index);
        
        return (
            <div 
                key={courseId}
                className={`relative bg-white dark:bg-brand-darkSurface rounded-[21px] overflow-hidden border border-brand-light/50 dark:border-brand-darkBorder card-standard transition-all duration-150 ease-out ${course.isComingSoon ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98] active:opacity-90'}`}
            >
                {/* Subtle chakra-colored background overlay */}
                <div 
                    className="absolute inset-0 rounded-[21px] pointer-events-none transition-opacity duration-300"
                    style={{
                        backgroundColor: chakraColors.light,
                    }}
                ></div>
                <div 
                    className="absolute inset-0 rounded-[21px] pointer-events-none dark:opacity-100 opacity-0 transition-opacity duration-300"
                    style={{
                        backgroundColor: chakraColors.dark,
                    }}
                ></div>
                <div
                    onClick={() => handleCourseOpen(course)}
                    className="relative z-10 p-4 flex items-center gap-4"
                >
                    {/* Left: Thumbnail */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                        <img 
                            src={course.image || course.thumbnail || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800'} 
                            alt={course.title} 
                            className="absolute inset-0 w-full h-full object-cover" 
                        />
                    </div>
                    
                    {/* Center: Content */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm dark:text-white mb-1.5 line-clamp-1">{course.title}</h3>
                        <p className="text-xs text-brand-medium/60 dark:text-brand-darkTextMuted mb-1.5 line-clamp-2 min-h-[2.5rem]">
                            {course.description || 'No description available'}
                        </p>
                        <p className="text-[10px] text-brand-medium/50 dark:text-brand-darkTextMuted line-clamp-1">
                            Guided by {course.instructor || course.author?.name || 'Abhi'} - School of Breath
                        </p>
                    </div>
                    
                    {/* Right: Play Button */}
                    {course.isComingSoon ? (
                        <div className="bg-brand-light dark:bg-white/5 p-3 rounded-full text-brand-medium/30 shrink-0">
                            <Lock size={18} />
                        </div>
                    ) : isLocked ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleCourseUnlock(); }}
                            className="w-10 h-10 rounded-full bg-brand-light dark:bg-white/5 text-brand-medium/70 dark:text-brand-darkTextMuted flex items-center justify-center shadow-sm hover:scale-110 transition-transform shrink-0"
                            aria-label="Unlock course"
                        >
                            <Unlock size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleCourseOpen(course); }}
                            className="w-10 h-10 rounded-full bg-brand-primary dark:bg-brand-gold text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform shrink-0"
                        >
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                        </button>
                    )}
                </div>
                
                {/* Progress Bar (if in progress) */}
                {course.progress > 0 && course.progress < 100 && (
                    <div className="relative z-10 px-4 pb-4">
                        <div className="h-1 w-full bg-brand-light dark:bg-brand-darkBorder rounded-full overflow-hidden">
                            <div className="h-full bg-brand-gold transition-all duration-1000" style={{ width: `${course.progress}%` }}></div>
                        </div>
                    </div>
                )}

                {/* Completed Badge (if completed) */}
                {course.progress === 100 && (
                    <div className="relative z-10 px-4 pb-4 flex items-center gap-2">
                        <div className="flex-1 h-px bg-brand-primary/10 dark:bg-brand-gold/20"></div>
                        <div className="flex items-center gap-1.5 text-brand-primary dark:text-brand-gold">
                            <CheckCircle size={12} className="fill-current text-white dark:text-brand-dark" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Completed</span>
                        </div>
                        <div className="flex-1 h-px bg-brand-primary/10 dark:bg-brand-gold/20"></div>
                    </div>
                )}

            </div>
        );
    };

    // Loading state - return early with full screen
    if (shouldShowLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-brand-cream to-white dark:from-brand-darkBase dark:to-brand-darkSurface transition-colors duration-300">
                <ZenLoadingScreen 
                    fullScreen={true}
                    messages={[
                        "Preparing your learning journey...",
                        "Ancient wisdom, modern clarity...",
                        "Gathering sacred teachings...",
                        "Curating transformative content...",
                    ]}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase pb-32 transition-colors duration-300">
            {/* Immersive Header */}
            <div className="bg-gradient-peacock pt-12 pb-24 px-6 rounded-b-[48px] relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px]"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <BackButton
                            variant="dark"
                            onClick={() => navigate('/')}
                        />
                        <h1 className="text-lg font-bold text-white/90 tracking-wide uppercase">OUR COURSES</h1>
                        <div className="w-10"></div>
                    </div>
                    <div className="text-center">
                        {/* Decorative Title with Lines and Dots */}
                        <div className="flex flex-col items-center justify-center px-3 mb-3">
                            {/* Top Decorative Line with Flourish */}
                            <div className="relative w-full max-w-[280px] mb-1.5">
                                <div className="absolute left-0 top-1/2 w-[30%] h-px bg-gradient-to-r from-transparent via-[#D4A574] to-[#D4A574]"></div>
                                <div className="absolute left-[35%] top-1/2 -translate-y-1/2 w-[30%] flex justify-center">
                                    <div className="w-1 h-1 rounded-full bg-[#D4A574] shadow-[0_0_6px_rgba(212,165,116,0.6)]"></div>
                                </div>
                                <div className="absolute right-0 top-1/2 w-[30%] h-px bg-gradient-to-l from-transparent via-[#D4A574] to-[#D4A574]"></div>
                            </div>
                            
                            {/* Main Title - Luxury Gold Text */}
                            <h1 
                                className="text-[13px] font-serif font-bold tracking-[0.15em] text-[#D4A574] relative z-10 whitespace-nowrap mb-1.5"
                                style={{
                                    textShadow: '0 0 20px rgba(212, 165, 116, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                THE SCHOOL OF BREATH
                            </h1>
                            
                            {/* Bottom Decorative Line with Flourish */}
                            <div className="relative w-full max-w-[280px] mt-1.5">
                                <div className="absolute left-0 top-1/2 w-[30%] h-px bg-gradient-to-r from-transparent via-[#D4A574] to-[#D4A574]"></div>
                                <div className="absolute left-[35%] top-1/2 -translate-y-1/2 w-[30%] flex justify-center">
                                    <div className="w-1 h-1 rounded-full bg-[#D4A574] shadow-[0_0_6px_rgba(212,165,116,0.6)]"></div>
                                </div>
                                <div className="absolute right-0 top-1/2 w-[30%] h-px bg-gradient-to-l from-transparent via-[#D4A574] to-[#D4A574]"></div>
                            </div>
                        </div>
                        
                        <p className="text-sm text-white/70 mt-2">Ancient breathwork with modern clarity</p>
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-12 relative z-20 space-y-8 pb-24">
                {/* Error State */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[21px] p-6 flex items-center gap-4 card-standard">
                        <AlertCircle size={24} className="text-red-500 shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-bold text-red-900 dark:text-red-200 mb-1">Error Loading Courses</h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* SHORTCUT: Resume Learning */}
                {shouldShowResume && resumeLearning && (
                    <div 
                        onClick={() => {
                            triggerHaptic('medium');
                            navigate(buildResumeLearningUrl(resumeLearning));
                        }}
                        className="bg-white dark:bg-brand-darkSurface rounded-[21px] p-6 card-standard border border-brand-light/50 dark:border-brand-darkBorder cursor-pointer transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] active:scale-[0.98] active:opacity-90 group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
                                    <Sparkles size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[10px] font-bold text-brand-gold uppercase tracking-widest mb-1">RESUME LEARNING</h4>
                                    <h3 className="text-lg font-bold text-brand-dark dark:text-white leading-tight mb-1">
                                        {resumeLearning.lessonTitle}
                                    </h3>
                                    <p className="text-sm text-brand-medium/60 dark:text-brand-darkTextMuted">
                                        {resumeLearning.courseTitle}
                                    </p>
                                </div>
                            </div>
                            <div className="w-14 h-14 rounded-full bg-brand-primary dark:bg-brand-gold text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0 ml-4">
                                <Play size={22} className="fill-current ml-0.5" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-brand-medium/60 uppercase">
                                <span>{resumeLearning.lessonTitle.toUpperCase()}</span>
                                <span>{getResumeProgressPercent(resumeLearning).toFixed(1)}% COMPLETE</span>
                            </div>
                            <div className="h-1.5 w-full bg-brand-light dark:bg-brand-darkBorder rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-gold transition-all duration-1000"
                                    style={{ width: `${getResumeProgressPercent(resumeLearning)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex bg-white dark:bg-brand-darkSurface p-1 rounded-2xl border border-brand-primary/20 dark:border-brand-primary/30 gap-1">
                    <button 
                        onClick={() => setActiveFilter('ALL')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold tracking-widest transition-all ${activeFilter === 'ALL' ? 'bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark shadow-sm border border-brand-primary/30' : 'text-brand-medium/50 dark:text-brand-darkTextMuted'}`}
                    >
                        ALL PATHS
                    </button>
                    <button 
                        onClick={() => setActiveFilter('IN_PROGRESS')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold tracking-widest transition-all ${activeFilter === 'IN_PROGRESS' ? 'bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark shadow-sm border border-brand-primary/30' : 'text-brand-medium/50 dark:text-brand-darkTextMuted'}`}
                    >
                        IN PROGRESS
                    </button>
                    <button 
                        onClick={() => setActiveFilter('COMPLETED')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold tracking-widest transition-all ${activeFilter === 'COMPLETED' ? 'bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark shadow-sm border border-brand-primary/30' : 'text-brand-medium/50 dark:text-brand-darkTextMuted'}`}
                    >
                        COMPLETED
                    </button>
                </div>

                {/* Empty State for COMPLETED Filter */}
                {!isLoading && activeFilter === 'COMPLETED' && filteredCourses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-brand-primary/5 dark:bg-brand-gold/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-brand-primary/10 dark:ring-brand-gold/20">
                            <Award size={32} className="text-brand-primary dark:text-brand-gold opacity-80" />
                        </div>
                        <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-2 font-serif">
                            Your Journey Awaits
                        </h3>
                        <p className="text-sm text-brand-medium/70 dark:text-brand-darkTextMuted max-w-xs leading-relaxed mb-8">
                            Complete your first course to see it showcased here. Every breath is a step forward in your mastery.
                        </p>
                        <button 
                            onClick={() => setActiveFilter('ALL')}
                            className="px-8 py-3 bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark rounded-xl text-xs font-bold tracking-[0.2em] uppercase hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-primary/20 dark:shadow-brand-gold/20"
                        >
                            Start Learning
                        </button>
                    </div>
                )}

                {/* Empty State for COMPLETED Filter */}
                {!isLoading && activeFilter === 'COMPLETED' && filteredCourses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-brand-primary/5 dark:bg-brand-gold/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-brand-primary/10 dark:ring-brand-gold/20">
                            <Award size={32} className="text-brand-primary dark:text-brand-gold opacity-80" />
                        </div>
                        <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-2 font-serif">
                            Your Journey Awaits
                        </h3>
                        <p className="text-sm text-brand-medium/70 dark:text-brand-darkTextMuted max-w-xs leading-relaxed mb-8">
                            Complete your first course to see it showcased here. Every breath is a step forward in your mastery.
                        </p>
                        <button 
                            onClick={() => setActiveFilter('ALL')}
                            className="px-8 py-3 bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark rounded-xl text-xs font-bold tracking-[0.2em] uppercase hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-primary/20 dark:shadow-brand-gold/20"
                        >
                            Start Learning
                        </button>
                    </div>
                )}

                {/* Empty State for IN_PROGRESS Filter */}
                {!isLoading && activeFilter === 'IN_PROGRESS' && filteredCourses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-brand-primary/5 dark:bg-brand-gold/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-brand-primary/10 dark:ring-brand-gold/20">
                            <Clock size={32} className="text-brand-primary dark:text-brand-gold opacity-80" />
                        </div>
                        <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-2 font-serif">
                            Begin Your Practice
                        </h3>
                        <p className="text-sm text-brand-medium/70 dark:text-brand-darkTextMuted max-w-xs leading-relaxed mb-8">
                            Start a course to see your progress here. Consistent practice is the key to transformation.
                        </p>
                        <button 
                            onClick={() => setActiveFilter('ALL')}
                            className="px-8 py-3 bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark rounded-xl text-xs font-bold tracking-[0.2em] uppercase hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-primary/20 dark:shadow-brand-gold/20"
                        >
                            Explore Courses
                        </button>
                    </div>
                )}

                {/* IN_PROGRESS List View */}
                {!isLoading && activeFilter === 'IN_PROGRESS' && filteredCourses.length > 0 && (
                    <div className="space-y-4 px-1">
                        {filteredCourses.map((course) => {
                             const courseId = course._id || course.id;
                             return (
                                 <CourseProgressCard
                                     key={courseId}
                                     course={course}
                                     progress={progressMap.get(courseId)}
                                     isLocked={course.hasAccess === false}
                                     onClick={() => handleCourseOpen(course)}
                                 />
                             );
                        })}
                    </div>
                )}

                {/* CORE PROGRAMS (ALL or COMPLETED) */}
                {!isLoading && activeFilter !== 'IN_PROGRESS' && corePrograms.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-bold text-brand-dark dark:text-brand-darkText uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Wind size={14} className="text-brand-primary dark:text-brand-gold" /> CORE BREATHWORK PROGRAMS
                        </h3>
                        <div className="space-y-4">
                            {corePrograms.map((course, index) => renderCourseCard(course, index))}
                        </div>
                    </div>
                )}

                {/* YOGA & MOVEMENT (ALL or COMPLETED) */}
                {!isLoading && activeFilter !== 'IN_PROGRESS' && yogaPrograms.length > 0 && (
                    <div className="space-y-6 pt-4">
                        <h3 className="text-[11px] font-bold text-brand-medium/60 dark:text-brand-darkTextMuted uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                            <Compass size={14} className="text-brand-coral" /> Yoga & Movement
                        </h3>
                        <div className="space-y-6">
                            {yogaPrograms.map((course, index) => renderCourseCard(course, index + corePrograms.length))}
                        </div>
                    </div>
                )}

                {/* Empty State (General) */}
                {!isLoading && !error && courses.length === 0 && (
                    <div className="text-center py-12">
                        <BookOpen size={48} className="mx-auto text-brand-medium/30 dark:text-brand-darkTextMuted mb-4" />
                        <h3 className="font-bold text-brand-dark dark:text-white mb-2">No courses found</h3>
                        <p className="text-sm text-brand-medium/60 dark:text-brand-darkTextMuted">
                            No courses available at the moment.
                        </p>
                    </div>
                )}
            </div>

        </div>
    );
};
