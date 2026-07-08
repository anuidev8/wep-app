import React from 'react';

interface MeditationPatternProps {
  accentColor: string;
  size?: number;
}

export const Waves: React.FC<MeditationPatternProps> = ({ accentColor, size = 120 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.4;

  // Waves: concentric wavy circles
  const waves: Array<{ r: number; amplitude: number; frequency: number; opacity: number }> = [
    { r: radius * 0.3, amplitude: 5, frequency: 8, opacity: 0.9 },
    { r: radius * 0.5, amplitude: 8, frequency: 12, opacity: 0.8 },
    { r: radius * 0.7, amplitude: 10, frequency: 16, opacity: 0.7 },
    { r: radius * 0.9, amplitude: 12, frequency: 20, opacity: 0.6 }
  ];

  const generateWavePath = (r: number, amplitude: number, frequency: number): string => {
    const points: string[] = [];
    const segments = 64;
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const waveOffset = Math.sin(angle * frequency) * amplitude;
      const currentR = r + waveOffset;
      const x = centerX + currentR * Math.cos(angle);
      const y = centerY + currentR * Math.sin(angle);
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    
    return points.join(' ') + ' Z';
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={size >= 300 ? "" : "rounded-2xl"}>
      <defs>
        <filter id={`glow-waves-${accentColor}`}>
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#glow-waves-${accentColor})`} opacity="0.9">
        {waves.map((wave, i) => (
          <path
            key={i}
            d={generateWavePath(wave.r, wave.amplitude, wave.frequency)}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            opacity={wave.opacity}
          />
        ))}
        {/* Center circle */}
        <circle cx={centerX} cy={centerY} r={radius * 0.1} fill={accentColor} opacity="0.8"/>
      </g>
    </svg>
  );
};

