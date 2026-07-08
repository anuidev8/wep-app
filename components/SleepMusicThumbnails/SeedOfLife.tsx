import React from 'react';

interface GeometryProps {
  color1: string;
  color2: string;
  size?: number;
}

export const SeedOfLife: React.FC<GeometryProps> = ({ color1, color2, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.2;

  // 7 circles: 1 center + 6 around
  const circles: Array<{ cx: number; cy: number; r: number }> = [];
  
  // Center circle
  circles.push({ cx: centerX, cy: centerY, r: radius });
  
  // 6 circles around center
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    circles.push({
      cx: centerX + radius * Math.cos(angle),
      cy: centerY + radius * Math.sin(angle),
      r: radius
    });
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <linearGradient id={`grad-seed-${color1}-${color2}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <filter id={`glow-seed-gold`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width={size} height={size} fill="#000000" rx={size >= 300 ? "0" : "16"}/>
      <g filter={`url(#glow-seed-gold)`} opacity="0.9">
        {circles.map((circle, i) => (
          <circle
            key={i}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill="none"
            stroke="#D4A574"
            strokeWidth="1"
            opacity="0.85"
          />
        ))}
      </g>
    </svg>
  );
};

