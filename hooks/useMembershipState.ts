import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useApp } from '../context/AppContext';
import { getStoredAuth } from '../services/authService';
import { getSystemeMembershipStatus } from '../services/subscriptionSystemService';
import {
  getDetailedSubscriptionInfo,
  openSubscriptionManagement,
  initializeRevenueCat,
} from '../services/revenuecatService';
import {
  MembershipUIState,
  MembershipStateResult,
  SubscriptionDetails,
  computeMembershipState,
} from '../utils/membershipState';

interface UseMembershipStateResult {
  membershipState: MembershipStateResult;
  isLoading: boolean;
  error: string | null;
  isManaging: boolean;
  refresh: () => Promise<void>;
  handleManageSubscription: () => Promise<void>;
}

/**
 * Custom hook to manage membership state
 * Fetches subscription details from RevenueCat and syncs with backend membership status
 *
 * Priority order for membership validation:
 * 1. Backend Systeme.io tags (web purchase) - syncBackendMembershipStatus
 * 2. RevenueCat entitlement (in-app purchase)
 * 3. Local membershipStatus from AppContext (persisted from 1/2)
 */
export const useMembershipState = (): UseMembershipStateResult => {
  const { membershipStatus, setMembershipStatus } = useApp();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [hasStoreEntitlement, setHasStoreEntitlement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasCheckedBackend, setHasCheckedBackend] = useState(false);
  const [hasCheckedStore, setHasCheckedStore] = useState(false);
  const initRef = useRef(false);
  // Tracks whether the first check has completed. RevenueCat is often not fully
  // initialized on the very first call, so we skip the downgrade on the first check
  // to avoid falsely demoting a Premium user who just launched the app.
  const isFirstCheckRef = useRef(true);

  /**
   * Sync membership status from backend (Systeme.io tags)
   * This handles users who purchased via web and have the subscription flag set
   */
  const syncBackendMembershipStatus = useCallback(async (): Promise<boolean> => {
    try {
      const auth = await getStoredAuth();
      if (!auth) return false;

      if (auth.email) {
        const systemeStatus = await getSystemeMembershipStatus(auth.email);
        console.log('[useMembershipState] Systeme.io tag check:', {
          hasFullAccess: systemeStatus.hasFullAccess,
          contactId: systemeStatus.contactId,
          tags: systemeStatus.tags,
        });

        if (systemeStatus.hasFullAccess) {
          if (membershipStatus !== 'Premium Membership') {
            console.log('[useMembershipState] Syncing Systeme.io tag membership status: Premium');
            setMembershipStatus('Premium Membership');
          }
          return true;
        }
      }

      // We do NOT clear membership status here anymore.
      // Wait for RevenueCat check to confirm "No Entitlement" before downgrading.
      return false;
    } catch (err) {
      console.warn('[useMembershipState] Failed to sync backend membership:', err);
      // On error, assume no backend membership but keep checking store
      return false;
    }
  }, [membershipStatus, setMembershipStatus]);

  const fetchSubscriptionDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, sync backend membership status (Systeme.io)
      const hasBackendMembership = await syncBackendMembershipStatus();
      setHasCheckedBackend(true);

      if (hasBackendMembership) {
        console.log('[useMembershipState] Using backend membership; skipping RevenueCat checks');
        setHasStoreEntitlement(false);
        setSubscription(null);
        setHasCheckedStore(true);
        return;
      }

      // Initialize RevenueCat if needed
      const auth = await getStoredAuth();
      if (auth) {
        try {
          console.log('[useMembershipState] Initializing RevenueCat');
          await initializeRevenueCat(auth.userId, auth.email);
        } catch (initErr) {
          // RevenueCat may not be available on web, continue anyway
          console.warn('[useMembershipState] RevenueCat init failed (may be expected on web):', initErr);
        }
      } else {
        console.log('[useMembershipState] No auth found; skipping RevenueCat checks');
        setHasStoreEntitlement(false);
        setSubscription(null);
        setHasCheckedStore(true);
        
        // Only clear if we are sure there is no auth (and thus no way to verify entitlement)
        if (membershipStatus === 'Premium Membership') {
           setMembershipStatus('Free');
        }
        return;
      }

      const attemptFetch = async () => getDetailedSubscriptionInfo();
      let result = await attemptFetch();

      if (!result.hasEntitlement && Capacitor.isNativePlatform()) {
        console.log('[useMembershipState] RevenueCat has no entitlement; retrying after delay');
        await new Promise((resolve) => setTimeout(resolve, 400));
        result = await attemptFetch();
      }

      // Get RevenueCat subscription details
      console.log('[useMembershipState] RevenueCat entitlement check:', {
        hasEntitlement: result.hasEntitlement,
        subscription: result.subscription,
      });
      setHasStoreEntitlement(result.hasEntitlement);
      setSubscription(result.subscription);
      setHasCheckedStore(true);

      // Final status reconciliation
      if (result.hasEntitlement) {
         if (membershipStatus !== 'Premium Membership') {
             console.log('[useMembershipState] Syncing RevenueCat entitlement to membershipStatus');
             setMembershipStatus('Premium Membership');
         }
      } else {
         // Only downgrade if BOTH backend and store checks failed.
         // Skip the downgrade on the very first check: RevenueCat may not be fully
         // initialized yet on app launch, causing a false "no entitlement" result.
         // Subsequent checks (foreground/visibilitychange) will catch genuine cancellations.
         if (membershipStatus === 'Premium Membership' && !isFirstCheckRef.current) {
             console.log('[useMembershipState] No entitlement found in Backend or Store. Downgrading to Free.');
             setMembershipStatus('Free');
         } else if (membershipStatus === 'Premium Membership' && isFirstCheckRef.current) {
             console.log('[useMembershipState] First check: no RC entitlement yet — deferring downgrade to next check.');
         }
      }

    } catch (err) {
      console.error('[useMembershipState] Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      setHasStoreEntitlement(false);
      setSubscription(null);
      setHasCheckedBackend(true);
      setHasCheckedStore(true);
      // Do NOT downgrade on error - trust existing state
    } finally {
      isFirstCheckRef.current = false;
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [syncBackendMembershipStatus, membershipStatus, setMembershipStatus]);

  // Initialize on mount - only once
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchSubscriptionDetails();
  }, [fetchSubscriptionDetails]);

  // Native: re-check when app comes back to foreground
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let removeListener: (() => void) | null = null;

    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive || cancelled) return;
      if (isLoading) return;
      fetchSubscriptionDetails();
    }).then((listener) => {
      removeListener = listener.remove;
    });

    return () => {
      cancelled = true;
      if (removeListener) {
        removeListener();
      }
    };
  }, [fetchSubscriptionDetails, isLoading]);

  // Web: re-check when the browser tab becomes visible again
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (isLoading) return;
      fetchSubscriptionDetails();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchSubscriptionDetails, isLoading]);

  const handleManageSubscription = useCallback(async () => {
    setIsManaging(true);
    try {
      const success = await openSubscriptionManagement();
      if (!success) {
        console.warn('[useMembershipState] Could not open subscription management');
      }
    } catch (err) {
      console.error('[useMembershipState] Error opening subscription management:', err);
    } finally {
      // Small delay to allow the external app to open
      setTimeout(() => setIsManaging(false), 1000);
    }
  }, []);

  // Only compute state after initialization to avoid flicker
  const membershipState = computeMembershipState(
    membershipStatus,
    hasStoreEntitlement,
    subscription
  );

  // Consider loading until fully initialized
  // This prevents showing plans before we know the real membership status
  const effectiveIsLoading = isLoading || !isInitialized || !hasCheckedBackend || !hasCheckedStore;

  return {
    membershipState,
    isLoading: effectiveIsLoading,
    error,
    isManaging,
    refresh: fetchSubscriptionDetails,
    handleManageSubscription,
  };
};

/**
 * Helper to check if user should see purchase options
 */
export const shouldShowPurchaseOptions = (state: MembershipUIState): boolean => {
  return state === 'NOT_SUBSCRIBED';
};

/**
 * Helper to check if user has active subscription (any type)
 */
export const hasActiveSubscription = (state: MembershipUIState): boolean => {
  return (
    state === 'SUBSCRIBED_STORE_ACTIVE' ||
    state === 'SUBSCRIBED_STORE_CANCELED_BUT_ACTIVE' ||
    state === 'SUBSCRIBED_WEB_ONLY' ||
    state === 'CONFLICT'
  );
};
