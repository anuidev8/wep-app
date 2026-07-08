import React from 'react';

interface GeometryProps {
  color1: string;
  color2: string;
  size?: number;
}

export const Mandala12Point: React.FC<GeometryProps> = ({ color1, color2, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3;

  // 12-point mandala: 12 petals/points around center
  const points: Array<{ x: number; y: number }> = [];
  
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI * 2) / 12;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  }

  // Create petal shapes
  const petals: Array<{ path: string }> = [];
  points.forEach((point, i) => {
    const nextPoint = points[(i + 1) % 12];
    const midAngle = (i * Math.PI * 2) / 12 + Math.PI / 12;
    const midX = centerX + radius * 0.7 * Math.cos(midAngle);
    const midY = centerY + radius * 0.7 * Math.sin(midAngle);
    
    petals.push({
      path: `M ${centerX} ${centerY} L ${point.x} ${point.y} Q ${midX} ${midY} ${nextPoint.x} ${nextPoint.y} Z`
    });
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <linearGradient id={`grad-mandala12-${color1}-${color2}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <filter id={`glow-mandala12-gold`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width={size} height={size} fill="#000000" rx={size >= 300 ? "0" : "16"}/>
      <g filter={`url(#glow-mandala12-gold)`} opacity="0.9">
        {/* Outer circle */}
        <circle cx={centerX} cy={centerY} r={radius * 1.1} fill="none" stroke="#D4A574" strokeWidth="1" opacity="0.85"/>
        {/* Petals */}
        {petals.map((petal, i) => (
          <path
            key={i}
            d={petal.path}
            fill="none"
            stroke="#D4A574"
            strokeWidth="1"
            opacity="0.85"
          />
        ))}
        {/* Center circle */}
        <circle cx={centerX} cy={centerY} r={radius * 0.12} fill="#D4A574" opacity="0.9"/>
      </g>
    </svg>
  );
};

