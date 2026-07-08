/**
 * Membership Store - Redux-pattern global state management
 *
 * Single source of truth for membership state across the app.
 * Uses Zustand (lightweight Redux alternative) with Redux Toolkit patterns:
 * - Actions (dispatch-style)
 * - Reducers (immutable state updates)
 * - Selectors (computed state)
 * - Async thunks (side effects)
 *
 * Refresh strategy:
 * - syncMembership()      : always fetches (cold start, login, foreground)
 * - refreshMembership()   : respects TTL — skips if synced within CACHE_TTL_MS
 * - forceSyncMembership() : bypasses TTL (login event, app foreground, tab visible)
 * - reset()               : clears cache on logout so next login always fetches fresh
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getStoredAuth } from '../services/authService';
import { getSystemeMembershipStatus } from '../services/subscriptionSystemService';
import {
  getDetailedSubscriptionInfo,
  initializeRevenueCat,
} from '../services/revenuecatService';
import { Capacitor } from '@capacitor/core';
import type { MembershipStatus } from '../context/AppContext';
import type { SubscriptionDetails, MembershipStateResult } from '../utils/membershipState';
import { computeMembershipState, getBillingPlatform } from '../utils/membershipState';

/** How long a successful sync result is considered fresh (5 minutes). */
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface MembershipState {
  // Core state
  status: MembershipStatus;
  isLoading: boolean;
  error: string | null;
  
  // Subscription details
  subscription: SubscriptionDetails | null;
  hasStoreEntitlement: boolean;
  
  // Sync tracking
  hasCheckedBackend: boolean;
  hasCheckedStore: boolean;
  isInitialized: boolean;
  
  // Actions (Redux-style)
  setStatus: (status: MembershipStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSubscription: (subscription: SubscriptionDetails | null) => void;
  setHasStoreEntitlement: (has: boolean) => void;
  setHasCheckedBackend: (checked: boolean) => void;
  setHasCheckedStore: (checked: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Cache tracking
  lastSyncedAt: number | null;

  // Async thunks (Redux-style)
  syncMembership: () => Promise<void>;
  refreshMembership: () => Promise<void>;
  forceSyncMembership: () => Promise<void>;
  
  // Reset (for logout)
  reset: () => void;
}

const initialState = {
  status: (() => {
    const saved = localStorage.getItem('breathAppMembershipStatus');
    if (saved === 'Premium Membership' || saved === 'Trial' || saved === 'Grace Period' || saved === 'Expired') {
      return saved as MembershipStatus;
    }
    return 'Free' as MembershipStatus;
  })(),
  isLoading: true,
  error: null,
  subscription: null,
  hasStoreEntitlement: false,
  hasCheckedBackend: false,
  hasCheckedStore: false,
  isInitialized: false,
  lastSyncedAt: null as number | null,
};

// Redux-pattern store with Zustand
export const useMembershipStore = create<MembershipState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Reducers (immutable updates)
    setStatus: (status) => {
      set({ status });
      localStorage.setItem('breathAppMembershipStatus', status);
    },
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setSubscription: (subscription) => set({ subscription }),
    setHasStoreEntitlement: (has) => set({ hasStoreEntitlement: has }),
    setHasCheckedBackend: (checked) => set({ hasCheckedBackend: checked }),
    setHasCheckedStore: (checked) => set({ hasCheckedStore: checked }),
    setInitialized: (initialized) => set({ isInitialized: initialized }),

    // Async thunk: sync membership from backend + RevenueCat
    syncMembership: async () => {
      const state = get();
      
      // Prevent concurrent syncs
      if (state.isLoading && state.isInitialized) {
        console.log('[MembershipStore] Sync already in progress, skipping');
        return;
      }

      set({ isLoading: true, error: null });

      try {
        // Step 1: Check backend (Systeme.io tags)
        const auth = await getStoredAuth();
        if (!auth) {
          set({
            isLoading: false,
            hasCheckedBackend: true,
            hasCheckedStore: true,
            isInitialized: true,
          });
          if (state.status === 'Premium Membership') {
            get().setStatus('Free');
          }
          return;
        }

        let hasBackendMembership = false;
        if (auth.email) {
          try {
            const systemeStatus = await getSystemeMembershipStatus(auth.email);
            console.log('[MembershipStore] Systeme.io check:', {
              hasFullAccess: systemeStatus.hasFullAccess,
              contactId: systemeStatus.contactId,
            });

            if (systemeStatus.hasFullAccess) {
              hasBackendMembership = true;
              if (state.status !== 'Premium Membership') {
                get().setStatus('Premium Membership');
              }
            }
          } catch (err) {
            console.warn('[MembershipStore] Systeme.io check failed:', err);
          }
        }

        set({ hasCheckedBackend: true });

        // If backend has membership, skip RevenueCat
        if (hasBackendMembership) {
          console.log('[MembershipStore] Using backend membership, skipping RevenueCat');
          set({
            hasStoreEntitlement: false,
            subscription: null,
            hasCheckedStore: true,
            isLoading: false,
            isInitialized: true,
          });
          return;
        }

        // Step 2: Check RevenueCat (in-app purchases)
        try {
          await initializeRevenueCat(auth.userId, auth.email);
        } catch (initErr) {
          console.warn('[MembershipStore] RevenueCat init failed (may be expected on web):', initErr);
        }

        const attemptFetch = async () => getDetailedSubscriptionInfo();
        let result = await attemptFetch();

        // Retry once on native if no entitlement (RevenueCat may not be ready)
        if (!result.hasEntitlement && Capacitor.isNativePlatform()) {
          console.log('[MembershipStore] No entitlement, retrying after delay');
          await new Promise((resolve) => setTimeout(resolve, 400));
          result = await attemptFetch();
        }

        console.log('[MembershipStore] RevenueCat check:', {
          hasEntitlement: result.hasEntitlement,
          subscription: result.subscription,
        });

        set({
          hasStoreEntitlement: result.hasEntitlement,
          subscription: result.subscription,
          hasCheckedStore: true,
        });

        // Update status based on RevenueCat result
        if (result.hasEntitlement) {
          if (state.status !== 'Premium Membership') {
            get().setStatus('Premium Membership');
          }
        } else {
          // Only downgrade if we've checked both backend and store
          if (state.status === 'Premium Membership' && state.isInitialized) {
            console.log('[MembershipStore] No entitlement found, downgrading to Free');
            get().setStatus('Free');
          }
        }
      } catch (err) {
        console.error('[MembershipStore] Sync error:', err);
        set({
          error: err instanceof Error ? err.message : 'Failed to sync membership',
          isLoading: false,
          hasCheckedBackend: true,
          hasCheckedStore: true,
        });
      } finally {
        set({
          isLoading: false,
          isInitialized: true,
          lastSyncedAt: Date.now(),
        });
      }
    },

    // Refresh: respects TTL — skips if data is still fresh (called on menu open)
    refreshMembership: async () => {
      const { lastSyncedAt, isLoading } = get();
      if (isLoading) {
        console.log('[MembershipStore] Sync in progress, skipping refresh');
        return;
      }
      if (lastSyncedAt && Date.now() - lastSyncedAt < CACHE_TTL_MS) {
        console.log('[MembershipStore] Data is fresh, skipping refresh (cached)');
        return;
      }
      console.log('[MembershipStore] Cache expired, refreshing membership');
      await get().syncMembership();
    },

    // Force sync: bypasses TTL (called after login, app foreground, tab visible)
    forceSyncMembership: async () => {
      console.log('[MembershipStore] Force sync requested');
      await get().syncMembership();
    },

    // Reset: clear state on logout (clears cache so next login always fetches fresh)
    reset: () => {
      set({
        ...initialState,
        status: 'Free',
        lastSyncedAt: null,
      });
      localStorage.removeItem('breathAppMembershipStatus');
    },
  }))
);

// Selectors (Redux-style computed state)
export const membershipSelectors = {
  selectStatus: (state: MembershipState) => state.status,
  selectIsLoading: (state: MembershipState) => state.isLoading,
  selectError: (state: MembershipState) => state.error,
  selectIsPremium: (state: MembershipState) => state.status === 'Premium Membership',
  selectSubscription: (state: MembershipState) => state.subscription,
  selectHasStoreEntitlement: (state: MembershipState) => state.hasStoreEntitlement,
  selectIsInitialized: (state: MembershipState) => state.isInitialized,
  // Computed membership state (for Subscription page UI)
  selectMembershipState: (state: MembershipState): MembershipStateResult => {
    return computeMembershipState(state.status, state.hasStoreEntitlement, state.subscription);
  },
};

// Hook for components (React-friendly)
export const useMembership = () => {
  const store = useMembershipStore();
  const membershipState = membershipSelectors.selectMembershipState(store);
  return {
    status: store.status,
    isLoading: store.isLoading,
    error: store.error,
    subscription: store.subscription,
    isPremium: store.status === 'Premium Membership',
    membershipState, // Computed UI state
    refresh: store.refreshMembership,
    sync: store.syncMembership,
  };
};

// Helper for Subscription page (matches old useMembershipState API)
export const useMembershipState = () => {
  const store = useMembershipStore();
  const membershipState = membershipSelectors.selectMembershipState(store);
  
  return {
    membershipState,
    isLoading: store.isLoading,
    error: store.error,
    isManaging: false, // TODO: Add to store if needed
    refresh: store.refreshMembership,
    handleManageSubscription: async () => {
      // TODO: Implement subscription management
      console.warn('[MembershipStore] handleManageSubscription not implemented');
    },
  };
};
