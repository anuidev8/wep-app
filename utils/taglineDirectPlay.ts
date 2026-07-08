/**
 * Resolve direct-play actions for dashboard taglines.
 * Picks a random track from the appropriate pool and returns a player URL.
 */

import { CHAKRAS, GUIDED_SESSIONS, MANTRAS, SHIVA_TRACKS } from '../constants';

export type DirectPlayType = 'MANTRA' | 'SHIVA' | 'GUIDED' | 'SLEEP' | 'CHAKRA';

export interface DirectPlayAction {
  type: DirectPlayType;
  filter?: string;
}

/**
 * Returns a player URL for direct play, or null if no match.
 */
export function resolveDirectPlayUrl(action: DirectPlayAction): string | null {
  const { type, filter } = action;

  if (type === 'MANTRA') {
    const pool = filter
      ? MANTRAS.filter((m) => (m as any).deity === filter)
      : MANTRAS;
    if (pool.length === 0) return null;
    const track = pool[Math.floor(Math.random() * pool.length)];
    const audioUrl = track.audioUrl;
    return audioUrl
      ? `/player?track=${track.id}&type=MANTRA&audioUrl=${encodeURIComponent(audioUrl)}`
      : `/player?track=${track.id}&type=MANTRA`;
  }

  if (type === 'SHIVA') {
    const pool = SHIVA_TRACKS;
    if (pool.length === 0) return null;
    const track = pool[Math.floor(Math.random() * pool.length)];
    const audioUrl = track.audioUrl;
    return audioUrl
      ? `/player?track=${track.id}&type=SHIVA&audioUrl=${encodeURIComponent(audioUrl)}`
      : `/player?track=${track.id}&type=SHIVA`;
  }

  if (type === 'GUIDED') {
    // Only pick tracks that have audioUrl - tracks without it cannot play
    const guided = GUIDED_SESSIONS.filter(
      (s) => s.category === 'GUIDED' && (s as any).audioUrl
    );
    const pool = filter
      ? guided.filter((s) =>
          s.tags?.some((t) => t.toLowerCase().includes(filter.toLowerCase()))
        )
      : guided;
    const list = pool.length > 0 ? pool : guided;
    if (list.length === 0) return null;
    const track = list[Math.floor(Math.random() * list.length)];
    const audioUrl = (track as any).audioUrl;
    return audioUrl
      ? `/player?track=${track.id}&type=GUIDED&audioUrl=${encodeURIComponent(audioUrl)}`
      : null;
  }

  if (type === 'SLEEP') {
    const sleep = GUIDED_SESSIONS.filter(
      (s) => s.category === 'SLEEP' && (s as any).audioUrl
    );
    const pool = filter
      ? sleep.filter((s) =>
          s.tags?.some((t) => t.toLowerCase().includes(filter.toLowerCase())) ||
          s.title?.toLowerCase().includes(filter.toLowerCase())
        )
      : sleep;
    const list = pool.length > 0 ? pool : sleep;
    if (list.length === 0) return null;
    const track = list[Math.floor(Math.random() * list.length)];
    const audioUrl = (track as any).audioUrl;
    return audioUrl
      ? `/player?track=${track.id}&type=SLEEP&audioUrl=${encodeURIComponent(audioUrl)}`
      : `/player?track=${track.id}&type=SLEEP`;
  }

  if (type === 'CHAKRA') {
    const chakra = CHAKRAS[Math.floor(Math.random() * CHAKRAS.length)];
    return `/player?track=chakra_${chakra.id}&type=CHAKRA&visualUrl=${encodeURIComponent(chakra.visualUrl)}`;
  }

  return null;
}
