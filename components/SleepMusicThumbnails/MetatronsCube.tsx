import React from 'react';

interface GeometryProps {
  color1: string;
  color2: string;
  size?: number;
}

export const MetatronsCube: React.FC<GeometryProps> = ({ color1, color2, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.15;

  // Metatron's Cube: 13 circles connected by lines forming geometric shapes
  const circles: Array<{ cx: number; cy: number; r: number }> = [];
  
  // Center circle
  circles.push({ cx: centerX, cy: centerY, r: radius });
  
  // First ring: 6 circles
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    circles.push({
      cx: centerX + radius * 1.5 * Math.cos(angle),
      cy: centerY + radius * 1.5 * Math.sin(angle),
      r: radius
    });
  }
  
  // Outer ring: 6 circles
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + Math.PI / 6;
    circles.push({
      cx: centerX + radius * 3 * Math.cos(angle),
      cy: centerY + radius * 3 * Math.sin(angle),
      r: radius
    });
  }

  // Lines connecting circles to form cube patterns
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  
  // Connect center to first ring
  for (let i = 1; i <= 6; i++) {
    lines.push({
      x1: circles[0].cx,
      y1: circles[0].cy,
      x2: circles[i].cx,
      y2: circles[i].cy
    });
  }
  
  // Connect first ring to outer ring
  for (let i = 1; i <= 6; i++) {
    const next = i === 6 ? 1 : i + 1;
    lines.push({
      x1: circles[i].cx,
      y1: circles[i].cy,
      x2: circles[next].cx,
      y2: circles[next].cy
    });
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <linearGradient id={`grad-cube-${color1}-${color2}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <filter id={`glow-cube-gold`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width={size} height={size} fill="#000000" rx={size >= 300 ? "0" : "16"}/>
      <g filter={`url(#glow-cube-gold)`} opacity="0.9">
        {/* Lines */}
        {lines.map((line, i) => (
          <line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#D4A574"
            strokeWidth="1"
            opacity="0.85"
          />
        ))}
        {/* Circles */}
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

