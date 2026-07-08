/**
 * Chakra Mantra Service
 * Fetches chakra healing music from the API
 * API: https://dev-api-music-iota.vercel.app/app/musics/shakra?email={email}
 */

import { getStoredAuth } from './authService';

const DEV_API_URL = 'https://dev-api-music-iota.vercel.app';

export interface ChakraMusicCategory {
  _id: string;
  name: string;
  type: string;
  slug: string;
}

export interface ChakraMusicTrack {
  _id: string;
  id?: string;
  name: string;
  description: string;
  position: number;
  favorites: string[];
  audioFilename: string;
  imageFilename: string;
  categories: ChakraMusicCategory[];
  isPremium: boolean;
  typeContent: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  visualUrl?: string;
}

export interface ChakraMusicResponse {
  musicList: ChakraMusicTrack[];
  isPremium: boolean;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
}

/**
 * Map API slug to chakra ID for filtering.
 * Slugs: root-chakra-healing-music, sacral-chakra-healing-music, solar-plexus-chakra-healing-music,
 * heart-chakra-healing-music, throat-chakra-healing-music, third-eye-chakra-healing-music,
 * crown-chakra-healing-music, root-chakra-beej-mantra, sacral-beej-vam, solarplexus-beej-ram, etc.
 */
const SLUG_TO_CHAKRA: Record<string, string> = {
  root: 'root',
  sacral: 'sacral',
  solar: 'solar',
  solarplexus: 'solar',
  heart: 'heart',
  throat: 'throat',
  'third-eye': 'third_eye',
  '3rdeye': 'third_eye',
  crown: 'crown',
};

export function getChakraIdFromSlug(slug: string): string | null {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  for (const [key, chakraId] of Object.entries(SLUG_TO_CHAKRA)) {
    if (lower.includes(key)) return chakraId;
  }
  return null;
}

/**
 * Fetch chakra music from API
 */
export const fetchChakraMusic = async (email: string): Promise<ChakraMusicResponse> => {
  const params = new URLSearchParams({ email });

  try {
    const auth = await getStoredAuth();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (auth?.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
    if (auth?.email) {
      headers['x-user-email'] = auth.email;
    }

    const response = await fetch(
      `${DEV_API_URL}/app/musics/shakra?${params}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch chakra music: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data) {
      throw new Error('Failed to fetch chakra music: Invalid response');
    }

    return data;
  } catch (error: any) {
    console.error('[ChakraMantraService] Error fetching chakra music:', error);
    throw new Error(error.message || 'Failed to fetch chakra music');
  }
};

/**
 * Fetch a single chakra track by ID
 */
export const fetchChakraTrack = async (
  trackId: string,
  email: string
): Promise<ChakraMusicTrack | null> => {
  try {
    const response = await fetchChakraMusic(email);
    const track = response.musicList.find(
      (t) => t._id === trackId || t.id === trackId
    );
    return track || null;
  } catch (error: any) {
    console.error('[ChakraMantraService] Error fetching track:', error);
    return null;
  }
};

/**
 * Filter music list by chakra ID (from ?chakra= query param)
 */
export const filterChakraMusicByChakra = (
  musicList: ChakraMusicTrack[],
  chakraId: string | null
): ChakraMusicTrack[] => {
  if (!chakraId) return musicList;
  return musicList.filter((track) => {
    const trackChakraId = getChakraIdFromSlug(track.slug);
    return trackChakraId === chakraId;
  });
};

// --- Legacy: Used by Meditate chakra tab and AudioPlayer fallback ---
const CHAKRA_AUDIO_BASE = 'https://storage.googleapis.com/7chakra-healing-music';

export interface ChakraMantra {
  id: string;
  title: string;
  audioUrl: string;
  duration?: number;
  description?: string;
}

export const CHAKRA_MANTRAS: Record<string, ChakraMantra[]> = {
  root: [
    { id: 'root_grounding_essence', title: 'Root LAM - Grounding Essence', audioUrl: `${CHAKRA_AUDIO_BASE}/Rootchakra_v2.mp3`, duration: 600, description: 'Deep grounding meditation.' },
    { id: 'root_foundation_flow', title: 'Root LAM - Foundation Flow', audioUrl: `${CHAKRA_AUDIO_BASE}/RootChakra.mp3`, duration: 600, description: 'Classic root chakra healing.' },
  ],
  sacral: [
    { id: 'sacral_creative_awakening', title: 'Sacral VAM - Creative Awakening', audioUrl: `${CHAKRA_AUDIO_BASE}/Sacralchakra_v2.mp3`, duration: 600, description: 'Awaken your creative power.' },
    { id: 'sacral_sensual_harmony', title: 'Sacral VAM - Sensual Harmony', audioUrl: `${CHAKRA_AUDIO_BASE}/SacralChakra.mp3`, duration: 600, description: 'Harmonize your sacral energy.' },
  ],
  solar: [
    { id: 'solar_power_activation', title: 'Solar RAM - Power Activation', audioUrl: `${CHAKRA_AUDIO_BASE}/SolarPlexus_v2.mp3`, duration: 600, description: 'Activate your inner fire.' },
    { id: 'solar_will_radiance', title: 'Solar RAM - Will Radiance', audioUrl: `${CHAKRA_AUDIO_BASE}/SolarPlexusChakra.mp3`, duration: 600, description: 'Radiate your authentic power.' },
  ],
  heart: [
    { id: 'heart_love_expansion', title: 'Heart YAM - Love Expansion', audioUrl: `${CHAKRA_AUDIO_BASE}/HeartChakra_v2.mp3`, duration: 600, description: 'Expand your capacity for love.' },
    { id: 'heart_compassion_flow', title: 'Heart YAM - Compassion Flow', audioUrl: `${CHAKRA_AUDIO_BASE}/HeartChakra.mp3`, duration: 600, description: 'Flow with unconditional love.' },
  ],
  throat: [
    { id: 'throat_truth_expression', title: 'Throat HAM - Truth Expression', audioUrl: `${CHAKRA_AUDIO_BASE}/ThroatChakra_v2.mp3`, duration: 600, description: 'Express your authentic truth.' },
    { id: 'throat_voice_liberation', title: 'Throat HAM - Voice Liberation', audioUrl: `${CHAKRA_AUDIO_BASE}/ThroatChakra.mp3`, duration: 600, description: 'Liberate your voice.' },
  ],
  third_eye: [
    { id: 'third_eye_vision_clarity', title: 'Third Eye OM - Vision Clarity', audioUrl: `${CHAKRA_AUDIO_BASE}/ThirdEye_v2.mp3`, duration: 600, description: 'Clear your inner vision.' },
    { id: 'third_eye_insight_chant', title: 'Third Eye OM - Insight Chant', audioUrl: `${CHAKRA_AUDIO_BASE}/ThirdEyeChant.mp3`, duration: 600, description: 'Chant for deeper insight.' },
  ],
  crown: [
    { id: 'crown_divine_connection', title: 'Crown OM - Divine Connection', audioUrl: `${CHAKRA_AUDIO_BASE}/Crownchakra_v2.mp3`, duration: 600, description: 'Connect to the divine.' },
    { id: 'crown_transcendence', title: 'Crown OM - Transcendence', audioUrl: `${CHAKRA_AUDIO_BASE}/CrownChakra.mp3`, duration: 600, description: 'Transcend the physical realm.' },
    { id: 'crown_balance_harmony', title: 'Crown Balance - Harmony', audioUrl: `${CHAKRA_AUDIO_BASE}/Crown%20Chakra%20Balance.mp3`, duration: 600, description: 'Balance your crown chakra.' },
  ],
};

export const getMantrasForChakra = (chakraId: string): ChakraMantra[] => {
  return CHAKRA_MANTRAS[chakraId] || [];
};

export const getMantra = (chakraId: string, mantraId: string): ChakraMantra | undefined => {
  const mantras = getMantrasForChakra(chakraId);
  return mantras.find((m) => m.id === mantraId);
};
