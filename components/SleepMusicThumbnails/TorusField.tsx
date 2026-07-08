import React from 'react';

interface GeometryProps {
  color1: string;
  color2: string;
  size?: number;
}

export const TorusField: React.FC<GeometryProps> = ({ color1, color2, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const baseRadius = size * 0.2;

  // Torus field: Concentric circles with flowing lines
  const circles: Array<{ cx: number; cy: number; r: number }> = [];
  
  // Multiple concentric circles
  for (let i = 1; i <= 4; i++) {
    circles.push({
      cx: centerX,
      cy: centerY,
      r: baseRadius * i
    });
  }

  // Flowing curved lines
  const curves: Array<{ path: string }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const startX = centerX + baseRadius * Math.cos(angle);
    const startY = centerY + baseRadius * Math.sin(angle);
    const endX = centerX + baseRadius * 3 * Math.cos(angle + Math.PI / 4);
    const endY = centerY + baseRadius * 3 * Math.sin(angle + Math.PI / 4);
    const midX = centerX + baseRadius * 2 * Math.cos(angle + Math.PI / 8);
    const midY = centerY + baseRadius * 2 * Math.sin(angle + Math.PI / 8);
    
    curves.push({
      path: `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`
    });
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <linearGradient id={`grad-torus-${color1}-${color2}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
        <filter id={`glow-torus-gold`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width={size} height={size} fill="#000000" rx={size >= 300 ? "0" : "16"}/>
      <g filter={`url(#glow-torus-gold)`} opacity="0.9">
        {/* Curved lines */}
        {curves.map((curve, i) => (
          <path
            key={`curve-${i}`}
            d={curve.path}
            fill="none"
            stroke="#D4A574"
            strokeWidth="1"
            opacity="0.85"
          />
        ))}
        {/* Concentric circles */}
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

