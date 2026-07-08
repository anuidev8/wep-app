import React from 'react';
import { ChevronRight, Lock, BookOpen, Layers, Clock } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { Course, CourseProgress } from '../../types';

interface CourseProgressCardProps {
  course: Course;
  progress?: CourseProgress;
  isLocked: boolean;
  onClick: () => void;
}

export const CourseProgressCard: React.FC<CourseProgressCardProps> = ({
  course,
  progress,
  isLocked,
  onClick,
}) => {
  const completionPercentage = progress?.completionPercentage || course.progress || 0;
  const isComplete = completionPercentage >= 100;

  // Format last accessed date
  const formatLastAccessed = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white dark:bg-brand-darkSurface rounded-3xl p-6
        border transition-all duration-300 cursor-pointer
        ${isLocked
          ? 'bg-gray-50/80 dark:bg-white/5 border-gray-200 dark:border-brand-darkBorder opacity-90'
          : 'border-brand-light dark:border-brand-darkBorder hover:shadow-lg hover:border-brand-primary/20 dark:hover:border-brand-gold/20 hover:scale-[1.01]'
        }
        ${isComplete ? 'ring-2 ring-green-100 dark:ring-green-900/30' : ''}
      `}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <h3 className={`
            font-serif text-lg font-bold leading-snug mb-1
            ${isLocked ? 'text-gray-400 dark:text-brand-darkTextMuted' : 'text-brand-dark dark:text-white'}
          `}>
            {course.title}
          </h3>

          {/* Status Badge */}
          <span className={`
            inline-flex items-center gap-1 text-sm font-medium
            ${isLocked
              ? 'text-gray-400 dark:text-brand-darkTextMuted'
              : isComplete
                ? 'text-green-600 dark:text-green-400'
                : 'text-brand-medium dark:text-brand-darkTextMuted'
            }
          `}>
            {isLocked ? (
              'Premium Course'
            ) : isComplete ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Completed
              </>
            ) : (
              `${completionPercentage.toFixed(1)}% Complete`
            )}
          </span>
        </div>

        {/* Right Icon */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
          ${isLocked
            ? 'bg-gray-200 dark:bg-white/5'
            : isComplete
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-brand-light dark:bg-white/5'
          }
        `}>
          {isLocked ? (
            <Lock className="w-5 h-5 text-gray-400 dark:text-brand-darkTextMuted" />
          ) : (
            <ChevronRight className={`w-5 h-5 ${isComplete ? 'text-green-600 dark:text-green-400' : 'text-brand-primary dark:text-brand-gold'}`} />
          )}
        </div>
      </div>

      {/* Progress Bar (only for unlocked courses) */}
      {!isLocked && (
        <ProgressBar
          percentage={completionPercentage}
          height={6}
          fillColor={isComplete ? '#16A34A' : '#2F5A6C'}
          className="mb-4"
        />
      )}

      {/* Stats Row (only for unlocked courses with progress) */}
      {!isLocked && progress && (
        <div className="flex flex-wrap gap-4 text-sm">
          {/* Lessons */}
          <div className="flex items-center gap-1.5 text-brand-medium dark:text-brand-darkTextMuted">
            <BookOpen className="w-4 h-4 opacity-60" />
            <span>
              <strong className="text-brand-dark dark:text-white">{progress.completedLessons}</strong>
              <span className="opacity-60"> / {progress.totalLessons} Lessons</span>
            </span>
          </div>

          {/* Sections */}
          <div className="flex items-center gap-1.5 text-brand-medium dark:text-brand-darkTextMuted">
            <Layers className="w-4 h-4 opacity-60" />
            <span>
              <strong className="text-brand-dark dark:text-white">{progress.completedSections}</strong>
              <span className="opacity-60"> / {progress.totalSections} Sections</span>
            </span>
          </div>

          {/* Last Accessed */}
          {progress.lastAccessDate && (
            <div className="flex items-center gap-1.5 text-brand-medium/70 dark:text-brand-darkTextMuted/70">
              <Clock className="w-4 h-4 opacity-50" />
              <span className="text-xs italic">
                {formatLastAccessed(progress.lastAccessDate)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Locked Message */}
      {isLocked && (
        <p className="text-sm text-gray-400 dark:text-brand-darkTextMuted italic text-center mt-2">
          Upgrade to access this course
        </p>
      )}

      {/* Complete Badge */}
      {isComplete && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
          COMPLETE
        </div>
      )}
    </div>
  );
};

