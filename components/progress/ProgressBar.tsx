import React from 'react';

interface ProgressBarProps {
  percentage: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  height = 8,
  trackColor = '#F0F6F8',
  fillColor = '#2F5A6C',
  showPercentage = false,
  animated = true,
  className = '',
}) => {
  const clampedPercentage = Math.max(0, Math.min(percentage, 100));

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-brand-medium dark:text-brand-darkTextMuted">Progress</span>
          <span className="text-xs font-bold text-brand-dark dark:text-white">
            {clampedPercentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, backgroundColor: trackColor }}
      >
        <div
          className={`h-full rounded-full ${animated ? 'transition-all duration-700 ease-out' : ''}`}
          style={{
            width: `${clampedPercentage}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
    </div>
  );
};

