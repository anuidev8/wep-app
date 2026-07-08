import axios from 'axios';
import { getStoredAuth, getBreathApiUrl } from './authService';

export interface HoroscopeCheckResponse {
  allowed: boolean;
  localDate: string;
  message?: string;
}

export interface HoroscopeStoreResponse {
  localDate?: string;
  userTimezone?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface HoroscopeLatestResponse {
  localDate?: string;
  userTimezone?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

const getHeaders = async (): Promise<Record<string, string>> => {
  const auth = await getStoredAuth();
  if (!auth?.email) throw new Error('User email not found');
  return {
    'x-user-email': auth.email,
    'Content-Type': 'application/json',
  };
};

export const checkDailyHoroscope = async (userTimezone: string): Promise<HoroscopeCheckResponse> => {
  const apiUrl = getBreathApiUrl();
  const headers = await getHeaders();
  const response = await axios.post<HoroscopeCheckResponse>(
    `${apiUrl}/horoscope/check`,
    { userTimezone },
    { headers }
  );
  return response.data;
};

export const storeDailyHoroscope = async (
  content: string,
  userTimezone: string
): Promise<HoroscopeStoreResponse> => {
  const apiUrl = getBreathApiUrl();
  const headers = await getHeaders();
  const response = await axios.post<HoroscopeStoreResponse>(
    `${apiUrl}/horoscope/store`,
    { content, userTimezone },
    { headers }
  );
  return response.data;
};

export const getLatestHoroscope = async (): Promise<HoroscopeLatestResponse | null> => {
  const apiUrl = getBreathApiUrl();
  const headers = await getHeaders();
  const response = await axios.get<HoroscopeLatestResponse | null>(
    `${apiUrl}/horoscope/latest`,
    { headers }
  );
  return response.data;
};
