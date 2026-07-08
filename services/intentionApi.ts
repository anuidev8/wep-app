import axios from 'axios';
import { getStoredAuth, getBreathApiUrl } from './authService';

export interface Intention {
  id: string;
  date: string;
  content: string;
  source: string;
}

export interface IntentionHistoryResponse {
  entries: Intention[];
  todayCompleted: boolean;
}

/**
 * Get headers for intention API requests
 * Includes 'x-user-email' and 'x-user-timezone'
 */
const getHeaders = async (): Promise<Record<string, string>> => {
    const auth = await getStoredAuth();
    if (!auth?.email) throw new Error('User email not found');
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    
    return {
        'x-user-email': auth.email,
        'x-user-timezone': timezone,
        'Content-Type': 'application/json',
    };
};

/**
 * Get intention history
 */
export const getIntentionHistory = async (): Promise<IntentionHistoryResponse> => {
  try {
    const apiUrl = getBreathApiUrl();
    const headers = await getHeaders();
    const response = await axios.get<IntentionHistoryResponse>(`${apiUrl}/breath/intention/history`, { headers });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch intention history:', error);
    throw error;
  }
};

/**
 * Get today's intention
 * @param date Optional date string YYYY-MM-DD
 */
export const getTodayIntention = async (date?: string): Promise<Intention | null> => {
  try {
    const apiUrl = getBreathApiUrl();
    const headers = await getHeaders();
    const params = date ? { date } : {};
    const response = await axios.get<Intention | null>(`${apiUrl}/breath/intention/today`, { 
        params,
        headers 
    });
    return response.data;
  } catch (error) {
    // If 404 or other error, return null to indicate no intention found
    // (unless it's a real network error, but for "not found" flow we usually want null)
    console.error('Failed to fetch today\'s intention:', error);
    return null;
  }
};

/**
 * Create a new intention
 */
export const createIntention = async (content: string, date?: string, source: string = 'manual'): Promise<Intention> => {
  try {
    const apiUrl = getBreathApiUrl();
    const headers = await getHeaders();
    
    // Include timezone in body for strict validation if needed by backend
    const timezone = headers['x-user-timezone']; 

    const response = await axios.post<Intention>(`${apiUrl}/breath/intention`, {
      content,
      date,
      source,
      timezone
    }, { headers });
    return response.data;
  } catch (error: any) {
    console.error('Failed to create intention:', error);
    if (error.response?.status === 409) {
      throw new Error('Intention already set for today');
    }
    throw error;
  }
};

/**
 * Delete an intention
 */
export const deleteIntention = async (id: string): Promise<void> => {
  try {
    const apiUrl = getBreathApiUrl();
    const headers = await getHeaders();
    await axios.delete(`${apiUrl}/breath/intention/${id}`, { headers });
  } catch (error) {
    console.error('Failed to delete intention:', error);
    throw error;
  }
};
