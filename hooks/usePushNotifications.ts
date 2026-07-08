import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { initializeCapacitor } from '../services/capacitorInit';
import { registerDevice, saveNotification, getNotificationsEnabled, isFcmToken, type NotificationPlatform } from '../services/notificationsService';
import { getStoredAuth } from '../services/authService';
import { dispatchNotificationUpdated, NOTIFICATION_UNREGISTERED_EVENT } from '../utils/notificationEvents';

export interface PushNotificationState {
  token: string | null;
  permission: 'prompt' | 'granted' | 'denied' | 'unknown';
}

interface PendingNotificationItem {
  key: string;
  title: string;
  body: string;
  receivedAt: string;
}

const PENDING_NOTIFICATIONS_KEY = 'breathAppPendingNotifications';
const MAX_PENDING_NOTIFICATIONS = 50;

/**
 * Push notifications: permission, token, and backend device registration.
 * Strategy:
 * - First time: on native init we request permission, then register with FCM/APNs;
 *   when we get a token we call POST /breath/notifications/register-device (once auth is available).
 * - Token change: when the 'registration' event fires with a new token we call register-device again.
 * - Late login: when app comes to foreground we retry register-device if we have a stored token (so login-after-launch still registers).
 */
export const usePushNotifications = (
  onToken?: (token: string) => void
): PushNotificationState => {
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    permission: 'unknown'
  });
  const listenersAttached = useRef(false);
  const lastSentToken = useRef<string | null>(null);
  const pendingToken = useRef<string | null>(null);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const channelReady = useRef(false);
  const recentNotificationKeys = useRef<Set<string>>(new Set());
  const registerDeviceIfNeededRef = useRef<(token: string) => Promise<void>>(() => Promise.resolve());
  const appListenerRemoveRef = useRef<(() => void) | null>(null);

  const getStoredToken = async (): Promise<string | null> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: 'breathAppFcmToken' });
        if (value && isFcmToken(value)) {
          return value;
        }
        // On iOS, also try without the prefix (for backward compatibility)
        console.log('[PushNotifications] Stored token from Preferences:', value ? 'exists' : 'null');
      }
    } catch (err) {
      console.warn('[PushNotifications] Failed to read stored token', err);
    }

    try {
      const localToken = localStorage.getItem('breathAppFcmToken');
      if (localToken && isFcmToken(localToken)) {
        return localToken;
      }
    } catch (err) {
      console.warn('[PushNotifications] Failed to read local token', err);
    }
    return null;
  };

  const setStoredToken = async (token: string) => {
    // Only store valid FCM tokens
    if (!isFcmToken(token)) {
      console.log('[PushNotifications] Skipping storage of non-FCM token');
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'breathAppFcmToken', value: token });
        console.log('[PushNotifications] Stored FCM token in Preferences');
      }
    } catch (err) {
      console.warn('[PushNotifications] Failed to store native token', err);
    }

    try {
      localStorage.setItem('breathAppFcmToken', token);
    } catch (err) {
      console.warn('[PushNotifications] Failed to store token in localStorage', err);
    }
  };

  const loadPendingNotifications = async (): Promise<PendingNotificationItem[]> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: PENDING_NOTIFICATIONS_KEY });
        if (value) {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        }
      }
    } catch (err) {
      console.warn('[PushNotifications] Failed to read pending notifications', err);
    }

    try {
      const value = localStorage.getItem(PENDING_NOTIFICATIONS_KEY);
      if (value) {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.warn('[PushNotifications] Failed to read pending notifications from localStorage', err);
    }

    return [];
  };

  const setPendingNotifications = async (items: PendingNotificationItem[]) => {
    const payload = JSON.stringify(items);
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: PENDING_NOTIFICATIONS_KEY, value: payload });
      }
    } catch (err) {
      console.warn('[PushNotifications] Failed to store pending notifications', err);
    }

    try {
      localStorage.setItem(PENDING_NOTIFICATIONS_KEY, payload);
    } catch (err) {
      console.warn('[PushNotifications] Failed to store pending notifications in localStorage', err);
    }
  };

  const makeNotificationKey = (title: string, body: string, id?: string) => {
    const safeId = typeof id === 'string' && id.trim() ? id.trim() : '';
    if (safeId) {
      return `id:${safeId}`;
    }
    return `payload:${title.trim()}|${body.trim()}`;
  };

  const enqueuePendingNotification = async (item: PendingNotificationItem) => {
    const pending = await loadPendingNotifications();
    if (pending.some(existing => existing.key === item.key)) {
      return;
    }
    const next = [item, ...pending].slice(0, MAX_PENDING_NOTIFICATIONS);
    await setPendingNotifications(next);
  };

  const flushPendingNotifications = async () => {
    const auth = await getStoredAuth();
    if (!auth?.email) {
      return;
    }

    const enabled = await getNotificationsEnabled();
    if (!enabled) {
      await setPendingNotifications([]);
      return;
    }

    const pending = await loadPendingNotifications();
    if (!pending.length) {
      return;
    }

    const remaining: PendingNotificationItem[] = [];
    let savedAny = false;

    for (const item of pending) {
      try {
        await saveNotification(item.title, item.body);
        savedAny = true;
      } catch (err) {
        remaining.push(item);
        console.warn('[PushNotifications] Failed to save pending notification:', err);
      }
    }

    await setPendingNotifications(remaining);

    if (savedAny) {
      dispatchNotificationUpdated();
    }
  };

  const saveOrQueueNotification = async (notification: any, source: 'received' | 'tap') => {
    const title = notification.title || notification?.data?.title || 'Notification';
    const body = notification.body || notification?.data?.body || '';
    const notificationId =
      notification.id ||
      notification?.data?.id ||
      notification?.data?.notificationId ||
      notification?.data?.messageId;
    const key = makeNotificationKey(title, body, notificationId);

    if (recentNotificationKeys.current.has(key)) {
      return;
    }
    recentNotificationKeys.current.add(key);
    if (recentNotificationKeys.current.size > 200) {
      recentNotificationKeys.current.clear();
    }

    const enabled = await getNotificationsEnabled();
    if (!enabled) {
      console.log('[PushNotifications] Notifications disabled, skipping save');
      return;
    }

    const auth = await getStoredAuth();
    if (!auth?.email) {
      await enqueuePendingNotification({
        key,
        title,
        body,
        receivedAt: new Date().toISOString(),
      });
      console.log('[PushNotifications] Queued notification until auth is available');
      return;
    }

    try {
      await saveNotification(title, body);
      console.log(`[PushNotifications] Notification saved to history (${source})`);
      dispatchNotificationUpdated();
    } catch (err) {
      console.warn('[PushNotifications] Failed to save notification, queueing:', err);
      await enqueuePendingNotification({
        key,
        title,
        body,
        receivedAt: new Date().toISOString(),
      });
    }
  };

  // Wait for FCM token on iOS (polls for up to 10 seconds)
  const waitForFcmToken = async (maxAttempts = 10): Promise<string | null> => {
    for (let i = 0; i < maxAttempts; i++) {
      const storedToken = await getStoredToken();
      if (storedToken && isFcmToken(storedToken)) {
        console.log('[PushNotifications] iOS FCM token found after', i + 1, 'attempts');
        return storedToken;
      }
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.warn('[PushNotifications] iOS FCM token not found after', maxAttempts, 'attempts');
    return null;
  };

  const resolveFcmToken = async (token: string, platform: NotificationPlatform) => {
    // On Android, registration event gives FCM token; validate before use
    if (platform !== 'ios') {
      return isFcmToken(token) ? token : null;
    }

    // On iOS, check if the provided token is already FCM format
    if (isFcmToken(token)) {
      console.log('[PushNotifications] iOS: Token is already FCM format');
      return token;
    }

    // iOS: The registration event gives APNs token, FCM token is stored separately
    console.log('[PushNotifications] iOS: Got APNs token, waiting for FCM token...');

    // First check if we already have FCM token stored
    const storedToken = await getStoredToken();
    if (storedToken && isFcmToken(storedToken)) {
      console.log('[PushNotifications] iOS: Using stored FCM token');
      return storedToken;
    }

    // Wait for FCM token to be stored by native side
    const fcmToken = await waitForFcmToken(10);
    return fcmToken;
  };

  const scheduleRetry = (token: string) => {
    pendingToken.current = token;
    if (retryTimeout.current || retryCount.current >= 6) {
      return;
    }
    retryTimeout.current = setTimeout(async () => {
      retryTimeout.current = null;
      retryCount.current += 1;
      if (pendingToken.current) {
        await registerDeviceIfNeeded(pendingToken.current);
      }
    }, 5000);
  };

  const registerDeviceIfNeeded = async (token: string) => {
    if (!token || typeof token !== 'string') {
      console.log('[PushNotifications] Invalid token, skipping register');
      return;
    }
    const platform = Capacitor.getPlatform() as NotificationPlatform;
    const fcmToken = await resolveFcmToken(token, platform);
    if (!fcmToken) {
      console.log('[PushNotifications] FCM token not available yet');
      scheduleRetry(token);
      return;
    }

    // Only skip if WE have already registered this token with backend.
    // getStoredToken can return native-stored token before we ever registered – don't use it here.
    if (lastSentToken.current === fcmToken) {
      console.log('[PushNotifications] Token already registered, skipping');
      return;
    }

    const auth = await getStoredAuth();
    if (!auth?.email) {
      console.log('[PushNotifications] No auth yet, will retry register');
      scheduleRetry(fcmToken);
      return;
    }

    try {
      await registerDevice(fcmToken, platform);
      lastSentToken.current = fcmToken;
      await setStoredToken(fcmToken);
      pendingToken.current = null;
      retryCount.current = 0;
      console.log('[PushNotifications] Device registered');
    } catch (err) {
      console.warn('[PushNotifications] Device registration failed', err);
      scheduleRetry(fcmToken);
    }
  };

  registerDeviceIfNeededRef.current = registerDeviceIfNeeded;

  useEffect(() => {
    let cancelled = false;

    const register = async () => {
      await initializeCapacitor();

      if (!Capacitor.isNativePlatform()) {
        return;
      }

       if (!channelReady.current && Capacitor.getPlatform() === 'android') {
         try {
           await PushNotifications.createChannel({
             id: 'default',
             name: 'General',
             description: 'General notifications',
             importance: 5,
             visibility: 1,
             sound: 'default',
             vibration: true,
           });
           channelReady.current = true;
           console.log('[PushNotifications] Android channel created');
         } catch (err) {
           console.warn('[PushNotifications] Failed to create Android channel', err);
         }
       }

      try {
        const permissionStatus = await PushNotifications.checkPermissions();

        if (cancelled) return;

        setState(prev => ({
          ...prev,
          permission: permissionStatus.receive || 'unknown'
        }));

        await flushPendingNotifications();

        if (permissionStatus.receive !== 'granted') {
          return;
        }

        const enabled = await getNotificationsEnabled();
        if (!enabled) {
          console.log('[PushNotifications] Notifications disabled in app – unregistering');
          await PushNotifications.unregister();
          return;
        }

        const existingToken = await getStoredToken();
        if (existingToken) {
          await registerDeviceIfNeeded(existingToken);
        }
        await PushNotifications.register();
      } catch (err) {
        console.error('[PushNotifications] Register failed:', err);
      }
    };

    const attachListeners = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }
      if (listenersAttached.current) return;
      listenersAttached.current = true;

      await PushNotifications.addListener('registration', async (token) => {
        if (cancelled) return;
        setState(prev => ({ ...prev, token: token.value }));
        if (onToken) onToken(token.value);
        console.log('[PushNotifications] Token:', token.value);

        await registerDeviceIfNeeded(token.value);
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[PushNotifications] Registration error:', error);
      });

      await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('[PushNotifications] Received:', notification);
        await saveOrQueueNotification(notification, 'received');
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
        console.log('[PushNotifications] Action performed:', action);
        // Save notification when user taps (catches background/killed + Firebase Console sends)
        const n = action.notification;
        if (!n) return;
        const deeplink = n?.data?.deeplink;
        if (typeof deeplink === 'string' && deeplink.trim()) {
          const normalized = deeplink.startsWith('#') ? deeplink : `#${deeplink}`;
          window.location.hash = normalized;
        }
        await saveOrQueueNotification(n, 'tap');
      });
    };

    register();
    attachListeners();

    const onUnregistered = () => {
      lastSentToken.current = null;
      console.log('[PushNotifications] Cleared lastSentToken after unregister');
    };
    window.addEventListener(NOTIFICATION_UNREGISTERED_EVENT, onUnregistered);

    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive || cancelled) return;
        
        // Clear native badge on resume
        try {
          await PushNotifications.removeAllDeliveredNotifications();
        } catch (err) {
          console.warn('[PushNotifications] Failed to clear delivered notifications', err);
        }

        const enabled = await getNotificationsEnabled();
        if (!enabled) return;
        await flushPendingNotifications();
        const stored = await getStoredToken();
        if (stored) registerDeviceIfNeededRef.current(stored);
        dispatchNotificationUpdated();
      }).then((listener) => {
        appListenerRemoveRef.current = listener.remove;
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATION_UNREGISTERED_EVENT, onUnregistered);

      // On web, the PushNotifications plugin is not implemented; avoid calling
      // removeAllListeners there to prevent unhandled rejections.
      if (Capacitor.isNativePlatform()) {
        try {
          PushNotifications.removeAllListeners();
        } catch (err) {
          console.warn('[PushNotifications] Failed to remove listeners during cleanup', err);
        }
        const remove = appListenerRemoveRef.current;
        if (remove) {
          remove();
          appListenerRemoveRef.current = null;
        }
      }
    };
  }, [onToken]);

  return state;
};
