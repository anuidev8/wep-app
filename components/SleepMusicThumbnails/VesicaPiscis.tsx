import React from 'react';

interface GeometryProps {
  color1: string;
  color2: string;
  size?: number;
}

export const VesicaPiscis: React.FC<GeometryProps> = ({ color1, color2, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.25;
  const distance = radius * 0.5;

  // Vesica Piscis: Two overlapping circles
  const circle1 = { cx: centerX - distance, cy: centerY, r: radius };
  const circle2 = { cx: centerX + distance, cy: centerY, r: radius };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <linearGradient id={`grad-vesica-${color1}-${color2}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <filter id={`glow-vesica-gold`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width={size} height={size} fill="#000000" rx={size >= 300 ? "0" : "16"}/>
      <g filter={`url(#glow-vesica-gold)`} opacity="0.9">
        <circle
          cx={circle1.cx}
          cy={circle1.cy}
          r={circle1.r}
          fill="none"
          stroke="#D4A574"
          strokeWidth="1"
          opacity="0.85"
        />
        <circle
          cx={circle2.cx}
          cy={circle2.cy}
          r={circle2.r}
          fill="none"
          stroke="#D4A574"
          strokeWidth="1"
          opacity="0.85"
        />
        {/* Center almond shape highlight */}
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={radius * 0.3}
          ry={radius * 0.6}
          fill="#D4A574"
          opacity="0.3"
        />
      </g>
    </svg>
  );
};

