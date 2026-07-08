import { getStoredAuth } from './authService';

const DEV_API_URL = 'https://dev-api-music-iota.vercel.app';

export interface MantraItem {
  _id: string;
  id?: string; // Some APIs also provide id field
  title: string;
  description: string;
  deity?: 'SHIVA' | 'HANUMAN' | 'KRISHNA' | 'DEVI' | 'GANESHA' | 'UNIVERSAL';
  benefit?: 'ENERGY' | 'CALM' | 'SLEEP' | 'PROTECTION' | 'HEALING' | 'DEVOTION' | 'CONFIDENCE' | 'FORGIVENESS';
  duration?: number; // Duration in seconds
  audioUrl: string; // Audio URL (GCS) - API uses audioUrl, not audioFilename
  thumbnailUrl?: string; // Thumbnail image URL (GCS) - optional
  visualUrl?: string; // Visual/video URL (GCS) - optional
  category?: string; // Category like "SHIVA", "MANTRA"
  isPremium: boolean; // TRUE = Premium only, FALSE = Free
  popularityScore?: number; // For sorting by popularity
  tags?: string[]; // Search keywords
  color?: string; // Optional color code
  favorites?: string[]; // Array of user IDs who favorited
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  pointsReward?: number;
  views?: number;
  isActive?: boolean;
  position?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MantrasResponse {
  success?: boolean; // API response includes success field
  mantras: MantraItem[];
  hasAccess: boolean; // User's premium status (true = premium user)
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

/**
 * Fetch mantras from API
 * @param email - User's email for premium/favorites check
 * @param page - Page number (default: 1)
 * @param limit - Number of items per page (default: 20)
 */
export const fetchMantras = async (
  email: string,
  page: number = 1,
  limit: number = 20
): Promise<MantrasResponse> => {
  const params = new URLSearchParams({
    email,
    page: page.toString(),
    limit: limit.toString()
  });

  const response = await fetch(
    `${DEV_API_URL}/mantras?${params}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[MantrasService] Error response:', errorText);
    throw new Error(`Failed to fetch mantras: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Toggle favorite status for a mantra
 * @param token - User's auth token
 * @param mantraId - Mantra _id
 */
export const toggleMantraFavorite = async (
  token: string,
  mantraId: string
): Promise<void> => {
  const url = `${DEV_API_URL}/user/add-favorite/mantra/${mantraId}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[MantrasService] Toggle favorite error response:', errorText);
    throw new Error(`Failed to toggle favorite: ${response.statusText}`);
  }
};

/**
 * Fetch a single mantra track by ID
 * @param mantraId - Mantra _id from API
 * @param email - User's email for premium check
 */
export const fetchMantraTrack = async (
  mantraId: string,
  email: string
): Promise<MantraItem | null> => {
  try {
    // Fetch all mantras and find the one matching mantraId
    const response = await fetchMantras(email, 1, 1000); // Get all mantras
    
    const mantra = response.mantras.find(m => m._id === mantraId);
    return mantra || null;
  } catch (error: any) {
    console.error('[MantrasService] Error fetching mantra track:', error);
    return null;
  }
};

