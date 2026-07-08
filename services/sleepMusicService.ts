import { getStoredAuth } from './authService';

const DEV_API_URL = 'https://dev-api-music-iota.vercel.app';

export interface MusicTrack {
  _id: string;
  id?: string;
  name: string;
  description: string;
  position: number;
  favorites: string[];
  audioFilename: string;
  imageFilename: string;
  categories: { _id: string; name: string; type: string; slug: string; }[];
  isPremium: boolean;
  typeContent: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface SleepMusicResponse {
  musicList: MusicTrack[];
  isPremium: boolean;
}

/**
 * Fetch sleep music tracks (authenticated users)
 */
export const fetchSleepMusicByCategory = async (
  token: string,
  categoryId: string = ''
): Promise<SleepMusicResponse> => {
  const url = `${DEV_API_URL}/app/musics/category?category=${categoryId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SleepMusicService] Error response:', errorText);
    throw new Error(`Failed to fetch sleep music: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Fetch sleep music preview (guest users)
 */
export const fetchSleepMusicPreview = async (
  categoryId: string = ''
): Promise<SleepMusicResponse> => {
  const url = `${DEV_API_URL}/app/musics/preview?category=${categoryId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SleepMusicService] Preview error response:', errorText);
    throw new Error(`Failed to fetch sleep music preview: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Fetch user's favorite sleep tracks
 */
export const fetchSleepMusicFavorites = async (
  token: string,
  categoryId: string = ''
): Promise<SleepMusicResponse> => {
  const url = `${DEV_API_URL}/app/musics/favorites?category=${categoryId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SleepMusicService] Favorites error response:', errorText);
    throw new Error(`Failed to fetch favorites: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Toggle favorite status for a track
 */
export const toggleSleepMusicFavorite = async (
  token: string,
  musicId: string
): Promise<void> => {
  const url = `${DEV_API_URL}/user/add-favorite/music/${musicId}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SleepMusicService] Toggle favorite error response:', errorText);
    throw new Error(`Failed to toggle favorite: ${response.statusText}`);
  }
};

/**
 * Fetch a single sleep music track by ID
 * @param trackId - Track _id from API
 * @param token - User's auth token (optional for guest)
 */
export const fetchSleepMusicTrack = async (
  trackId: string,
  token?: string
): Promise<MusicTrack | null> => {
  try {
    // Fetch all tracks and find the one matching trackId
    let response: SleepMusicResponse;
    
    if (token) {
      response = await fetchSleepMusicByCategory(token, '');
    } else {
      response = await fetchSleepMusicPreview('');
    }
    
    const track = response.musicList.find(t => t._id === trackId);
    return track || null;
  } catch (error: any) {
    console.error('[SleepMusicService] Error fetching track:', error);
    return null;
  }
};

