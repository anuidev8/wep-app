import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'text' | 'circle';
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'card',
  count = 1,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className="bg-white/10 dark:bg-white/5 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 dark:bg-white/10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/20 dark:bg-white/10 rounded w-3/4"></div>
                <div className="h-3 bg-white/15 dark:bg-white/5 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className="bg-white/10 dark:bg-white/5 rounded-xl p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/20 dark:bg-white/10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/20 dark:bg-white/10 rounded w-2/3"></div>
                <div className="h-2 bg-white/15 dark:bg-white/5 rounded w-1/2"></div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-white/10"></div>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-white/20 dark:bg-white/10 rounded w-full"></div>
            <div className="h-4 bg-white/15 dark:bg-white/5 rounded w-5/6"></div>
            <div className="h-4 bg-white/10 dark:bg-white/5 rounded w-4/6"></div>
          </div>
        );
      
      case 'circle':
        return (
          <div className="w-16 h-16 rounded-full bg-white/20 dark:bg-white/10 animate-pulse"></div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={index > 0 ? 'mt-3' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

