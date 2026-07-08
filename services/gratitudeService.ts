import { GratitudeEntry } from '../types';
import { getBreathApiUrl } from './authService';


export interface GratitudeEntriesResponse {
  entries: GratitudeEntry[];
  streak: number;
  todayCompleted: boolean;
}

const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

/**
 * Fetch all gratitude entries
 */
export const fetchGratitudeEntries = async (email: string): Promise<GratitudeEntriesResponse> => {
  const timezone = getUserTimezone();
  const apiUrl = getBreathApiUrl();
  const response = await fetch(`${apiUrl}/breath/gratitude/entries`, {
    method: 'GET',
    headers: {
      'x-user-email': email,
      'x-user-timezone': timezone,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch gratitude entries: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get today's gratitude entry status
 */
export const fetchTodayGratitudeStatus = async (email: string): Promise<{ completed: boolean; entry?: GratitudeEntry }> => {
  const timezone = getUserTimezone();
  const apiUrl = getBreathApiUrl();
  const response = await fetch(`${apiUrl}/breath/gratitude/today`, {
    method: 'GET',
    headers: {
      'x-user-email': email,
      'x-user-timezone': timezone,
    },
  });

  if (response.status === 404) {
    return { completed: false };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch today's gratitude status: ${response.statusText}`);
  }

  const entry = await response.json();
  return { completed: !!entry, entry };
};

/**
 * Create a new gratitude entry
 */
export const createGratitudeEntry = async (email: string, items: string[]): Promise<GratitudeEntry> => {
  const timezone = getUserTimezone();
  const apiUrl = getBreathApiUrl();
  const response = await fetch(`${apiUrl}/breath/gratitude/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': email,
    },
    body: JSON.stringify({
      items,
      timezone, // Pass timezone in body for strict validation
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Check for "already completed" error
    if (response.status === 400 && errorText.includes('already completed')) {
      throw new Error('You have already completed your gratitude journal for today.');
    }
    throw new Error(`Failed to create gratitude entry: ${errorText}`);
  }

  return response.json();
};

/**
 * Delete a gratitude entry
 */
export const deleteGratitudeEntryApi = async (email: string, id: string): Promise<void> => {
  const apiUrl = getBreathApiUrl();
  const response = await fetch(`${apiUrl}/breath/gratitude/entries/${id}`, {
    method: 'DELETE',
    headers: {
      'x-user-email': email,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete gratitude entry: ${response.statusText}`);
  }
};
