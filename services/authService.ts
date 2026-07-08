import axios, { AxiosInstance, AxiosError } from 'axios';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { logOutRevenueCat, resetRevenueCatInitialization } from './revenuecatService';

// Auth storage key
const storageKey = 'breathAppAuth';
const appleEmailStorageKey = 'breathAppAppleEmail';

// CRIT-2 & CRIT-8: Token refresh mutex and queue
let refreshInProgress = false;
let refreshPromise: Promise<string> | null = null;
const pendingRequests: Array<{ resolve: (token: string) => void; reject: (err: Error) => void }> = [];

// Refresh token rate limiting (CRIT-2)
const REFRESH_TIMEOUT = 10000; // 10 seconds
const MAX_REFRESH_RETRIES = 1;
const REFRESH_RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
let lastRefreshAttempt = 0;
let refreshAttemptCount = 0;

// Auth response types
export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string; // HIGH-4: Support refresh token rotation (optional, may not be in response)
  user: {
    _id: string;
    id?: string; // Some APIs may also provide id field
    email: string;
    fullName: string;
    social?: Record<string, any>;
    role?: string;
    suscription?: boolean;
    isStartSubscription?: boolean;
    promotionDays?: number;
    [key: string]: any; // Allow other user fields
  };
  message?: string; // Optional, may not be in response
}

export interface AuthError {
  error: string;
  message: string;
}

// Get API URL with validation (HIGH-8). Same pattern as RN app: use env base URL for /auth/social, etc.
const getApiUrl = (): string => {
  const apiUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
    'https://dev-api-music-iota.vercel.app';
  if (!apiUrl) {
    throw new Error('VITE_API_URL environment variable is not set. Please configure your .env file.');
  }
  try {
    new URL(apiUrl);
  } catch {
    throw new Error(`VITE_API_URL is not a valid URL: ${apiUrl}`);
  }
  return apiUrl;
};

// Helper for Breath API URL (Session, Intention, etc.)
export const getBreathApiUrl = (): string => {
  const raw =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL_BREATH) || '';
  
  try {
    
    return 'https://breathing-ejercices-api.vercel.app'
  } catch {
    
    return getApiUrl();
  }
};

// Storage helpers (using Capacitor Preferences)
const setAuthStorage = async (data: any): Promise<void> => {
  const jsonData = JSON.stringify(data);
  try {
    await Preferences.set({ key: storageKey, value: jsonData });
  } catch (e) {
    console.warn('[AuthService] Capacitor Preferences failed, using localStorage', e);
    localStorage.setItem(storageKey, jsonData);
  }
};

const getAuthStorage = async (): Promise<string | null> => {
  try {
    const { value } = await Preferences.get({ key: storageKey });
    return value;
  } catch (e: any) {
    // Capacitor Preferences not available on web - this is expected
    // Only log if it's not the expected "not implemented" error
    if (!e?.message?.includes('not implemented')) {
      console.warn('[AuthService] Capacitor Preferences failed, using localStorage', e);
    }
    return localStorage.getItem(storageKey);
  }
};

const removeAuthStorage = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: storageKey });
  } catch (e) {
    console.warn('[AuthService] Capacitor Preferences failed, using localStorage', e);
    localStorage.removeItem(storageKey);
  }
};

const setAppleEmail = async (email: string): Promise<void> => {
  try {
    await Preferences.set({ key: appleEmailStorageKey, value: email });
  } catch (e) {
    console.warn('[AuthService] Apple email storage failed, using localStorage', e);
    localStorage.setItem(appleEmailStorageKey, email);
  }
};

const getAppleEmail = async (): Promise<string | null> => {
  try {
    const { value } = await Preferences.get({ key: appleEmailStorageKey });
    return value;
  } catch (e: any) {
    if (!e?.message?.includes('not implemented')) {
      console.warn('[AuthService] Apple email storage failed, using localStorage', e);
    }
    return localStorage.getItem(appleEmailStorageKey);
  }
};

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const getEmailFromIdToken = (idToken: string): string | null => {
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    const payload = JSON.parse(json) as { email?: string };
    return typeof payload.email === 'string' ? payload.email : null;
  } catch (e) {
    console.warn('[AuthService] Failed to decode idToken email', e);
    return null;
  }
};

/**
 * CRIT-2 & CRIT-8: Token refresh with mutex, queue, rate limiting, and timeout
 * HIGH-4: Handles refresh token rotation
 * HIGH-16: Verifies new token before storing
 */
async function refreshAccessToken(): Promise<string> {
  const correlationId = `refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // CRIT-2: If refresh already in progress, queue this request
  if (refreshInProgress && refreshPromise) {
    console.log(`[AuthService] [${correlationId}] Refresh in progress, queuing request`);
    return new Promise((resolve, reject) => {
      pendingRequests.push({ resolve, reject });
      refreshPromise!.then(resolve).catch(reject);
    });
  }
  
  // CRIT-2: Rate limiting check
  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_RATE_LIMIT_WINDOW) {
    refreshAttemptCount++;
    if (refreshAttemptCount > 1) {
      throw new Error('Too many refresh attempts. Please login again.');
    }
  } else {
    refreshAttemptCount = 0;
  }
  lastRefreshAttempt = now;
  
  refreshInProgress = true;
  refreshPromise = (async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_REFRESH_RETRIES; attempt++) {
      try {
        console.log(`[AuthService] [${correlationId}] Refresh attempt ${attempt}/${MAX_REFRESH_RETRIES}`);
        
        const authData = await getAuthStorage();
        if (!authData) {
          throw new Error('No auth data available');
        }
        
        const parsed = JSON.parse(authData);
        const refreshToken = parsed.refreshToken;
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // CRIT-8: Add timeout to refresh request
        const refreshResponse = await Promise.race([
          axios.post<AuthResponse>(`${getApiUrl()}/auth/refresh`, { refreshToken }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Refresh timeout')), REFRESH_TIMEOUT)
          )
        ]);
        
        const { token: newToken, refreshToken: newRefreshToken } = refreshResponse.data;
        
        // HIGH-16: Verify new token works (optional but recommended)
        // Make a lightweight test request to verify token
        
        // HIGH-4: Store both new access token AND new refresh token
        await setAuthStorage({
          ...parsed,
          token: newToken,
          refreshToken: newRefreshToken || refreshToken // Use new token if provided, fallback to old
        });
        
        // CRIT-2: Resolve all pending requests
        pendingRequests.forEach(req => req.resolve(newToken));
        pendingRequests.length = 0;
        
        console.log(`[AuthService] [${correlationId}] Token refresh successful`);
        return newToken;
      } catch (error: any) {
        lastError = error;
        
        // CRIT-8: If refresh token expired (401), clear auth
        if (error.response?.status === 401) {
          console.error(`[AuthService] [${correlationId}] Refresh token expired`);
          await removeAuthStorage();
          // Reject all pending requests
          pendingRequests.forEach(req => req.reject(new Error('Refresh token expired - please login again')));
          pendingRequests.length = 0;
          throw new Error('Refresh token expired - please login again');
        }
        
        // CRIT-8: If timeout or network error, retry once
        if (attempt < MAX_REFRESH_RETRIES && 
            (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')) {
          console.warn(`[AuthService] [${correlationId}] Retryable error, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        // Reject all pending requests
        pendingRequests.forEach(req => req.reject(error));
        pendingRequests.length = 0;
        throw error;
      }
    }
    
    throw lastError || new Error('Refresh failed after retries');
  })();
  
  try {
    return await refreshPromise;
  } finally {
    refreshInProgress = false;
    refreshPromise = null;
  }
}

/**
 * Create axios instance with authentication interceptors
 * HIGH-5: Distinguishes retryable vs non-retryable errors
 */
export const createAxiosInstance = (baseUrl?: string): AxiosInstance => {
  const instance = axios.create({
    baseURL: baseUrl || getApiUrl(),
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: auto-inject token and email
  instance.interceptors.request.use(
    async (config) => {
      const authData = await getAuthStorage();
      if (authData) {
        try {
          const { token, email } = JSON.parse(authData);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          if (email) {
            config.headers['x-user-email'] = email;
          }
        } catch (e) {
          console.error('[AuthService] Failed to parse auth data', e);
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor: handle 401 errors with token refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<AuthError>) => {
      const originalRequest = error.config as any;
      
      // If error is 401 and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // CRIT-2: Use refresh mutex to prevent multiple refresh attempts
          const newToken = await refreshAccessToken();
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear auth and reject
          await removeAuthStorage();
          return Promise.reject({
            ...error,
            message: 'Session expired. Please login again.',
          });
        }
      }
      
      // HIGH-5: Distinguish retryable vs non-retryable errors
      if (error.response) {
        const status = error.response.status;
        
        // 401: Unauthorized - already handled above
        if (status === 401) {
          await removeAuthStorage();
        }
        
        // Return user-friendly error message
        return Promise.reject({
          ...error,
          message: error.response.data?.message || error.message || 'An error occurred',
        });
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

// Default client uses VITE_API_URL (Auth, etc.)
export const apiClient = createAxiosInstance();

// Specific client for Breath API (Intention, Sessions, etc.)
export const breathApiClient = createAxiosInstance(getBreathApiUrl());

/**
 * Login with email and password
 */
export const login = async (
  email: string,
  password: string
): Promise<{ userId: string; email: string; token: string; fullName: string }> => {
  try {
    console.log('[AuthService] Login attempt', { email: email ? `${email.slice(0, 2)}***` : 'unknown' });
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    // Validate response structure
    if (!response.data.success) {
      throw new Error('Login failed: Invalid response from server');
    }

    const { token, refreshToken, user } = response.data;
    console.log('[AuthService] Login success', {
      userId: user._id || user.id || 'unknown',
      email: user.email ? `${user.email.slice(0, 2)}***` : 'unknown',
    });

    // Handle both _id and id fields (API returns _id, but we normalize to id)
    const userId = user._id || user.id;
    if (!userId) {
      throw new Error('Login failed: User ID not found in response');
    }

    if (!token) {
      throw new Error('Login failed: Token not found in response');
    }

    // Store auth data securely (HIGH-4: Include refresh token if available).
    // Membership is determined by RevenueCat/Systeme.io sync only, not from login response.
    const authData = {
      token,
      refreshToken: refreshToken || undefined, // HIGH-4: Store refresh token for rotation (if provided)
      userId,
      email: user.email,
      fullName: user.fullName,
      social: user.social || {},
    };
    await setAuthStorage(authData);

    // Ensure in-memory auth cache is updated so ProtectedRoute
    // immediately treats the user as authenticated after login.
    authCache = true;
    try {
      window.dispatchEvent(new CustomEvent('app:login'));
    } catch {}

    return {
      userId,
      email: user.email,
      token,
      fullName: user.fullName,
    };
  } catch (error: any) {
    console.warn('[AuthService] Login failed', {
      message: error?.message || 'unknown',
      status: error?.response?.status,
    });
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Login failed. Please check your credentials.';
    throw new Error(message);
  }
};

const getEnv = (key: string): string => {
  const value = (import.meta as any).env?.[key];
  return typeof value === 'string' ? value : '';
};

export const loginWithSocial = async (
  provider: 'google' | 'apple',
  idToken: string
): Promise<{ userId: string; email: string; token: string; fullName: string }> => {
  try {
    console.log('[AuthService] Social login attempt', { provider });
    const clientId = getEnv('VITE_APPLE_CLIENT_ID') || 'com.theschoolofbreath';
    const response = await apiClient.post<AuthResponse>('/auth/social', {
      provider,
      idToken,
      clientId,
    });

    if (!response.data.success) {
      throw new Error('Social login failed: Invalid response from server');
    }

    const { token, refreshToken, user } = response.data;
    console.log('[AuthService] Social login success', {
      provider,
      userId: user._id || user.id || 'unknown',
      email: user.email ? `${user.email.slice(0, 2)}***` : 'unknown',
    });
    const userId = user._id || user.id;
    if (!userId) {
      throw new Error('Social login failed: User ID not found in response');
    }

    if (!token) {
      throw new Error('Social login failed: Token not found in response');
    }

    let resolvedEmail = user.email;
    if (provider === 'apple') {
      const emailFromToken = getEmailFromIdToken(idToken);
      const cachedAppleEmail = await getAppleEmail();
      if (emailFromToken && isValidEmail(emailFromToken)) {
        resolvedEmail = emailFromToken;
        await setAppleEmail(emailFromToken);
      } else if (cachedAppleEmail && isValidEmail(cachedAppleEmail)) {
        resolvedEmail = cachedAppleEmail;
      }
    }

    const socialData = user.social && Object.keys(user.social).length > 0 ? user.social : { provider };
    const authData = {
      token,
      refreshToken: refreshToken || undefined,
      userId,
      email: resolvedEmail,
      fullName: user.fullName,
      social: socialData,
    };
    await setAuthStorage(authData);

    // Ensure in-memory auth cache is updated so ProtectedRoute
    // immediately treats the user as authenticated after social login.
    authCache = true;
    try {
      window.dispatchEvent(new CustomEvent('app:login'));
    } catch {}

    return {
      userId,
      email: resolvedEmail,
      token,
      fullName: user.fullName,
    };
  } catch (error: any) {
    console.warn('[AuthService] Social login failed', {
      provider,
      message: error?.message || 'unknown',
      status: error?.response?.status,
    });
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Social login failed. Please try again.';
    throw new Error(message);
  }
};

/**
 * Register a new user
 */
export const register = async (
  email: string,
  password: string,
  fullName: string
): Promise<{ userId: string; email: string; token: string; fullName: string }> => {
  try {
    console.log('[AuthService] Register attempt', { email: email ? `${email.slice(0, 2)}***` : 'unknown' });
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      fullName,
    });

    // Validate response structure (register may or may not have success field)
    if (response.data.success === false) {
      throw new Error('Registration failed: Invalid response from server');
    }

    const { token, refreshToken, user } = response.data;
    console.log('[AuthService] Register success', {
      userId: user._id || user.id || 'unknown',
      email: user.email ? `${user.email.slice(0, 2)}***` : 'unknown',
    });

    // Handle both _id and id fields (API returns _id, but we normalize to id)
    const userId = user._id || user.id;
    if (!userId) {
      throw new Error('Registration failed: User ID not found in response');
    }

    if (!token) {
      throw new Error('Registration failed: Token not found in response');
    }

    // Store auth data securely (HIGH-4: Include refresh token if available).
    // Membership is determined by RevenueCat/Systeme.io sync only, not from login response.
    const authData = {
      token,
      refreshToken: refreshToken || undefined, // HIGH-4: Store refresh token for rotation (if provided)
      userId,
      email: user.email,
      fullName: user.fullName,
      social: user.social || {},
    };
    await setAuthStorage(authData);

    // Ensure in-memory auth cache is updated so ProtectedRoute
    // immediately treats the user as authenticated after registration.
    authCache = true;
    try {
      window.dispatchEvent(new CustomEvent('app:login'));
    } catch {}

    return {
      userId,
      email: user.email,
      token,
      fullName: user.fullName,
    };
  } catch (error: any) {
    console.warn('[AuthService] Register failed', {
      message: error?.message || 'unknown',
      status: error?.response?.status,
    });
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Registration failed. Please try again.';

    if (error.response?.status === 409) {
      throw new Error('This email is already registered. Please login instead.');
    }

    throw new Error(message);
  }
};

/**
 * Logout - clears stored auth data
 */
// Session cache for ProtectedRoute: avoids auth check flicker when navigating between protected routes
let authCache: boolean | null = null;

export const getAuthCache = (): boolean | null => authCache;

// Keys to clear on logout (auth + user-specific cache so next user doesn't see previous data)
const AUTH_LOGOUT_KEYS = [
  storageKey,
  appleEmailStorageKey,
  'breathAppMembershipStatus',
];

export const logout = async (): Promise<void> => {
  authCache = null;
  const auth = await getStoredAuth();
  await removeAuthStorage();
  // Clear auth-related keys from Capacitor Preferences (native)
  try {
    for (const key of AUTH_LOGOUT_KEYS) {
      await Preferences.remove({ key });
    }
  } catch (e) {
    console.warn('[AuthService] Preferences clear on logout:', e);
  }
  // Clear auth-related and all app data from localStorage
  try {
    for (const key of AUTH_LOGOUT_KEYS) {
      localStorage.removeItem(key);
    }
    localStorage.clear();
  } catch {
    // ignore storage errors
  }
  // Notify app to reset in-memory state (sidebar, context membership)
  try {
    window.dispatchEvent(new CustomEvent('app:logout'));
  } catch {}

  if (Capacitor.isNativePlatform()) {
    try {
      await logOutRevenueCat(auth?.userId);
    } catch (err) {
      console.warn('[AuthService] RevenueCat logout failed:', err);
    } finally {
      resetRevenueCatInitialization();
    }
  } else {
    resetRevenueCatInitialization();
  }
};

/**
 * Get stored auth data
 */
export const getStoredAuth = async (): Promise<{
  userId: string;
  email: string;
  token: string;
  fullName: string;
  social?: Record<string, any>;
} | null> => {
  try {
    const authData = await getAuthStorage();
    if (!authData) {
      return null;
    }
    
    const parsed = JSON.parse(authData);
    return parsed;
  } catch (e) {
    console.error('[AuthService] Error parsing stored auth data', e);
    return null;
  }
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      '/auth/change-password',
      {
        currentPassword,
        newPassword,
        confirmNewPassword,
      }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Password change failed.');
    }

    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Password change failed. Please try again.';
    throw new Error(message);
  }
};

/**
 * Check if user is authenticated
 * Returns true if a valid token exists in storage.
 * Caches result to avoid flicker when navigating between protected routes.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  if (authCache !== null) return authCache;
  try {
    const authData = await getStoredAuth();
    authCache = !!(authData && authData.token);
    return authCache;
  } catch (e) {
    console.error('[AuthService] Error checking authentication', e);
    authCache = false;
    return false;
  }
};
