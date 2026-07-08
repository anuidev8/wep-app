import React from 'react';

interface MeditationPatternProps {
  accentColor: string;
  size?: number;
}

export const SacredGeo: React.FC<MeditationPatternProps> = ({ accentColor, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3;

  // Sacred Geometry: Hexagon with interlocking triangles (Star of David / Metatron's Cube inspired)
  const hexagonPoints: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    hexagonPoints.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  }

  // Two interlocking triangles
  const triangle1 = [
    hexagonPoints[0],
    hexagonPoints[2],
    hexagonPoints[4]
  ];
  
  const triangle2 = [
    hexagonPoints[1],
    hexagonPoints[3],
    hexagonPoints[5]
  ];

  // Inner circles
  const circles = [
    { r: radius * 0.5, opacity: 0.6 },
    { r: radius * 0.3, opacity: 0.7 },
    { r: radius * 0.15, opacity: 0.8 }
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <filter id={`glow-sacred-${accentColor}`}>
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#glow-sacred-${accentColor})`} opacity="0.9">
        {/* Outer hexagon */}
        <polygon
          points={hexagonPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
          opacity="0.8"
        />
        
        {/* Interlocking triangles */}
        <polygon
          points={triangle1.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
          opacity="0.85"
        />
        <polygon
          points={triangle2.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
          opacity="0.85"
        />
        
        {/* Inner circles */}
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
        
        {/* Center dot */}
        <circle cx={centerX} cy={centerY} r={radius * 0.08} fill={accentColor} opacity="0.9"/>
      </g>
    </svg>
  );
};

