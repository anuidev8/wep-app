import React from 'react';

interface MeditationPatternProps {
  accentColor: string;
  size?: number;
}

export const Chakra: React.FC<MeditationPatternProps> = ({ accentColor, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3;

  // Chakra: 7 concentric circles with petals (representing 7 chakras)
  const chakras = [
    { r: radius * 0.15, petalCount: 4 },
    { r: radius * 0.3, petalCount: 6 },
    { r: radius * 0.45, petalCount: 10 },
    { r: radius * 0.6, petalCount: 12 },
    { r: radius * 0.75, petalCount: 16 },
    { r: radius * 0.9, petalCount: 2 },
    { r: radius * 1.05, petalCount: 1000 } // Outer circle
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <filter id={`glow-chakra-${accentColor}`}>
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#glow-chakra-${accentColor})`} opacity="0.9">
        {chakras.map((chakra, i) => {
          if (chakra.petalCount > 100) {
            // Outer circle
            return (
              <circle
                key={i}
                cx={centerX}
                cy={centerY}
                r={chakra.r}
                fill="none"
                stroke={accentColor}
                strokeWidth="1.5"
                opacity={0.4}
              />
            );
          }
          
          // Petals for each chakra
          const petals = [];
          for (let j = 0; j < chakra.petalCount; j++) {
            const angle = (j * Math.PI * 2) / chakra.petalCount;
            const x1 = centerX + chakra.r * Math.cos(angle);
            const y1 = centerY + chakra.r * Math.sin(angle);
            const nextAngle = ((j + 1) * Math.PI * 2) / chakra.petalCount;
            const x2 = centerX + chakra.r * Math.cos(nextAngle);
            const y2 = centerY + chakra.r * Math.sin(nextAngle);
            
            petals.push(
              <line
                key={j}
                x1={centerX}
                y1={centerY}
                x2={(x1 + x2) / 2}
                y2={(y1 + y2) / 2}
                stroke={accentColor}
                strokeWidth="1"
                opacity={0.7 - (i * 0.1)}
              />
            );
          }
          
          return (
            <g key={i}>
              <circle
                cx={centerX}
                cy={centerY}
                r={chakra.r}
                fill="none"
                stroke={accentColor}
                strokeWidth="1.5"
                opacity={0.6 - (i * 0.05)}
              />
              {petals}
            </g>
          );
        })}
        {/* Center dot */}
        <circle cx={centerX} cy={centerY} r={radius * 0.08} fill={accentColor} opacity="0.9"/>
      </g>
    </svg>
  );
};

