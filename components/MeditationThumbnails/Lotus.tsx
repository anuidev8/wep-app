import React from 'react';

interface MeditationPatternProps {
  accentColor: string;
  size?: number;
}

export const Lotus: React.FC<MeditationPatternProps> = ({ accentColor, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3;

  // Lotus: 12 petals in 3 layers
  const layers = [
    { petalCount: 4, petalRadius: radius * 0.4, rotation: 0 },
    { petalCount: 4, petalRadius: radius * 0.6, rotation: 45 },
    { petalCount: 4, petalRadius: radius * 0.8, rotation: 22.5 }
  ];

  const petals: Array<{ path: string; opacity: number }> = [];
  
  layers.forEach((layer, layerIdx) => {
    for (let i = 0; i < layer.petalCount; i++) {
      const angle = (i * Math.PI * 2) / layer.petalCount + (layer.rotation * Math.PI / 180);
      const x = centerX + layer.petalRadius * Math.cos(angle);
      const y = centerY + layer.petalRadius * Math.sin(angle);
      
      // Create petal shape (ellipse)
      const petalWidth = radius * 0.15;
      const petalHeight = radius * 0.25;
      
      petals.push({
        path: `M ${centerX} ${centerY} Q ${x - petalWidth} ${y - petalHeight} ${x} ${y} T ${x + petalWidth} ${y + petalHeight} Q ${x} ${y} ${centerX} ${centerY} Z`,
        opacity: 0.9 - (layerIdx * 0.2)
      });
    }
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <filter id={`glow-lotus-${accentColor}`}>
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#glow-lotus-${accentColor})`} opacity="0.9">
        {/* Petals */}
        {petals.map((petal, i) => (
          <path
            key={i}
            d={petal.path}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            opacity={petal.opacity}
          />
        ))}
        {/* Center circle */}
        <circle cx={centerX} cy={centerY} r={radius * 0.15} fill={accentColor} opacity="0.8"/>
        <circle cx={centerX} cy={centerY} r={radius * 0.08} fill={accentColor} opacity="0.9"/>
      </g>
    </svg>
  );
};

