import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useMembershipStore } from '../store/membershipStore';
import { useApp } from '../context/AppContext';

/**
 * MembershipSyncManager - Redux-pattern global sync component
 * 
 * Single source of truth for membership synchronization:
 * 1. Syncs on mount (initial check)
 * 2. Listens for app:login (re-sync after login)
 * 3. Listens for membership:refresh (manual refresh requests)
 * 4. Listens for app foreground (native: re-check when app returns)
 * 5. Syncs AppContext membershipStatus to keep compatibility
 * 
 * This component is the ONLY place that triggers membership sync,
 * eliminating race conditions and multiple concurrent fetches.
 */
export const MembershipSyncManager: React.FC = () => {
  const store = useMembershipStore();
  const { setMembershipStatus, setMembershipIsLoading } = useApp();

  // Initial sync on mount
  useEffect(() => {
    store.syncMembership();
  }, []); // Only run once on mount

  // Sync AppContext when store updates (for backward compatibility)
  useEffect(() => {
    setMembershipStatus(store.status);
    setMembershipIsLoading(store.isLoading);
  }, [store.status, store.isLoading, setMembershipStatus, setMembershipIsLoading]);

  // Listen for login event → always force-sync (user identity changed)
  useEffect(() => {
    const onLogin = () => {
      console.log('[MembershipSyncManager] Login detected, force-syncing membership');
      store.forceSyncMembership();
    };
    window.addEventListener('app:login', onLogin);
    return () => window.removeEventListener('app:login', onLogin);
  }, [store]);

  // Listen for menu-open refresh requests → respect TTL (skip if data is fresh)
  useEffect(() => {
    const onRefresh = () => {
      store.refreshMembership();
    };
    window.addEventListener('membership:refresh', onRefresh);
    return () => window.removeEventListener('membership:refresh', onRefresh);
  }, [store]);

  // Native: force-sync when app comes to foreground (user may have purchased)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let removeListener: (() => void) | null = null;

    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive || cancelled) return;
      if (store.isLoading) return;
      console.log('[MembershipSyncManager] App foregrounded, force-syncing membership');
      store.forceSyncMembership();
    }).then((listener) => {
      removeListener = listener.remove;
    });

    return () => {
      cancelled = true;
      if (removeListener) removeListener();
    };
  }, [store]);

  // Web: force-sync when browser tab becomes visible (user may have purchased in another tab)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (store.isLoading) return;
      console.log('[MembershipSyncManager] Tab visible, force-syncing membership');
      store.forceSyncMembership();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [store]);

  // Log state changes for debugging
  useEffect(() => {
    if (!store.isLoading && store.isInitialized) {
      console.debug('[MembershipSyncManager] State synced:', {
        status: store.status,
        hasStoreEntitlement: store.hasStoreEntitlement,
        hasSubscription: !!store.subscription,
      });
    }
  }, [store.status, store.isLoading, store.isInitialized, store.hasStoreEntitlement, store.subscription]);

  return null;
};
