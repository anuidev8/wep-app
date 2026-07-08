import React from 'react';

interface CircularProgressProps {
  progress: number;           // 0-100
  size?: number;              // default 80
  strokeWidth?: number;       // default 5% of size
  showLabel?: boolean;        // default true
  trackColor?: string;        // outer circle color
  progressColor?: string;     // progress arc color
  labelColor?: string;        // center text color
  labelSize?: number;         // font size
  gradientFrom?: string;      // optional gradient start
  gradientTo?: string;        // optional gradient end
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 80,
  strokeWidth,
  showLabel = true,
  trackColor = '#F0F6F8',
  progressColor = '#2F5A6C',
  labelColor = '#1A4D5C',
  labelSize,
  gradientFrom,
  gradientTo,
  className = '',
}) => {
  const stroke = strokeWidth || (size * 0.05);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(progress, 100));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
  const fontSize = labelSize || size * 0.28;
  const gradientId = `progress-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Gradient Definition */}
        {gradientFrom && gradientTo && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientFrom} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
          </defs>
        )}

        {/* Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />

        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradientFrom && gradientTo ? `url(#${gradientId})` : progressColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center Label */}
      {showLabel && (
        <span
          className="absolute font-bold"
          style={{ color: labelColor, fontSize }}
        >
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
};

