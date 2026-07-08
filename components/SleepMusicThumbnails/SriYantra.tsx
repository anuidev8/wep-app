import React from 'react';

interface GeometryProps {
  color1: string;
  color2: string;
  size?: number;
}

export const SriYantra: React.FC<GeometryProps> = ({ color1, color2, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const baseRadius = size * 0.3;

  // Sri Yantra: 9 interlocking triangles (4 upward, 5 downward)
  const triangles: Array<{ points: string; rotation: number }> = [];
  
  // Outer triangles
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI * 2) / 4;
    triangles.push({
      points: `${centerX},${centerY - baseRadius} ${centerX - baseRadius * 0.5},${centerY + baseRadius * 0.5} ${centerX + baseRadius * 0.5},${centerY + baseRadius * 0.5}`,
      rotation: angle
    });
  }

  // Inner triangles (simplified)
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    triangles.push({
      points: `${centerX},${centerY + baseRadius * 0.6} ${centerX - baseRadius * 0.3},${centerY - baseRadius * 0.3} ${centerX + baseRadius * 0.3},${centerY - baseRadius * 0.3}`,
      rotation: angle
    });
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <linearGradient id={`grad-yantra-${color1}-${color2}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <filter id={`glow-yantra-gold`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width={size} height={size} fill="#000000" rx={size >= 300 ? "0" : "16"}/>
      <g filter={`url(#glow-yantra-gold)`} opacity="0.9" transform={`translate(${centerX}, ${centerY})`}>
        {/* Outer circle */}
        <circle cx="0" cy="0" r={baseRadius * 1.2} fill="none" stroke="#D4A574" strokeWidth="1" opacity="0.85"/>
        {/* Triangles */}
        {triangles.map((triangle, i) => (
          <polygon
            key={i}
            points={triangle.points}
            fill="none"
            stroke="#D4A574"
            strokeWidth="1"
            opacity="0.85"
            transform={`rotate(${(i * 360) / triangles.length})`}
          />
        ))}
        {/* Center dot */}
        <circle cx="0" cy="0" r="2" fill="#D4A574" opacity="0.9"/>
      </g>
    </svg>
  );
};

