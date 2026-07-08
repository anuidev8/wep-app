import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, AlertCircle, Sun, BookOpen, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { useApp } from '../context/AppContext';
import {
  getNotificationHistory,
  getNotificationPreferences,
  getNotificationsEnabled,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationPreferences,
  updateNotificationsEnabled,
  unregisterUserDevices,
  type NotificationItem,
} from '../services/notificationsService';
import { resolveDeeplinkFromNotification } from '../utils/notificationDeeplinks';
import { NOTIFICATION_UPDATED_EVENT, dispatchNotificationUpdated, dispatchNotificationUnregistered } from '../utils/notificationEvents';

const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { notificationPrefs, updateNotificationPrefs } = useApp();
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  // Initialize from context (localStorage) to avoid flicker when returning to page after disabling
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => notificationPrefs.masterEnabled ?? true
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const mergePreferences = (base: typeof notificationPrefs, incoming: Partial<typeof notificationPrefs>) => ({
    ...base,
    ...incoming,
    morningRitual: { ...base.morningRitual, ...(incoming.morningRitual || {}) },
    eveningWindDown: { ...base.eveningWindDown, ...(incoming.eveningWindDown || {}) },
    courseReminders: { ...base.courseReminders, ...(incoming.courseReminders || {}) },
    newReleases: { ...base.newReleases, ...(incoming.newReleases || {}) },
  });

  const persistPreferences = async (nextPrefs: typeof notificationPrefs) => {
    try {
      await updateNotificationPreferences(nextPrefs);
    } catch (err) {
      console.warn('[Notifications] Failed to sync notification preferences:', err);
    }
  };

  const mapPermission = (receive?: string): 'default' | 'granted' | 'denied' => {
    if (receive === 'granted' || receive === 'denied') {
      return receive;
    }
    return 'default';
  };

  const syncPermissionState = async () => {
    if (Capacitor.isNativePlatform()) {
      const status = await PushNotifications.checkPermissions();
      const mapped = mapPermission(status.receive);
      setPermissionStatus(mapped);
      updateNotificationPrefs(prev => ({ ...prev, hasPermission: status.receive === 'granted' }));
      return;
    }

    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
      updateNotificationPrefs(prev => ({ ...prev, hasPermission: Notification.permission === 'granted' }));
    }
  };

  const openDeviceSettings = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const appPlugin = (Capacitor as any).Plugins?.App || (window as any).Capacitor?.Plugins?.App;
        if (appPlugin?.openUrl) {
          await appPlugin.openUrl({ url: 'app-settings:' });
          return;
        }
      } catch (err) {
        console.warn('[Notifications] Failed to open settings:', err);
      }
    }
    alert('Please enable notifications in your device settings:\n\nSettings > Apps > School of Breath > Notifications');
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      const status = await PushNotifications.requestPermissions();
      const mapped = mapPermission(status.receive);
      setPermissionStatus(mapped);
      updateNotificationPrefs(prev => ({ ...prev, hasPermission: status.receive === 'granted' }));
      if (status.receive === 'granted') {
        await PushNotifications.register();
      }
      return status.receive === 'granted';
    }

    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      updateNotificationPrefs(prev => ({ ...prev, hasPermission: permission === 'granted' }));
      return permission === 'granted';
    }

    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }

    return false;
  };

  const fetchNotifications = async (enabled: boolean, unreadOnly = false) => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const result = await getNotificationHistory(50, 0, unreadOnly);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount ?? 0);
    } catch (err) {
      console.warn('[Notifications] Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEnabledStatus = async () => {
    try {
      const result = await getNotificationPreferences();
      const enabled = typeof result.enabled === 'boolean' ? result.enabled : await getNotificationsEnabled();
      setNotificationsEnabled(enabled);
      if (result.preferences) {
        const merged = mergePreferences(notificationPrefs, result.preferences);
        updateNotificationPrefs(merged);
      } else if (notificationPrefs.masterEnabled !== enabled) {
        updateNotificationPrefs(prev => ({ ...prev, masterEnabled: enabled }));
      }
      await fetchNotifications(enabled, filter === 'unread');
    } catch (err) {
      console.warn('[Notifications] Failed to load enabled status:', err);
    }
  };

  useEffect(() => {
    syncPermissionState();
    loadEnabledStatus();
  }, []);

  const refreshList = useCallback(async () => {
    if (!notificationsEnabled) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const result = await getNotificationHistory(50, 0, filter === 'unread');
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount ?? 0);
    } catch (err) {
      console.warn('[Notifications] Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [notificationsEnabled, filter]);

  useEffect(() => {
    const handler = () => refreshList();
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_UPDATED_EVENT, handler);
  }, [refreshList]);

  const toggleNotifications = async () => {
    const newEnabled = !notificationsEnabled;

    if (newEnabled) {
      const granted = await requestPermission();
      if (!granted) {
        if (permissionStatus === 'denied') {
          await openDeviceSettings();
        }
        setNotificationsEnabled(false);
        updateNotificationPrefs(prev => ({ ...prev, masterEnabled: false }));
        return;
      }
    }

    setNotificationsEnabled(newEnabled);
    const nextPrefs = { ...notificationPrefs, masterEnabled: newEnabled };
    updateNotificationPrefs(nextPrefs);

    try {
      await updateNotificationsEnabled(newEnabled);
      await persistPreferences({ ...nextPrefs, masterEnabled: newEnabled });
      console.log('[Notifications] Synced enabled status to backend:', newEnabled);

      if (!newEnabled && Capacitor.isNativePlatform()) {
        await PushNotifications.unregister();
        try {
          await unregisterUserDevices();
        } catch (e) {
          console.warn('[Notifications] Failed to unregister devices from backend:', e);
        }
        await Preferences.remove({ key: 'breathAppFcmToken' });
        try {
          localStorage.removeItem('breathAppFcmToken');
        } catch {
          /* ignore */
        }
        dispatchNotificationUnregistered();
        console.log('[Notifications] Unregistered from push – device will not receive notifications');
      }
    } catch (err) {
      console.warn('[Notifications] Failed to sync enabled status:', err);
    }

    await fetchNotifications(newEnabled, filter === 'unread');
  };

  const handleFilterChange = (f: 'all' | 'unread') => {
    setFilter(f);
    fetchNotifications(notificationsEnabled, f === 'unread');
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      dispatchNotificationUpdated();
    } catch (err) {
      console.warn('[Notifications] Failed to mark all as read:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      dispatchNotificationUpdated();
    } catch (err) {
      console.warn('[Notifications] Failed to mark as read:', err);
    }
  };

  // Simple per-channel toggles
  const morningEnabled = notificationPrefs.morningRitual?.enabled ?? false;
  const eveningEnabled = notificationPrefs.eveningWindDown?.enabled ?? false;
  const courseRemindersEnabled = notificationPrefs.courseReminders?.enabled ?? false;
  const newReleasesEnabled = notificationPrefs.newReleases?.enabled ?? false;

  const toggleMorning = async () => {
    if (!notificationsEnabled) return;
    const nextPrefs = {
      ...notificationPrefs,
      morningRitual: {
        ...notificationPrefs.morningRitual,
        enabled: !notificationPrefs.morningRitual?.enabled,
        time: notificationPrefs.morningRitual?.time || '07:00',
      },
    };
    updateNotificationPrefs(nextPrefs);
    await persistPreferences(nextPrefs);
  };

  const toggleEvening = async () => {
    if (!notificationsEnabled) return;
    const nextPrefs = {
      ...notificationPrefs,
      eveningWindDown: {
        ...notificationPrefs.eveningWindDown,
        enabled: !notificationPrefs.eveningWindDown?.enabled,
      },
    };
    updateNotificationPrefs(nextPrefs);
    await persistPreferences(nextPrefs);
  };

  const toggleCourseReminders = async () => {
    if (!notificationsEnabled) return;
    const nextPrefs = {
      ...notificationPrefs,
      courseReminders: {
        ...notificationPrefs.courseReminders,
        enabled: !notificationPrefs.courseReminders?.enabled,
      },
    };
    updateNotificationPrefs(nextPrefs);
    await persistPreferences(nextPrefs);
  };

  const toggleNewReleases = async () => {
    if (!notificationsEnabled) return;
    const nextPrefs = {
      ...notificationPrefs,
      newReleases: {
        ...notificationPrefs.newReleases,
        enabled: !notificationPrefs.newReleases?.enabled,
      },
    };
    updateNotificationPrefs(nextPrefs);
    await persistPreferences(nextPrefs);
  };

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase pb-32 animate-fade-in">
      <div className="bg-gradient-peacock pb-8 rounded-b-[40px] relative z-0 shadow-xl dark:shadow-none overflow-hidden transition-all duration-500">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent pointer-none"></div>

        <div className="pt-[calc(env(safe-area-inset-top,0px)+4rem)] px-6 flex items-center gap-4 mb-6 relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/5 shadow-lg active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold text-white leading-tight">
              Notifications
            </h1>
            <p className="text-brand-light text-sm opacity-90 mt-1">Manage notifications and view history</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-8 space-y-6 pb-8">
        {permissionStatus === 'denied' && (
          <div className="bg-red-500/10 border-2 border-red-500/30 p-5 rounded-[28px]">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-base text-red-500 mb-1">Notifications Disabled</h3>
                <p className="text-sm text-red-500/80 mb-3">
                  Notifications are disabled in your device settings. Enable them to receive reminders.
                </p>
                <button
                  onClick={openDeviceSettings}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-500 rounded-xl font-bold text-sm hover:bg-red-500/30 transition-colors"
                >
                  Open Device Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {permissionStatus === 'default' && !notificationPrefs.hasPermission && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 p-5 rounded-[28px]">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-base text-amber-500 mb-1">Enable Notifications</h3>
                <p className="text-sm text-amber-500/80 mb-3">
                  Allow notifications to receive mindful reminders and updates.
                </p>
                <button
                  onClick={requestPermission}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors active:scale-95"
                >
                  Allow Notifications
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-brand-darkSurface p-5 rounded-[28px] border border-brand-light dark:border-brand-darkBorder shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center">
                <Bell size={24} className="text-brand-gold" />
              </div>
              <div>
                <h3 className="font-bold text-base dark:text-white">Enable Notifications</h3>
                <p className="text-xs text-brand-medium/60 dark:text-brand-darkTextMuted">
                  Master switch for all notifications
                </p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                notificationsEnabled && notificationPrefs.hasPermission
                  ? 'bg-brand-gold'
                  : 'bg-brand-light dark:bg-white/10'
              } ${!notificationPrefs.hasPermission ? 'opacity-50' : ''}`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                  notificationsEnabled && notificationPrefs.hasPermission
                    ? 'translate-x-6'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-bold dark:text-white">History</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full bg-brand-light/20 dark:bg-white/10 p-1">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    filter === 'all'
                      ? 'bg-white dark:bg-brand-darkSurface text-brand-dark dark:text-white shadow-sm'
                      : 'text-brand-medium/70 dark:text-brand-darkTextMuted'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleFilterChange('unread')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    filter === 'unread'
                      ? 'bg-white dark:bg-brand-darkSurface text-brand-dark dark:text-white shadow-sm'
                      : 'text-brand-medium/70 dark:text-brand-darkTextMuted'
                  }`}
                >
                  Unread
                  {unreadCount > 0 && (
                    <span className="min-w-[8px] min-h-[8px] flex items-center justify-center bg-[#24B4AC] text-white text-[10px] rounded-full px-1.5 py-0.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-bold text-brand-gold hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-50">
              <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-bold uppercase tracking-[0.3em]">Loading...</p>
            </div>
          ) : !notificationsEnabled ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-30">
              <Bell size={56} strokeWidth={1} className="mb-4" />
              <p className="text-sm font-bold uppercase tracking-[0.3em]">Notifications disabled</p>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  const deeplink = resolveDeeplinkFromNotification(n);
                  if (deeplink) navigate(deeplink);
                  if (!n.isRead) handleMarkAsRead(n.id);
                }}
                className="bg-white dark:bg-brand-darkSurface p-5 rounded-[24px] border border-brand-light dark:border-brand-darkBorder shadow-sm transition-all hover:shadow-md cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-base dark:text-white pr-6">{n.title}</h4>
                  <span className="text-[10px] font-bold text-brand-medium/50 uppercase tracking-tighter shrink-0">
                    {formatTimeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-brand-primary dark:text-brand-darkTextMuted leading-relaxed max-w-[90%]">
                  {n.body}
                </p>
                {!n.isRead && (
                  <div className="mt-3">
                    <span className="inline-block w-2.5 h-2.5 bg-brand-gold rounded-full shadow-[0_0_12px_rgba(212,165,116,0.8)]"></span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-30">
              <Bell size={56} strokeWidth={1} className="mb-4" />
              <p className="text-sm font-bold uppercase tracking-[0.3em]">No notifications yet</p>
            </div>
          )}
        </div>

        {/* Notification Settings Section (simplified) */}
        <div className="space-y-4 mt-8">
          <h2 className="text-base font-bold dark:text-white">Notification Settings</h2>

          {!notificationsEnabled && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold px-4 py-3 rounded-2xl">
              Enable the master switch above to change notification settings.
            </div>
          )}

          {/* Morning Ritual – 7 AM local */}
          <div className={`bg-white dark:bg-brand-darkSurface rounded-[28px] border border-brand-light dark:border-brand-darkBorder shadow-sm ${!notificationsEnabled ? 'opacity-50' : ''}`}>
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <Sun size={24} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-base dark:text-white">Morning Ritual</h3>
                </div>
              </div>
              <button
                onClick={toggleMorning}
                disabled={!notificationsEnabled}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                  morningEnabled ? 'bg-brand-gold' : 'bg-brand-light dark:bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                    morningEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Evening Wind Down */}
          <div className={`bg-white dark:bg-brand-darkSurface rounded-[28px] border border-brand-light dark:border-brand-darkBorder shadow-sm ${!notificationsEnabled ? 'opacity-50' : ''}`}>
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center">
                  <Bell size={24} className="text-brand-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-base dark:text-white">Evening Wind Down</h3>
                </div>
              </div>
              <button
                onClick={toggleEvening}
                disabled={!notificationsEnabled}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                  eveningEnabled ? 'bg-brand-gold' : 'bg-brand-light dark:bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                    eveningEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Course Reminders – minimal, no streaks */}
          <div className={`bg-white dark:bg-brand-darkSurface rounded-[28px] border border-brand-light dark:border-brand-darkBorder shadow-sm ${!notificationsEnabled ? 'opacity-50' : ''}`}>
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <BookOpen size={24} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-base dark:text-white">Course Reminders</h3>
                </div>
              </div>
              <button
                onClick={toggleCourseReminders}
                disabled={!notificationsEnabled}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                  courseRemindersEnabled ? 'bg-brand-gold' : 'bg-brand-light dark:bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                    courseRemindersEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* New Releases – deep link handled via /meditate?tab=guided */}
          <div
            className={`bg-white dark:bg-brand-darkSurface rounded-[28px] border border-brand-light dark:border-brand-darkBorder shadow-sm cursor-pointer ${!notificationsEnabled ? 'opacity-50' : ''}`}
            onClick={() => {
              if (!notificationsEnabled) return;
              navigate('/meditate?tab=guided');
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!notificationsEnabled) return;
                navigate('/meditate?tab=guided');
              }
            }}
          >
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                >
                  <Sparkles size={24} className="text-purple-500" />
                </div>
                <div>
                  <h3 className="font-bold text-base dark:text-white">New Releases</h3>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNewReleases();
                }}
                disabled={!notificationsEnabled}
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                  newReleasesEnabled ? 'bg-brand-gold' : 'bg-brand-light dark:bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                    newReleasesEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
