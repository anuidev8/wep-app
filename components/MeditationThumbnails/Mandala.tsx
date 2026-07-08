import React from 'react';

interface MeditationPatternProps {
  accentColor: string;
  size?: number;
}

export const Mandala: React.FC<MeditationPatternProps> = ({ accentColor, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3;

  // 8-point mandala with layered circles
  const circles: Array<{ r: number; opacity: number }> = [
    { r: radius * 1.2, opacity: 0.3 },
    { r: radius * 0.9, opacity: 0.5 },
    { r: radius * 0.6, opacity: 0.7 },
    { r: radius * 0.3, opacity: 0.9 }
  ];

  // 8 petals/points
  const petals: Array<{ path: string }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const x1 = centerX + radius * Math.cos(angle);
    const y1 = centerY + radius * Math.sin(angle);
    const nextAngle = ((i + 1) * Math.PI * 2) / 8;
    const x2 = centerX + radius * Math.cos(nextAngle);
    const y2 = centerY + radius * Math.sin(nextAngle);
    const midAngle = angle + Math.PI / 8;
    const midX = centerX + radius * 0.7 * Math.cos(midAngle);
    const midY = centerY + radius * 0.7 * Math.sin(midAngle);
    
    petals.push({
      path: `M ${centerX} ${centerY} L ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2} Z`
    });
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <filter id={`glow-mandala-${accentColor}`}>
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#glow-mandala-${accentColor})`} opacity="0.9">
        {/* Layered circles */}
        {circles.map((circle, i) => (
          <circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={circle.r}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            opacity={circle.opacity}
          />
        ))}
        {/* Petals */}
        {petals.map((petal, i) => (
          <path
            key={i}
            d={petal.path}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            opacity="0.8"
          />
        ))}
        {/* Center dot */}
        <circle cx={centerX} cy={centerY} r={radius * 0.1} fill={accentColor} opacity="0.9"/>
      </g>
    </svg>
  );
};

