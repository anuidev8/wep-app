import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { CustomerInfo, SubscriptionPlan } from '../types';

// Package name configuration - MUST match store consoles exactly
const EXPECTED_PACKAGE_NAMES = {
  android: 'com.meditatewithabhi.theschoolofbreath',
  ios: 'com.theschoolofbreath'
} as const;

// Initialization guard (prevents re-initialization)
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// CRIT-1 & CRIT-11: Logout mutex and idempotency
let logoutInProgress = false;
let logoutPromise: Promise<void> | null = null;

// RevenueCat availability check
let isRevenueCatAvailable = false;
let revenueCatCheckDone = false;

const checkRevenueCatAvailability = (): boolean => {
  if (revenueCatCheckDone) {
    return isRevenueCatAvailable;
  }

  try {
    const isNative = (window as any).Capacitor?.isNativePlatform();
    
    if (!isNative) {
      revenueCatCheckDone = true;
      isRevenueCatAvailable = false;
      return false;
    }

    if (Purchases && typeof Purchases.configure === 'function') {
      revenueCatCheckDone = true;
      isRevenueCatAvailable = true;
      return true;
    }
  } catch (error) {
    console.warn('[RevenueCatService] RevenueCat plugin check failed:', error);
  }

  revenueCatCheckDone = true;
  isRevenueCatAvailable = false;
  return false;
};

// CRIT-10: SDK Version Validation
const validateSDKVersion = (): void => {
  try {
    // Check if SDK has required methods
    const requiredMethods = ['configure', 'getCustomerInfo', 'getOfferings', 'logOut'];
    for (const method of requiredMethods) {
      if (typeof Purchases[method] !== 'function') {
        throw new Error(`RevenueCat SDK missing required method: ${method}`);
      }
    }
    console.log('[RevenueCatService] ✓ SDK version validated');
  } catch (error) {
    console.error('[RevenueCatService] SDK validation failed:', error);
    throw error;
  }
};

// Get RevenueCat API key from environment
const getRevenueCatApiKey = (): string => {
  const platform = Capacitor.getPlatform();
  const logMaskedKey = (label: string, key: string) => {
    const masked = key.length <= 6 ? '***' : `${key.slice(0, 3)}***${key.slice(-3)}`;
    console.log(`[RevenueCatService] Using ${label} API key: ${masked}`);
  };
  
  if (platform === 'android') {
    const androidKey = import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
    if (androidKey && androidKey !== 'your_revenuecat_android_api_key') {
      logMaskedKey('Android', androidKey);
      return androidKey;
    }
  } else if (platform === 'ios') {
    const iosKey = import.meta.env.VITE_REVENUECAT_IOS_KEY;
    if (iosKey && iosKey !== 'your_revenuecat_ios_api_key') {
      logMaskedKey('iOS', iosKey);
      return iosKey;
    }
  }
  
  const key = import.meta.env.VITE_REVENUECAT_API_KEY;
  if (!key || key === 'your_revenuecat_api_key') {
    throw new Error('RevenueCat API key not configured. Please set VITE_REVENUECAT_ANDROID_KEY, VITE_REVENUECAT_IOS_KEY, or VITE_REVENUECAT_API_KEY in your .env file');
  }
  logMaskedKey('Fallback', key);
  return key;
};

const getExpectedPackageName = (): string => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') {
    return EXPECTED_PACKAGE_NAMES.ios;
  }
  return EXPECTED_PACKAGE_NAMES.android;
};

// Validate package name configuration
const validatePackageNameConfiguration = (): void => {
  const platform = Capacitor.getPlatform();
  const expectedPackageName = getExpectedPackageName();

  if (platform === 'android') {
    console.log('[RevenueCatService] 📦 Package Name Configuration:');
    console.log(`[RevenueCatService]   Package Name: ${expectedPackageName}`);
    console.log(`[RevenueCatService]   ✓ Should match Play Console: ${expectedPackageName}`);
    console.log('[RevenueCatService]   ✓ Should match RevenueCat Dashboard Android package name');
  }
};

// Extract valid product IDs from offerings packages
export const extractValidProductIds = (packages: any[]): string[] => {
  if (!packages || packages.length === 0) {
    return [];
  }
  const productIds: string[] = [];
  
  for (const pkg of packages) {
    if (pkg?.product?.identifier) {
      productIds.push(pkg.product.identifier);
    } else {
      console.debug(`[RevenueCatService] Filtered package ${pkg?.identifier || 'unknown'}: missing product or product identifier`);
    }
  }
  
  return productIds;
};

/**
 * Initialize RevenueCat SDK
 * Includes initialization guard to prevent multiple calls
 */
export const initializeRevenueCat = async (userId: string, email: string): Promise<void> => {
  // If already initialized, return existing promise
  if (isInitialized && initializationPromise) {
    console.log('[RevenueCatService] Already initialized, skipping');
    return initializationPromise;
  }
  
  // If initialization in progress, wait for it
  if (initializationPromise) {
    console.log('[RevenueCatService] Initialization in progress, waiting...');
    return initializationPromise;
  }
  
  // Check if RevenueCat is available
  if (!checkRevenueCatAvailability()) {
    const errorMsg = 'RevenueCat plugin not available. Ensure @revenuecat/purchases-capacitor is properly installed and synced with `npx cap sync`.';
    console.warn(`[RevenueCatService] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // CRIT-10: Validate SDK version
      validateSDKVersion();
      
      const apiKey = getRevenueCatApiKey();
      
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: apiKey,
        appUserID: userId,
      });
      
      if (email) {
        await Purchases.setEmail({ email });
      }
      
      isInitialized = true;
      console.log('[RevenueCatService] ✓ RevenueCat initialized successfully');
      
      // Validate package name configuration
      validatePackageNameConfiguration();
      
      // Try to fetch offerings immediately to catch configuration errors early
      try {
        const offerings = await Purchases.getOfferings();
        if (!offerings.current) {
          console.warn('[RevenueCatService] ⚠️ Warning: No offerings available after initialization');
          console.warn('[RevenueCatService] This may indicate a Play Console configuration issue');
        } else {
          const packages = offerings.current?.availablePackages || [];
          console.log(`[RevenueCatService] ✓ Offerings available with ${packages.length} package(s)`);
          
          const productIds = extractValidProductIds(packages);
          if (productIds.length === 0) {
            console.warn('[RevenueCatService] ⚠️ No valid product IDs found in packages');
          } else {
            console.log(`[RevenueCatService] Fetched product IDs: ${productIds.join(', ')}`);
            console.log('[RevenueCatService] Expected Android IDs: rcm_1m, rcm_1y');
          }
        }
      } catch (offeringsError: any) {
        console.warn('[RevenueCatService] ⚠️ Could not verify offerings after initialization:', offeringsError.message);
        if (offeringsError.code === 'ConfigurationError') {
          console.error('[RevenueCatService] 🔴 Configuration Error Detected!');
          console.error(`[RevenueCatService]   1. Package name mismatch (expected: ${EXPECTED_PACKAGE_NAMES.android})`);
          console.error('[RevenueCatService]   2. Products not Active (must be Active, not Draft)');
          console.error('[RevenueCatService]   3. App not published to testing track');
          console.error('[RevenueCatService]   4. Product IDs mismatch (Android: rcm_1m, rcm_1y)');
        }
      }
    } catch (error: any) {
      // Reset promise on error so retry is possible
      initializationPromise = null;
      isInitialized = false;
      const errorMsg = error?.message || 'Failed to initialize RevenueCat';
      console.error(`[RevenueCatService] RevenueCat initialization failed: ${errorMsg}`);
      throw error;
    }
  })();
  
  return initializationPromise;
};

/**
 * CRIT-1 & CRIT-7 & CRIT-11: Logout with mutex, verification, and idempotency
 * Prevents concurrent logout calls and verifies logout succeeded
 */
export const logOutRevenueCat = async (userId?: string): Promise<void> => {
  const correlationId = `logout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // CRIT-11: Idempotency check
  if (!isInitialized && !logoutInProgress) {
    console.log(`[RevenueCatService] [${correlationId}] Already logged out, skipping`);
    return;
  }
  
  // CRIT-1: If logout already in progress, return existing promise
  if (logoutInProgress && logoutPromise) {
    console.log(`[RevenueCatService] [${correlationId}] Logout already in progress, waiting...`);
    return logoutPromise;
  }
  
  logoutInProgress = true;
  logoutPromise = (async () => {
    try {
      console.log(`[RevenueCatService] [${correlationId}] Starting logout for user: ${userId || 'unknown'}`);
      
      if (!checkRevenueCatAvailability()) {
        console.warn(`[RevenueCatService] [${correlationId}] RevenueCat not available, skipping logout`);
        return;
      }
      
      // CRIT-7: Add timeout to logout operation (max 5 seconds)
      const logoutTimeout = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Logout timeout')), 5000);
      });
      
      await Promise.race([
        Purchases.logOut(),
        logoutTimeout
      ]);
      
      // CRIT-7: Verify logout succeeded by checking customer info
      const customerInfo = await Purchases.getCustomerInfo();
      const isAnonymous = customerInfo.originalAppUserId.startsWith('$RCAnonymousID:');
      
      if (!isAnonymous) {
        console.error(`[RevenueCatService] [${correlationId}] Logout verification failed - customer still identified`);
        // Try reset as fallback
        await Purchases.reset();
      }
      
      // Reset initialization flags
      isInitialized = false;
      initializationPromise = null;
      
      console.log(`[RevenueCatService] [${correlationId}] Logout completed in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      console.error(`[RevenueCatService] [${correlationId}] Logout failed:`, {
        error: error.message,
        userId,
        duration: Date.now() - startTime,
        stack: error.stack
      });
      
      // CRIT-12: Ensure auth state is cleared even if RevenueCat logout fails
      try {
        await Purchases.reset();
        isInitialized = false;
        initializationPromise = null;
      } catch (resetError) {
        console.error(`[RevenueCatService] [${correlationId}] Reset also failed:`, resetError);
        // Still reset flags to allow re-initialization
        isInitialized = false;
        initializationPromise = null;
      }
    } finally {
      logoutInProgress = false;
      logoutPromise = null;
    }
  })();
  
  return logoutPromise;
};

/**
 * Get available subscription plans from RevenueCat offerings
 */
export const getPlans = async (): Promise<SubscriptionPlan[]> => {
  if (!checkRevenueCatAvailability()) {
    console.warn('[RevenueCatService] RevenueCat not available, returning empty plans');
    return [];
  }

  try {
    const offerings = await Purchases.getOfferings();
    
    if (!offerings.current) {
      console.error('[RevenueCatService] 🔴 No offerings available - Configuration issue detected!');
      return [];
    }
    
    const plans: SubscriptionPlan[] = [];
    
    for (const packageItem of offerings.current.availablePackages) {
      const product = packageItem.product;
      
      if (!product || !product.identifier) {
        console.warn(`[RevenueCatService] ⚠️ Skipping package ${packageItem.identifier}: product or identifier is missing`);
        continue;
      }
      
      const period = product.subscriptionPeriod || '';
      const billingPeriod = period.includes('Y') ? 'YEARLY' : 'MONTHLY';
      
      plans.push({
        id: product.identifier,
        name: product.title || '',
        price: parseFloat(product.price) || 0,
        currency: product.currencyCode || 'USD',
        billingPeriod: billingPeriod as 'MONTHLY' | 'YEARLY',
        description: product.description || '',
        productId: product.identifier,
      });
    }
    
    console.log(`[RevenueCatService] Successfully fetched ${plans.length} product(s) from Play Store`);
    return plans;
  } catch (error: any) {
    console.error('[RevenueCatService] Error getting plans:', error);
    return [];
  }
};

/**
 * Purchase a product
 */
export const purchaseProduct = async (
  productId: string,
  userId: string,
  email: string
): Promise<{ success: boolean; message: string; transactionId?: string }> => {
  if (!checkRevenueCatAvailability()) {
    throw new Error('RevenueCat plugin not available');
  }

  try {
    const offerings = await Purchases.getOfferings();
    
    if (!offerings.current) {
      throw new Error('No offerings available');
    }
    
    if (!offerings.current.availablePackages || offerings.current.availablePackages.length === 0) {
      throw new Error('No packages available in current offering');
    }
    
    const packageToPurchase = offerings.current.availablePackages.find(
      (pkg) => pkg.product?.identifier === productId
    );
    
    if (!packageToPurchase) {
      const availableIds = extractValidProductIds(offerings.current.availablePackages);
      throw new Error(`Product ${productId} not found in offerings. Available IDs: ${availableIds.join(', ') || 'none'}`);
    }
    
    if (!packageToPurchase.product) {
      throw new Error(`Package ${packageToPurchase.identifier} has no product available`);
    }
    
    const purchaseResult = await Purchases.purchasePackage({ aPackage: packageToPurchase });
    
    return {
      success: true,
      message: 'Purchase completed successfully',
      transactionId: purchaseResult.transaction?.transactionIdentifier,
    };
  } catch (error: any) {
    console.error('[RevenueCatService] Error purchasing product:', error);
    
    if (error instanceof Error) {
      const enhancedError = new Error(
        `Failed to purchase product ${productId}: ${error.message}`
      );
      enhancedError.name = error.name;
      enhancedError.stack = error.stack;
      throw enhancedError;
    }
    
    throw new Error(`Failed to purchase product ${productId}: ${error?.message || String(error)}`);
  }
};

/**
 * Restore purchases
 */
export const restorePurchases = async (userId: string): Promise<CustomerInfo | null> => {
  if (!checkRevenueCatAvailability()) {
    console.warn('[RevenueCatService] RevenueCat not available, cannot restore purchases');
    return null;
  }

  try {
    const result = await Purchases.restorePurchases();
    return mapCustomerInfo(result.customerInfo);
  } catch (error: any) {
    console.error('[RevenueCatService] Error restoring purchases:', error);
    return null;
  }
};

/**
 * Get customer subscription info
 */
export const getCustomerInfo = async (userId: string): Promise<CustomerInfo | null> => {
  if (!checkRevenueCatAvailability()) {
    console.warn('[RevenueCatService] RevenueCat not available, cannot get customer info');
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return mapCustomerInfo(customerInfo);
  } catch (error: any) {
    console.error('[RevenueCatService] Error getting customer info:', error);
    return null;
  }
};

/**
 * Map RevenueCat CustomerInfo to our CustomerInfo type
 */
const mapCustomerInfo = (rcCustomerInfo: any): CustomerInfo => {
  const activeSubscriptions: string[] = [];
  
  if (rcCustomerInfo.entitlements?.active) {
    for (const entitlement of Object.values(rcCustomerInfo.entitlements.active)) {
      const ent = entitlement as any;
      if (ent.productIdentifier) {
        activeSubscriptions.push(ent.productIdentifier);
      }
    }
  }
  
  return {
    customerId: rcCustomerInfo.originalAppUserId,
    email: '',
    activeSubscriptions,
    allPurchasedProductIds: rcCustomerInfo.allPurchasedProductIdentifiers || [],
    latestExpirationDate: rcCustomerInfo.latestExpirationDate,
    managementURL: rcCustomerInfo.managementURL,
    originalPurchaseDate: rcCustomerInfo.originalPurchaseDate,
    requestDate: rcCustomerInfo.requestDate,
  };
};

/**
 * Reset RevenueCat initialization state (for testing purposes)
 */
export const resetRevenueCatInitialization = () => {
  isInitialized = false;
  initializationPromise = null;
};

/**
 * Verify purchase entitlements after a successful purchase
 * Returns the active entitlement status similar to RN app's customerInfo.entitlements.active?.pro?.periodType
 */
export const verifyPurchaseEntitlements = async (): Promise<{
  hasActiveEntitlement: boolean;
  periodType: 'MONTHLY' | 'YEARLY' | null;
  entitlementId: string | null;
}> => {
  if (!checkRevenueCatAvailability()) {
    console.warn('[RevenueCatService] RevenueCat not available, cannot verify entitlements');
    return { hasActiveEntitlement: false, periodType: null, entitlementId: null };
  }

  try {
    const result = await Purchases.getCustomerInfo();
    const customerInfo = result.customerInfo as any;

    // Check for active entitlements (similar to RN: customerInfo.entitlements.active)
    const activeEntitlements = customerInfo.entitlements?.active;

    if (!activeEntitlements || Object.keys(activeEntitlements).length === 0) {
      console.log('[RevenueCatService] No active entitlements found');
      return { hasActiveEntitlement: false, periodType: null, entitlementId: null };
    }

    // Get first active entitlement (typically 'pro' or similar)
    const entitlementKeys = Object.keys(activeEntitlements);
    const firstEntitlement = activeEntitlements[entitlementKeys[0]] as any;

    if (!firstEntitlement) {
      return { hasActiveEntitlement: false, periodType: null, entitlementId: null };
    }

    // Determine period type from product identifier or period type
    let periodType: 'MONTHLY' | 'YEARLY' | null = null;

    if (firstEntitlement.periodType) {
      // RevenueCat periodType: 'NORMAL', 'INTRO', 'TRIAL'
      // We need to check the product to determine monthly vs yearly
      const productId = firstEntitlement.productIdentifier || '';
      if (productId.includes('1y') || productId.includes('yearly') || productId.includes('annual')) {
        periodType = 'YEARLY';
      } else {
        periodType = 'MONTHLY';
      }
    }

    console.log('[RevenueCatService] ✓ Active entitlement verified:', {
      entitlementId: entitlementKeys[0],
      periodType,
      productIdentifier: firstEntitlement.productIdentifier,
    });

    return {
      hasActiveEntitlement: true,
      periodType,
      entitlementId: entitlementKeys[0],
    };
  } catch (error: any) {
    console.error('[RevenueCatService] Error verifying entitlements:', error);
    return { hasActiveEntitlement: false, periodType: null, entitlementId: null };
  }
};

/**
 * Get detailed subscription info for the "My Membership" screen
 * Returns comprehensive data about the current subscription state
 */
export const getDetailedSubscriptionInfo = async (): Promise<{
  hasEntitlement: boolean;
  subscription: {
    isActive: boolean;
    willRenew: boolean;
    periodType: 'MONTHLY' | 'YEARLY' | null;
    expiresDate: string | null;
    productIdentifier: string | null;
    unsubscribeDetectedAt: string | null;
    managementURL: string | null;
    priceString: string | null;
  } | null;
}> => {
  if (!checkRevenueCatAvailability()) {
    console.warn('[RevenueCatService] RevenueCat not available');
    return { hasEntitlement: false, subscription: null };
  }

  try {
    const result = await Purchases.getCustomerInfo();
    const customerInfo = result.customerInfo as any;

    const activeEntitlements = customerInfo.entitlements?.active;
    if (!activeEntitlements || Object.keys(activeEntitlements).length === 0) {
      return { hasEntitlement: false, subscription: null };
    }

    const entitlementKeys = Object.keys(activeEntitlements);
    const entitlement = activeEntitlements[entitlementKeys[0]] as any;

    if (!entitlement) {
      return { hasEntitlement: false, subscription: null };
    }

    // Determine period type from product identifier
    const productId = entitlement.productIdentifier || '';
    let periodType: 'MONTHLY' | 'YEARLY' | null = null;
    if (productId.includes('1y') || productId.includes('yearly') || productId.includes('annual')) {
      periodType = 'YEARLY';
    } else if (productId.includes('1m') || productId.includes('monthly')) {
      periodType = 'MONTHLY';
    }

    // Extract subscription details
    const subscription = {
      isActive: entitlement.isActive ?? true,
      willRenew: entitlement.willRenew ?? true,
      periodType,
      expiresDate: entitlement.expirationDate || customerInfo.latestExpirationDate || null,
      productIdentifier: productId || null,
      unsubscribeDetectedAt: entitlement.unsubscribeDetectedAt || null,
      managementURL: customerInfo.managementURL || null,
      priceString: null, // Would need offerings data to get price
    };

    console.log('[RevenueCatService] Detailed subscription info:', subscription);

    return {
      hasEntitlement: true,
      subscription,
    };
  } catch (error: any) {
    console.error('[RevenueCatService] Error getting detailed subscription info:', error);
    return { hasEntitlement: false, subscription: null };
  }
};

/**
 * Open the native subscription management page
 * Uses platform-specific deep links for iOS/Android
 *
 * Note: You cannot directly cancel subscriptions from inside the app.
 * Apple/Google require redirecting users to their subscription management screens.
 * RevenueCat provides managementURL from CustomerInfo for this purpose.
 *
 * @see https://developer.apple.com/app-store/subscriptions/
 * @see https://developer.android.com/google/play/billing/subscriptions
 * @see https://www.revenuecat.com/docs/subscription-guidance/managing-subscriptions
 */
export const openSubscriptionManagement = async (): Promise<boolean> => {
  if (!checkRevenueCatAvailability()) {
    console.warn('[RevenueCatService] RevenueCat not available');
    return false;
  }

  try {
    const result = await Purchases.getCustomerInfo();
    const customerInfo = result.customerInfo as any;

    // Determine the URL to open
    let url: string | null = null;

    if (customerInfo.managementURL) {
      // Primary: Use the management URL from RevenueCat (personalized for this subscription)
      url = customerInfo.managementURL;
    } else {
      // Fallback to platform-specific generic URLs
      const platform = Capacitor.getPlatform();

      if (platform === 'ios') {
        // iOS App Store subscription management
        url = 'https://apps.apple.com/account/subscriptions';
      } else if (platform === 'android') {
        // Google Play subscription management
        url = 'https://play.google.com/store/account/subscriptions';
      }
    }

    if (!url) {
      console.warn('[RevenueCatService] No management URL available for this platform');
      return false;
    }

    // Open external URL - works on both web and native Capacitor
    // On native: opens in system browser/app
    // On web: opens in new tab
    console.log('[RevenueCatService] Opening subscription management URL:', url);
    window.open(url, '_blank');
    return true;
  } catch (error: any) {
    console.error('[RevenueCatService] Error opening subscription management:', error);
    return false;
  }
};
