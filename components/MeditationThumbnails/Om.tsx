import React from 'react';

interface MeditationPatternProps {
  accentColor: string;
  size?: number;
}

export const Om: React.FC<MeditationPatternProps> = ({ accentColor, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.25;

  // Om symbol path (simplified but recognizable)
  // This is a stylized version of the ॐ symbol
  const omPath = `
    M ${centerX - radius * 0.3} ${centerY + radius * 0.2}
    Q ${centerX - radius * 0.5} ${centerY - radius * 0.3} ${centerX - radius * 0.2} ${centerY - radius * 0.4}
    Q ${centerX} ${centerY - radius * 0.5} ${centerX + radius * 0.2} ${centerY - radius * 0.4}
    Q ${centerX + radius * 0.4} ${centerY - radius * 0.3} ${centerX + radius * 0.3} ${centerY}
    Q ${centerX + radius * 0.2} ${centerY + radius * 0.3} ${centerX} ${centerY + radius * 0.2}
    Q ${centerX - radius * 0.2} ${centerY + radius * 0.3} ${centerX - radius * 0.3} ${centerY}
    Q ${centerX - radius * 0.4} ${centerY - radius * 0.3} ${centerX - radius * 0.2} ${centerY - radius * 0.4}
    Q ${centerX} ${centerY - radius * 0.5} ${centerX + radius * 0.2} ${centerY - radius * 0.4}
    Q ${centerX + radius * 0.4} ${centerY - radius * 0.3} ${centerX + radius * 0.3} ${centerY}
    Q ${centerX + radius * 0.2} ${centerY + radius * 0.3} ${centerX} ${centerY + radius * 0.2}
    Z
    M ${centerX} ${centerY + radius * 0.2}
    Q ${centerX + radius * 0.15} ${centerY + radius * 0.4} ${centerX} ${centerY + radius * 0.5}
    Q ${centerX - radius * 0.15} ${centerY + radius * 0.4} ${centerX} ${centerY + radius * 0.2}
    Z
    M ${centerX - radius * 0.1} ${centerY - radius * 0.6}
    Q ${centerX} ${centerY - radius * 0.7} ${centerX + radius * 0.1} ${centerY - radius * 0.6}
  `;

  // Simplified Om symbol using curves
  const simplifiedOmPath = `
    M ${centerX - radius * 0.4} ${centerY}
    C ${centerX - radius * 0.5} ${centerY - radius * 0.3}, ${centerX} ${centerY - radius * 0.4}, ${centerX + radius * 0.2} ${centerY - radius * 0.3}
    C ${centerX + radius * 0.4} ${centerY - radius * 0.2}, ${centerX + radius * 0.3} ${centerY}, ${centerX + radius * 0.1} ${centerY + radius * 0.2}
    C ${centerX} ${centerY + radius * 0.3}, ${centerX - radius * 0.2} ${centerY + radius * 0.2}, ${centerX - radius * 0.3} ${centerY}
    C ${centerX - radius * 0.5} ${centerY - radius * 0.3}, ${centerX} ${centerY - radius * 0.4}, ${centerX + radius * 0.2} ${centerY - radius * 0.3}
    Z
    M ${centerX} ${centerY + radius * 0.2}
    C ${centerX + radius * 0.1} ${centerY + radius * 0.35}, ${centerX} ${centerY + radius * 0.45}, ${centerX - radius * 0.1} ${centerY + radius * 0.35}
    Z
    M ${centerX - radius * 0.05} ${centerY - radius * 0.55}
    C ${centerX} ${centerY - radius * 0.6}, ${centerX + radius * 0.05} ${centerY - radius * 0.55}, ${centerX} ${centerY - radius * 0.5}
  `;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <filter id={`glow-om-${accentColor}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#glow-om-${accentColor})`} opacity="0.95">
        {/* Outer circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 1.1}
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
          opacity="0.4"
        />
        
        {/* Om symbol */}
        <path
          d={simplifiedOmPath}
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          opacity="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Inner decorative circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.3}
          fill="none"
          stroke={accentColor}
          strokeWidth="1"
          opacity="0.6"
        />
      </g>
    </svg>
  );
};

