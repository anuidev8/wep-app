import { CustomerInfo, SubscriptionLifecycleStatus } from '../types';
import { isInGracePeriod } from './dateValidation';

/**
 * CRIT-4: Get subscription lifecycle status with explicit priority order
 * 
 * Priority order (most restrictive first):
 * 1. BILLING_ISSUE - Always deny access regardless of other states
 * 2. EXPIRED - Subscription expired, no access
 * 3. GRACE_PERIOD - Limited access during grace period
 * 4. TRIAL - Trial access
 * 5. ACTIVE - Full access
 * 6. INACTIVE - No subscription
 */
export function getSubscriptionLifecycleStatus(customerInfo: CustomerInfo): SubscriptionLifecycleStatus {
  // Priority 1: BILLING_ISSUE - Always deny access
  if (customerInfo.billingIssueDetectedAt) {
    const issueDate = new Date(customerInfo.billingIssueDetectedAt);
    // If billing issue detected within last 30 days, deny access
    if (!isNaN(issueDate.getTime()) && Date.now() - issueDate.getTime() < 30 * 24 * 60 * 60 * 1000) {
      return 'BILLING_ISSUE';
    }
  }
  
  // Priority 2: EXPIRED - Check if subscription expired
  if (!customerInfo.activeSubscriptions || customerInfo.activeSubscriptions.length === 0) {
    // Check if expired
    if (customerInfo.latestExpirationDate) {
      const expDate = new Date(customerInfo.latestExpirationDate);
      if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
        // Priority 3: Check if in grace period
        if (isInGracePeriod(customerInfo)) {
          return 'GRACE_PERIOD';
        }
        return 'EXPIRED';
      }
    }
    return 'INACTIVE';
  }
  
  // Priority 4: TRIAL - Check if trial
  if (customerInfo.trialEndDate) {
    const trialEnd = new Date(customerInfo.trialEndDate);
    if (!isNaN(trialEnd.getTime()) && trialEnd.getTime() > Date.now()) {
      return 'TRIAL';
    }
  }
  
  // Priority 5: ACTIVE - Full access
  return 'ACTIVE';
}

/**
 * Check if user has premium access based on lifecycle status
 */
export function hasPremiumAccess(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) {
    return false;
  }
  
  const status = getSubscriptionLifecycleStatus(customerInfo);
  
  // Allow access for ACTIVE, TRIAL, and GRACE_PERIOD
  return status === 'ACTIVE' || status === 'TRIAL' || status === 'GRACE_PERIOD';
}
