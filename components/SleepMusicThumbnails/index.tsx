import React from 'react';
import { FlowerOfLife } from './FlowerOfLife';
import { SeedOfLife } from './SeedOfLife';
import { SriYantra } from './SriYantra';
import { MetatronsCube } from './MetatronsCube';
import { VesicaPiscis } from './VesicaPiscis';
import { TorusField } from './TorusField';
import { Mandala8Point } from './Mandala8Point';
import { Mandala12Point } from './Mandala12Point';
import { SpiralMandala } from './SpiralMandala';

// Color palette based on track types
const COLOR_PALETTES = {
  deepSleep: { color1: '#4A90E2', color2: '#E8F4F8' },
  bodyHealing: { color1: '#9B7EBD', color2: '#E6DFF0' },
  anxietyRelief: { color1: '#5ABAA7', color2: '#D4F1ED' },
  chakraEnergy: { color1: '#8B7EC8', color2: '#D4C9E8' },
  generalHealing: { color1: '#7BC8A4', color2: '#E0F2E9' },
  purplePink: { color1: '#B794D4', color2: '#E6D4F0' },
  rainbow: { color1: '#9B7EBD', color2: '#5ABAA7' }, // Softened rainbow
};

// All 9 geometry patterns in order
const ALL_GEOMETRIES = [
  'flowerOfLife',
  'seedOfLife',
  'sriYantra',
  'metatronsCube',
  'vesicaPiscis',
  'torusField',
  'mandala8Point',
  'mandala12Point',
  'spiralMandala'
];

// Track pattern assignments to ensure no repeats - use a simple counter
let patternCounter = 0;

// Map track names/categories to geometry types - ensures no repeats
const getGeometryType = (name: string, category?: string, trackId?: string, index?: number): string => {
  // Use index if provided (from list position), otherwise use hash as fallback
  if (index !== undefined) {
    return ALL_GEOMETRIES[index % ALL_GEOMETRIES.length];
  }
  
  // Fallback: Create a unique hash from track name/id
  const identifier = trackId || name || '';
  const hash = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use hash to select from all 9 patterns
  const patternIndex = hash % ALL_GEOMETRIES.length;
  return ALL_GEOMETRIES[patternIndex];
};

// Map track names/categories to color palette
const getColorPalette = (name: string, category?: string): typeof COLOR_PALETTES[keyof typeof COLOR_PALETTES] => {
  const lowerName = name.toLowerCase();
  const lowerCategory = category?.toLowerCase() || '';

  if (lowerName.includes('deep sleep') || lowerName.includes('delta') || lowerName.includes('3 hz')) {
    return COLOR_PALETTES.deepSleep;
  }
  if (lowerName.includes('body healing') || lowerName.includes('healing')) {
    return COLOR_PALETTES.bodyHealing;
  }
  if (lowerName.includes('anxiety') || lowerName.includes('calm') || lowerName.includes('relief')) {
    return COLOR_PALETTES.anxietyRelief;
  }
  if (lowerName.includes('chakra') || lowerName.includes('energy')) {
    return COLOR_PALETTES.chakraEnergy;
  }
  if (lowerName.includes('432') || lowerName.includes('rainbow')) {
    return COLOR_PALETTES.rainbow;
  }
  if (lowerName.includes('528') || lowerName.includes('solfeggio')) {
    return COLOR_PALETTES.purplePink;
  }

  // Fallback based on category
  if (lowerCategory.includes('sleep') || lowerCategory.includes('delta')) {
    return COLOR_PALETTES.deepSleep;
  }
  if (lowerCategory.includes('healing') || lowerCategory.includes('body')) {
    return COLOR_PALETTES.bodyHealing;
  }
  if (lowerCategory.includes('anxiety') || lowerCategory.includes('calm')) {
    return COLOR_PALETTES.anxietyRelief;
  }
  if (lowerCategory.includes('chakra') || lowerCategory.includes('energy')) {
    return COLOR_PALETTES.chakraEnergy;
  }

  // Default
  return COLOR_PALETTES.generalHealing;
};

interface SleepMusicThumbnailProps {
  name: string;
  category?: string;
  trackId?: string;
  index?: number; // Index in the list to ensure sequential pattern assignment
  size?: number;
  className?: string;
}

export const SleepMusicThumbnail: React.FC<SleepMusicThumbnailProps> = ({
  name,
  category,
  trackId,
  index,
  size = 120,
  className = ''
}) => {
  const geometryType = getGeometryType(name, category, trackId, index);
  const colors = getColorPalette(name, category);

  const renderGeometry = () => {
    switch (geometryType) {
      case 'flowerOfLife':
        return <FlowerOfLife color1={colors.color1} color2={colors.color2} size={size} />;
      case 'seedOfLife':
        return <SeedOfLife color1={colors.color1} color2={colors.color2} size={size} />;
      case 'sriYantra':
        return <SriYantra color1={colors.color1} color2={colors.color2} size={size} />;
      case 'metatronsCube':
        return <MetatronsCube color1={colors.color1} color2={colors.color2} size={size} />;
      case 'vesicaPiscis':
        return <VesicaPiscis color1={colors.color1} color2={colors.color2} size={size} />;
      case 'torusField':
        return <TorusField color1={colors.color1} color2={colors.color2} size={size} />;
      case 'mandala8Point':
        return <Mandala8Point color1={colors.color1} color2={colors.color2} size={size} />;
      case 'mandala12Point':
        return <Mandala12Point color1={colors.color1} color2={colors.color2} size={size} />;
      case 'spiralMandala':
        return <SpiralMandala color1={colors.color1} color2={colors.color2} size={size} />;
      default:
        return <FlowerOfLife color1={colors.color1} color2={colors.color2} size={size} />;
    }
  };

  // For large sizes (featured cards), make it fill the container
  const isLarge = size >= 300;
  const containerClass = isLarge 
    ? `absolute inset-0 w-full h-full ${className}` 
    : `shrink-0 ${className}`;

  return (
    <div className={containerClass}>
      {renderGeometry()}
    </div>
  );
};

