import axios from 'axios';
import { getStoredAuth } from './authService';

export type NotificationPlatform = 'ios' | 'android' | 'web';

export interface RegisterDeviceResponse {
  ok: boolean;
  deviceId?: string;
}

const getBreathApiUrl = (): string | null => {
  const raw =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL_BREATH) || '';
  const apiUrl = typeof raw === 'string' ? raw.trim() : '';
  if (!apiUrl) {
    return null; // Return null instead of throwing - allows graceful degradation
  }
  try {
    new URL(apiUrl);
    return apiUrl;
  } catch {
    console.warn(`VITE_API_URL_BREATH is not a valid URL: ${apiUrl}`);
    return null;
  }
};

/** Valid FCM tokens contain ':' (base64 parts separated by colon). APNs tokens are hex, no colon. */
export const isFcmToken = (token: unknown): token is string =>
  typeof token === 'string' && token.trim().length > 0 && token.includes(':');

export const registerDevice = async (
  fcmToken: string,
  platform: NotificationPlatform
): Promise<RegisterDeviceResponse> => {
  const token = typeof fcmToken === 'string' ? fcmToken.trim() : '';
  if (!token || !isFcmToken(token)) {
    throw new Error('Valid FCM token is required (must contain ":")');
  }

  const auth = await getStoredAuth();
  if (!auth?.email) {
    throw new Error('User not authenticated');
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    console.warn('VITE_API_URL_BREATH not configured - device registration skipped');
    return { ok: true };
  }

  const url = `${apiUrl}/breath/notifications/register-device`;
  console.log('[Notifications] Register device request', {
    url,
    platform,
    tokenLength: fcmToken.length
  });
  const response = await axios.post<RegisterDeviceResponse>(
    url,
    {
      fcmToken: token,
      platform
    },
    {
      headers: {
        'x-user-email': auth.email,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  console.log('[Notifications] Register device response', {
    status: response.status,
    ok: response.data?.ok,
    deviceId: response.data?.deviceId ? 'present' : 'missing'
  });

  return response.data;
};

export const unregisterUserDevices = async (): Promise<{ ok: boolean; deletedCount: number }> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    throw new Error('User not authenticated');
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    console.warn('VITE_API_URL_BREATH not configured - device unregistration skipped');
    return { ok: true, deletedCount: 0 };
  }

  const response = await axios.post(
    `${apiUrl}/breath/notifications/unregister-devices`,
    {},
    {
      headers: {
        'x-user-email': auth.email,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );
  return response.data;
};

// ============ Simple Notification APIs ============

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: { deeplink?: string };
}

export const saveNotification = async (
  title: string,
  body: string,
  options?: { deeplink?: string }
): Promise<{ ok: boolean; id: string }> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    throw new Error('User not authenticated');
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    // Gracefully handle missing API URL - return success but don't actually save
    console.warn('VITE_API_URL_BREATH not configured - notification not saved');
    return { ok: true, id: 'local-' + Date.now() };
  }

  const payload: { title: string; body: string; deeplink?: string } = { title, body };
  if (typeof options?.deeplink === 'string' && options.deeplink.trim()) {
    payload.deeplink = options.deeplink.trim();
  }

  const response = await axios.post(
    `${apiUrl}/breath/notifications/save`,
    payload,
    {
      headers: {
        'x-user-email': auth.email,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );
  return response.data;
};

export const getNotificationsEnabled = async (): Promise<boolean> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    return true; // default enabled
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    return true; // default enabled when API not configured
  }

  try {
    const response = await axios.get(`${apiUrl}/breath/notifications/preferences`, {
      headers: {
        'x-user-email': auth.email,
      },
      timeout: 10000
    });
    return response.data?.enabled ?? true;
  } catch {
    return true;
  }
};

export const getNotificationPreferences = async (): Promise<{
  enabled?: boolean;
  preferences?: Record<string, any>;
}> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    return { enabled: true };
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    return { enabled: true }; // default when API not configured
  }

  try {
    const response = await axios.get(`${apiUrl}/breath/notifications/preferences`, {
      headers: {
        'x-user-email': auth.email,
      },
      timeout: 10000,
    });
    return {
      enabled: response.data?.enabled,
      preferences: response.data?.preferences,
    };
  } catch {
    return { enabled: true };
  }
};

export const updateNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    throw new Error('User not authenticated');
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    console.warn('VITE_API_URL_BREATH not configured - notification preferences update skipped');
    return;
  }

  await axios.post(
    `${apiUrl}/breath/notifications/preferences`,
    { enabled },
    {
      headers: {
        'x-user-email': auth.email,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );
};

export const updateNotificationPreferences = async (preferences: Record<string, any>): Promise<void> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    throw new Error('User not authenticated');
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    console.warn('VITE_API_URL_BREATH not configured - notification preferences update skipped');
    return;
  }

  await axios.post(
    `${apiUrl}/breath/notifications/preferences`,
    {
      enabled: preferences?.masterEnabled,
      preferences,
    },
    {
      headers: {
        'x-user-email': auth.email,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );
};

export const getNotificationHistory = async (
  limit = 20,
  skip = 0,
  unreadOnly = false
): Promise<{
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    return { notifications: [], total: 0, unreadCount: 0 };
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    return { notifications: [], total: 0, unreadCount: 0 };
  }

  const response = await axios.get(`${apiUrl}/breath/notifications/history`, {
    params: { limit, skip, unreadOnly: unreadOnly ? 'true' : undefined },
    headers: {
      'x-user-email': auth.email,
    },
    timeout: 10000
  });
  return {
    notifications: response.data?.notifications || [],
    total: response.data?.total || 0,
    unreadCount: response.data?.unreadCount ?? 0,
  };
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    return 0;
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    return 0;
  }

  try {
    const response = await axios.get(`${apiUrl}/breath/notifications/unread-count`, {
      headers: {
        'x-user-email': auth.email,
      },
      timeout: 5000
    });
    return response.data?.unreadCount ?? 0;
  } catch {
    return 0;
  }
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    throw new Error('User not authenticated');
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    console.warn('VITE_API_URL_BREATH not configured - mark as read skipped');
    return;
  }

  await axios.put(
    `${apiUrl}/breath/notifications/${id}/read`,
    {},
    {
      headers: {
        'x-user-email': auth.email,
      },
      timeout: 10000
    }
  );
};

export const markAllNotificationsAsRead = async (): Promise<number> => {
  const auth = await getStoredAuth();
  if (!auth?.email) {
    throw new Error('User not authenticated');
  }

  const apiUrl = getBreathApiUrl();
  if (!apiUrl) {
    console.warn('VITE_API_URL_BREATH not configured - mark all as read skipped');
    return 0;
  }

  const response = await axios.put(
    `${apiUrl}/breath/notifications/read-all`,
    {},
    {
      headers: {
        'x-user-email': auth.email,
      },
      timeout: 10000
    }
  );
  return response.data?.count ?? 0;
};

// ============ Prompt Persistence (Cached) ============

let _cachedHasShownPrompt: boolean | undefined = undefined;

export const hasShownNotificationPrompt = async (): Promise<boolean> => {
  if (_cachedHasShownPrompt !== undefined) {
    return _cachedHasShownPrompt;
  }

  try {
    const { preferences } = await getNotificationPreferences();
    _cachedHasShownPrompt = preferences?.hasShownPrompt ?? false;
    return _cachedHasShownPrompt!;
  } catch (err) {
    console.warn('[Notifications] Failed to check prompt status, defaulting to false', err);
    return false;
  }
};

export const markNotificationPromptShown = async (): Promise<void> => {
  _cachedHasShownPrompt = true; // Optimistic update
  try {
    const { preferences: current } = await getNotificationPreferences();
    await updateNotificationPreferences({
      ...(current || {}),
      hasShownPrompt: true,
    });
  } catch (err) {
    console.warn('[Notifications] Failed to persist prompt shown state', err);
  }
};
