/**
 * Moon phase utilities synced to the lunar calendar.
 * Uses lunarphase-js for accurate phase calculations based on Julian dates.
 */
import { Moon } from 'lunarphase-js';

const SYNODIC_MONTH_DAYS = 29.53059;

/**
 * Calculate moon illumination percentage (0–100) from lunar age.
 * Follows the standard sine-curve model used by astronomical sources.
 */
function illuminationFromAge(ageDays: number): number {
  const normalized = (ageDays % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  // Illumination = 0 at new moon, 1 at full moon
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * normalized));
  return Math.round(illumination * 100);
}

export interface MoonPhaseInfo {
  /** Illumination percentage 0–100 */
  illuminationPercent: number;
  /** Phase name, e.g. "Waxing Gibbous" */
  phaseName: string;
  /** Days since last new moon */
  ageDays: number;
  /** True if waxing (right side lit), false if waning (left side lit) */
  isWaxing: boolean;
}

/** Dark shade for unlit moon surface - zen look */
export const MOON_DARK = '#1a2235';

/** Soft moon glow - luminous center, natural lunar look */
export const MOON_GLOW = 'radial-gradient(circle at 35% 35%, #f5f2e8 0%, #e8e4d8 30%, #d8d4c8 55%, #c8c4b8 100%)';

/**
 * Offset for shadow circle to create crescent shape (not pie).
 * 18% lit = 18% visible crescent, 82% in shadow.
 * Waxing = right side lit, shadow on left. Waning = left side lit, shadow on right.
 */
export function getCrescentShadowOffset(
  illuminationPercent: number,
  isWaxing: boolean,
  sizePx: number
): number {
  if (illuminationPercent >= 100) return sizePx; // shadow fully outside
  if (illuminationPercent <= 0) return 0; // shadow centered, full coverage
  const radius = sizePx / 2;
  // Small offset = shadow covers more = thin crescent (low %). Large offset = shadow covers less = fat crescent (high %).
  const offset = (radius * 2) * (illuminationPercent / 100);
  return offset;
}

/**
 * Get current moon phase info synced to the lunar calendar.
 * @param date - Optional date; defaults to now
 */
export function getMoonPhaseInfo(date?: Date): MoonPhaseInfo {
  const d = date ?? new Date();
  const age = Moon.lunarAge(d);
  const phaseName = Moon.lunarPhase(d);
  const illuminationPercent = illuminationFromAge(age);
  const isWaxing = Moon.isWaxing(d);
  return { illuminationPercent, phaseName, ageDays: age, isWaxing };
}
