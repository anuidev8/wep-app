import React from 'react';

interface GeometryProps {
  color1: string;
  color2: string;
  size?: number;
}

export const SpiralMandala: React.FC<GeometryProps> = ({ color1, color2, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size * 0.35;

  // Create spiral path
  const spiralPoints: Array<{ x: number; y: number }> = [];
  const turns = 3;
  const points = 100;
  
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * turns * Math.PI * 2;
    const radius = (i / points) * maxRadius;
    spiralPoints.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  }

  // Create path string
  const pathString = spiralPoints.reduce((path, point, i) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`;
  }, '');

  // Add concentric circles for depth
  const circles: Array<number> = [];
  for (let i = 1; i <= 4; i++) {
    circles.push((maxRadius / 4) * i);
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <linearGradient id={`grad-spiral-${color1}-${color2}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <filter id={`glow-spiral-gold`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width={size} height={size} fill="#000000" rx={size >= 300 ? "0" : "16"}/>
      <g filter={`url(#glow-spiral-gold)`} opacity="0.9">
        {/* Concentric circles */}
        {circles.map((radius, i) => (
          <circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#D4A574"
            strokeWidth="1"
            opacity="0.8"
          />
        ))}
        {/* Spiral path */}
        <path
          d={pathString}
          fill="none"
          stroke="#D4A574"
          strokeWidth="1"
          opacity="0.85"
        />
        {/* Center dot */}
        <circle cx={centerX} cy={centerY} r="1.5" fill="#D4A574" opacity="0.9"/>
      </g>
    </svg>
  );
};

