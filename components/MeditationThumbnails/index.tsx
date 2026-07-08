import React from 'react';
import { Mandala } from './Mandala';
import { Lotus } from './Lotus';
import { Chakra } from './Chakra';
import { Waves } from './Waves';
import { SacredGeo } from './SacredGeo';
import { Om } from './Om';
import { MeditationTheme, getMeditationTheme } from '../../constants/meditationThemes';

export const SANCTUARY_UNIFIED_THEME: MeditationTheme = {
  id: 'sanctuary-unified',
  gradient: 'linear-gradient(135deg, #D4A574 0%, #B8936A 50%, #1A4D5C 100%)',
  accentColor: 'rgba(255, 255, 255, 0.95)',
  pattern: 'mandala',
  textColor: '#FFFFFF'
};

interface GuidedMeditationThumbnailProps {
  name: string;
  index?: number;
  size?: number;
  className?: string;
  theme?: MeditationTheme;
  /** Use unified taupe gradient for meditation sanctuary aesthetic */
  useSanctuaryTheme?: boolean;
}

export const GuidedMeditationThumbnail: React.FC<GuidedMeditationThumbnailProps> = ({
  name,
  index = 0,
  size = 120,
  className = '',
  theme,
  useSanctuaryTheme = false
}) => {
  // Available patterns to cycle through
  const patterns: Array<'mandala' | 'lotus' | 'chakra' | 'waves' | 'sacred-geo' | 'om'> = [
    'mandala',
    'lotus',
    'chakra',
    'waves',
    'sacred-geo',
    'om'
  ];
  
  let meditationTheme: MeditationTheme;
  let patternToUse: typeof patterns[number];
  
  if (useSanctuaryTheme) {
    // Use sanctuary theme but rotate patterns based on index
    patternToUse = patterns[index % patterns.length];
    meditationTheme = {
      ...SANCTUARY_UNIFIED_THEME,
      pattern: patternToUse
    };
  } else {
    meditationTheme = theme || getMeditationTheme(name, index);
    patternToUse = meditationTheme.pattern;
  }

  const renderPattern = () => {
    switch (patternToUse) {
      case 'mandala':
        return <Mandala accentColor={meditationTheme.accentColor} size={size} />;
      case 'lotus':
        return <Lotus accentColor={meditationTheme.accentColor} size={size} />;
      case 'chakra':
        return <Chakra accentColor={meditationTheme.accentColor} size={size} />;
      case 'waves':
        return <Waves accentColor={meditationTheme.accentColor} size={size} />;
      case 'sacred-geo':
        return <SacredGeo accentColor={meditationTheme.accentColor} size={size} />;
      case 'om':
        return <Om accentColor={meditationTheme.accentColor} size={size} />;
      default:
        return <Mandala accentColor={meditationTheme.accentColor} size={size} />;
    }
  };

  // For large sizes (featured cards), make it fill the container
  const isLarge = size >= 300;
  const containerClass = isLarge 
    ? `absolute inset-0 w-full h-full ${className}` 
    : `shrink-0 ${className}`;

  return (
    <div 
      className={containerClass}
      style={{
        background: meditationTheme.gradient,
        borderRadius: size >= 300 ? '0' : '16px'
      }}
    >
      {renderPattern()}
    </div>
  );
};

