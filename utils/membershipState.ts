import { Capacitor } from '@capacitor/core';
import { MembershipStatus } from '../context/AppContext';

/**
 * Membership UI States - Derived from RevenueCat + Redux membershipStatus
 * These states drive the "My Membership" screen UI
 */
export type MembershipUIState =
  | 'NOT_SUBSCRIBED'
  | 'SUBSCRIBED_STORE_ACTIVE'
  | 'SUBSCRIBED_STORE_CANCELED_BUT_ACTIVE'
  | 'SUBSCRIBED_WEB_ONLY'
  | 'CONFLICT';

export type BillingPlatform = 'apple' | 'google' | 'web' | 'unknown';

export interface SubscriptionDetails {
  isActive: boolean;
  willRenew: boolean;
  periodType: 'MONTHLY' | 'YEARLY' | null;
  expiresDate: string | null;
  productIdentifier: string | null;
  unsubscribeDetectedAt: string | null;
  managementURL: string | null;
  priceString: string | null;
}

export interface MembershipStateResult {
  state: MembershipUIState;
  billingPlatform: BillingPlatform;
  subscription: SubscriptionDetails | null;
  planName: string;
  statusLabel: string;
  statusColor: 'green' | 'yellow' | 'red' | 'gray';
}

/**
 * Get the current billing platform based on Capacitor platform
 */
export const getBillingPlatform = (): BillingPlatform => {
  if (!Capacitor.isNativePlatform()) {
    return 'web';
  }
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'apple';
  if (platform === 'android') return 'google';
  return 'unknown';
};

/**
 * Get platform-specific labels
 */
export const getPlatformLabels = (platform: BillingPlatform) => {
  switch (platform) {
    case 'apple':
      return {
        billedVia: 'Billed via Apple',
        managementButton: 'Manage in Apple Subscriptions',
        storeName: 'App Store',
      };
    case 'google':
      return {
        billedVia: 'Billed via Google Play',
        managementButton: 'Manage in Google Play',
        storeName: 'Google Play',
      };
    case 'web':
      return {
        billedVia: 'Billed via Website · Systeme.io platform',
        managementButton: 'Manage Subscription',
        storeName: 'Website',
      };
    default:
      return {
        billedVia: 'Subscription Active',
        managementButton: 'Manage Subscription',
        storeName: 'Store',
      };
  }
};

/**
 * Derive plan name from product identifier
 */
export const getPlanNameFromProduct = (productId: string | null): string => {
  if (!productId) return 'Premium Membership';

  const id = productId.toLowerCase();
  if (id.includes('1y') || id.includes('yearly') || id.includes('annual') || id.includes('year')) {
    return 'Yearly Membership';
  }
  if (id.includes('1m') || id.includes('monthly') || id.includes('month')) {
    return 'Monthly Membership';
  }
  return 'Premium Membership';
};

/**
 * Format expiration date for display
 */
export const formatExpirationDate = (dateString: string | null): string => {
  if (!dateString) return 'Unknown';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
};

/**
 * Check if a subscription is canceled but still active
 */
export const isCanceledButActive = (subscription: SubscriptionDetails): boolean => {
  if (!subscription.isActive) return false;
  if (subscription.willRenew) return false;

  // Has unsubscribe detected or won't renew but still active
  if (subscription.unsubscribeDetectedAt) return true;

  // Check if expires date is in the future
  if (subscription.expiresDate) {
    const expiresTime = new Date(subscription.expiresDate).getTime();
    return expiresTime > Date.now();
  }

  return false;
};

/**
 * Compute the membership UI state from RevenueCat data and Redux membershipStatus
 */
export const computeMembershipState = (
  membershipStatus: MembershipStatus,
  hasStoreEntitlement: boolean,
  subscription: SubscriptionDetails | null
): MembershipStateResult => {
  const billingPlatform = getBillingPlatform();
  const isPremiumInRedux = membershipStatus === 'Premium Membership';

  console.log('[membershipState] Inputs:', {
    membershipStatus,
    hasStoreEntitlement,
    hasSubscription: Boolean(subscription),
    billingPlatform,
  });

  // Case 1: NOT_SUBSCRIBED - No active subscription anywhere
  if (!isPremiumInRedux && !hasStoreEntitlement) {
    console.log('[membershipState] Resolved state: NOT_SUBSCRIBED');
    return {
      state: 'NOT_SUBSCRIBED',
      billingPlatform,
      subscription: null,
      planName: 'No Active Plan',
      statusLabel: 'Not Subscribed',
      statusColor: 'gray',
    };
  }

  // Case 2: CONFLICT - Both store and web show premium
  // (This would require detecting web-only tags, which we simplify here)
  // For now, if we have store entitlement, we prioritize that

  // Case 3: SUBSCRIBED_STORE_ACTIVE or SUBSCRIBED_STORE_CANCELED_BUT_ACTIVE
  if (hasStoreEntitlement && subscription) {
    const planName = getPlanNameFromProduct(subscription.productIdentifier);

    if (isCanceledButActive(subscription)) {
      console.log('[membershipState] Resolved state: SUBSCRIBED_STORE_CANCELED_BUT_ACTIVE');
      return {
        state: 'SUBSCRIBED_STORE_CANCELED_BUT_ACTIVE',
        billingPlatform,
        subscription,
        planName,
        statusLabel: `Cancels on ${formatExpirationDate(subscription.expiresDate)}`,
        statusColor: 'yellow',
      };
    }

    console.log('[membershipState] Resolved state: SUBSCRIBED_STORE_ACTIVE');
    return {
      state: 'SUBSCRIBED_STORE_ACTIVE',
      billingPlatform,
      subscription,
      planName,
      statusLabel: 'Active',
      statusColor: 'green',
    };
  }

  // Case 4: SUBSCRIBED_WEB_ONLY - Premium in Redux but no store entitlement
  // This means the subscription was purchased via web/Systeme.io
  if (isPremiumInRedux && !hasStoreEntitlement) {
    console.log('[membershipState] Resolved state: SUBSCRIBED_WEB_ONLY');
    return {
      state: 'SUBSCRIBED_WEB_ONLY',
      billingPlatform: 'web',
      subscription: null,
      planName: 'Premium Membership',
      statusLabel: 'Active (Website)',
      statusColor: 'green',
    };
  }

  // Fallback: treat as not subscribed
  console.log('[membershipState] Resolved state: NOT_SUBSCRIBED (fallback)');
  return {
    state: 'NOT_SUBSCRIBED',
    billingPlatform,
    subscription: null,
    planName: 'No Active Plan',
    statusLabel: 'Not Subscribed',
    statusColor: 'gray',
  };
};
