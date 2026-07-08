import axios from 'axios';
import { getStoredAuth } from './authService';
import { UserPreferences } from '../types';

const getBreathApiUrl = (): string => {
  const raw =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL_BREATH) || '';
  const apiUrl = typeof raw === 'string' ? raw.trim() : '';
  if (!apiUrl) {
    throw new Error('VITE_API_URL_BREATH environment variable is not set. Please configure your .env file.');
  }
  try {
    new URL(apiUrl);
  } catch {
    throw new Error(`VITE_API_URL_BREATH is not a valid URL: ${apiUrl}`);
  }
  return apiUrl;
};

export const getOnboardingCompletionStatus = async (): Promise<boolean | null> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    return null;
  }

  try {
    const response = await axios.get(`${getBreathApiUrl()}/breath/users/profile`, {
      headers: {
        'x-user-email': auth.email,
      },
      timeout: 10000,
    });
    return Boolean(response.data?.hasCompletedOnboarding);
  } catch (error) {
    console.warn('[Onboarding] Failed to fetch onboarding status', error);
    return null;
  }
};

export const saveOnboardingPreferences = async (preferences: UserPreferences): Promise<void> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    throw new Error('User not authenticated');
  }

  await axios.post(
    `${getBreathApiUrl()}/breath/onboarding`,
    preferences,
    {
      headers: {
        'x-user-email': auth.email,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
};
