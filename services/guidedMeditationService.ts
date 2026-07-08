
import { getStoredAuth } from './authService';

const DEV_API_URL = 'https://dev-api-music-iota.vercel.app';

export interface Category {
  _id: string;
  name: string;
  type: string;
  slug: string;
}

export interface MusicTrack {
  _id: string;
  name: string;
  description: string;
  position: number;
  favorites: string[];
  audioFilename: string;
  imageFilename: string;
  categories: Category[];
  isPremium: boolean;
  typeContent: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  /** Duration in seconds - from API or derived */
  duration?: number;
}

export interface GuidedMeditationResponse {
  musicList: MusicTrack[];
  isPremium: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Fetch guided meditation tracks from API
 * @param email - User's email for favorites/premium check
 * @param limit - Number of items per page (default: 20)
 * @param page - Page number (default: 1)
 */
export const fetchGuidedMeditation = async (
  email: string,
  limit: number = 20,
  page: number = 1
): Promise<GuidedMeditationResponse> => {
  const params = new URLSearchParams({
    email,
    limit: limit.toString(),
    page: page.toString()
  });

  try {
    // Get auth token for headers if available
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

    // Use fetch directly since DEV_API_URL is different from apiClient baseURL
    const response = await fetch(
      `${DEV_API_URL}/app/musics/guided-meditation?${params}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch guided meditation: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data) {
      throw new Error('Failed to fetch guided meditation: Invalid response');
    }

    return data;
  } catch (error: any) {
    console.error('[GuidedMeditationService] Error fetching guided meditation:', error);
    
    if (error.message?.includes('404')) {
      throw new Error('Guided meditation endpoint not found. Please check API configuration.');
    }
    
    const message = error.message || 'Failed to fetch guided meditation';
    throw new Error(message);
  }
};

/**
 * Fetch a single guided meditation track by ID
 * @param trackId - Track _id from API
 * @param email - User's email for favorites/premium check
 */
export const fetchGuidedMeditationTrack = async (
  trackId: string,
  email: string
): Promise<MusicTrack | null> => {
  try {
    // Fetch all tracks and find the one matching trackId
    const response = await fetchGuidedMeditation(email, 100, 1);
    const track = response.musicList.find(t => t._id === trackId);
    return track || null;
  } catch (error: any) {
    console.error('[GuidedMeditationService] Error fetching track:', error);
    return null;
  }
};

