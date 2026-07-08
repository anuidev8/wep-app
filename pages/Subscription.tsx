import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PhoneNumberModal } from '../components/PhoneNumberModal';
import { getStoredAuth } from '../services/authService';
import {
  getPlans,
  initializeRevenueCat,
  purchaseProduct,
  verifyPurchaseEntitlements,
} from '../services/revenuecatService';
import { SubscriptionPlan } from '../types';
import { mapPlansToUI } from '../utils/subscriptionPricing';
import { runPostPurchaseTasks } from '../services/subscriptionSystemService';
import { useApp } from '../context/AppContext';
import { useMembershipState, useMembershipStore } from '../store/membershipStore';
import { shouldShowPurchaseOptions } from '../hooks/useMembershipState';
import { PlanTile, buildPlanOptions, CurrentPlanCard, ConflictWarning } from '../components/membership';
import { getPlatformLabels } from '../utils/membershipState';

export const Subscription: React.FC = () => {
  const navigate = useNavigate();

  // Membership state from RevenueCat
  const {
    membershipState,
    isLoading: isMembershipLoading,
    isManaging,
    handleManageSubscription,
    refresh: refreshMembership,
  } = useMembershipState();

  // Purchase flow state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    userId: string;
    email: string;
    fullName: string;
    contactId?: string;
  } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [expandedBenefits, setExpandedBenefits] = useState<Record<string, boolean>>({});

  const toggleBenefits = (period: string) => {
    setExpandedBenefits((prev) => ({ ...prev, [period]: !prev[period] }));
  };

  // Load user info on mount
  const loadUserInfo = async () => {
    try {
      const auth = await getStoredAuth();
      if (!auth) {
        navigate('/login');
        return;
      }
      setUserInfo({
        userId: auth.userId,
        email: auth.email,
        fullName: auth.fullName,
        contactId: (auth as { contactId?: string }).contactId,
      });
    } catch (err) {
      console.error('[Subscription] Failed to load user info:', err);
    }
  };

  useEffect(() => {
    loadUserInfo();
  }, []);

  // Determine what to show - must be before the plans loading effect
  const showPurchaseOptions = shouldShowPurchaseOptions(membershipState.state);

  // Load plans ONLY when membership state is loaded AND user is not subscribed
  const loadPlans = async () => {
    if (!userInfo) return;

    setIsLoadingPlans(true);
    setError(null);
    try {
      await initializeRevenueCat(userInfo.userId, userInfo.email);
      const availablePlans = await getPlans();
      setPlans(availablePlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription plans');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Only load plans when we know user needs to see them
  useEffect(() => {
    // Wait until membership loading is complete
    if (isMembershipLoading) return;

    // Only load plans if user is not subscribed
    if (showPurchaseOptions && userInfo && plans.length === 0) {
      loadPlans();
    } else if (!showPurchaseOptions) {
      // User is subscribed, no need to load plans
      setIsLoadingPlans(false);
    }
  }, [isMembershipLoading, showPurchaseOptions, userInfo]);

  // Purchase handler - keeps all existing logic
  const handlePurchase = async (plan: SubscriptionPlan, resolvedPhone: string) => {
    if (!userInfo) return;
    setIsPurchasing(true);
    setPurchaseSuccess(false);

    try {
      // Step 1: Execute purchase through RevenueCat
      const result = await purchaseProduct(plan.productId, userInfo.userId, userInfo.email);

      // Step 2: Verify entitlements after purchase
      const entitlements = await verifyPurchaseEntitlements();

      if (entitlements.hasActiveEntitlement) {
        // Step 3: Update membership status in global store
        useMembershipStore.getState().setStatus('Premium Membership');

        // Step 4: Run Systeme.io post-purchase tasks (tags, phone, email)
        const contactId = userInfo.contactId || userInfo.userId;
        await runPostPurchaseTasks({
          contactId,
          phoneNumber: resolvedPhone,
          period: plan.billingPeriod,
          email: userInfo.email,
          fullName: userInfo.fullName,
        });

        // Step 5: Show success state and navigate to home
        setPurchaseSuccess(true);

        // Force re-sync full membership state from server (bypasses TTL — user just purchased)
        await useMembershipStore.getState().forceSyncMembership();

        // Navigate to home after brief delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        console.warn('[Subscription] Purchase completed but entitlement verification failed');
        alert(result.message + '\n\nPlease restart the app if features are not unlocked.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      console.error('[Subscription] Purchase error:', errorMessage);
      alert(errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Build plan options
  const uiPlans = useMemo(() => mapPlansToUI(plans), [plans]);
  const planOptions = useMemo(() => buildPlanOptions(uiPlans), [uiPlans]);

  // Auto-select first plan if current selection not available
  useEffect(() => {
    if (planOptions.length === 0) return;
    if (!planOptions.some((option) => option.period === selectedPeriod)) {
      setSelectedPeriod(planOptions[0].period);
    }
  }, [planOptions, selectedPeriod]);

  const selectedPlan = useMemo(() => {
    const option = planOptions.find((item) => item.period === selectedPeriod);
    return option?.plan ?? planOptions[0]?.plan ?? null;
  }, [planOptions, selectedPeriod]);

  const handleSubscribeClick = () => {
    if (!selectedPlan || isPurchasing) return;
    setIsPhoneModalOpen(true);
  };

  const handlePhoneSubmit = async (value: string) => {
    if (!selectedPlan) return;
    setPhoneNumber(value);
    setIsPhoneModalOpen(false);
    await handlePurchase(selectedPlan, value);
  };

  // Loading state: wait for membership to load, and plans if needed
  const isLoading = isMembershipLoading || (showPurchaseOptions && isLoadingPlans);
  const platformLabels = getPlatformLabels(membershipState.billingPlatform);

  // Get header content based on state
  const getHeaderContent = () => {
    if (purchaseSuccess) {
      return {
        title: 'Welcome!',
        subtitle: 'Your membership is now active',
      };
    }
    if (showPurchaseOptions) {
      return {
        title: 'Choose Your Plan',
        subtitle: `Subscriptions are billed through ${platformLabels.storeName}`,
      };
    }
    return {
      title: 'My Membership',
      subtitle: 'See your plan, renewal date, and how to manage',
    };
  };

  const headerContent = getHeaderContent();

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darkBase pb-32 transition-colors duration-300">
      {/* Header */}
      <div className="bg-gradient-peacock pt-12 pb-16 px-6 rounded-b-[48px] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px]" />
        <div className="relative z-10 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="relative p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all duration-300 border-2 border-white/20 shadow-xl shadow-white/10 active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <h1 className="text-lg font-bold text-white/90 tracking-wide">
            {showPurchaseOptions ? 'Membership' : headerContent.title}
          </h1>
          <div className="w-10" />
        </div>
        {showPurchaseOptions && (
          <div className="mt-6 text-center">
            <h2 className="text-xl font-bold text-white mb-1">{headerContent.title}</h2>
            <p className="text-sm text-white/70">{headerContent.subtitle}</p>
          </div>
        )}
        {!showPurchaseOptions && (
          <p className="mt-4 text-center text-sm text-white/70">{headerContent.subtitle}</p>
        )}
      </div>

      <div className="px-6 -mt-8 relative z-20 space-y-4">
        {/* Success State */}
        {purchaseSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 text-center animate-fade-in">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-green-900 dark:text-green-200 mb-2">
              Welcome to Premium!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              Your membership is now active. Redirecting to home...
            </p>
            <div className="flex justify-center">
              <Loader2 size={20} className="animate-spin text-green-600 dark:text-green-400" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !purchaseSuccess && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-center gap-4">
            <AlertCircle size={24} className="text-red-500 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 dark:text-red-200 mb-1">Unable to load</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
              <button
                onClick={loadPlans}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !purchaseSuccess && (
          <div className="bg-white dark:bg-brand-darkSurface rounded-2xl p-8 border border-brand-light dark:border-brand-darkBorder flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-brand-primary dark:text-brand-gold" />
          </div>
        )}

        {/* Content based on membership state */}
        {!isLoading && !error && !purchaseSuccess && (
          <>
            {/* Conflict Warning */}
            {membershipState.state === 'CONFLICT' && <ConflictWarning />}

            {/* Active Subscription - Show Current Plan Card */}
            {!showPurchaseOptions && (
              <CurrentPlanCard
                membershipState={membershipState}
                onManageSubscription={handleManageSubscription}
                isManaging={isManaging}
              />
            )}

            {/* Not Subscribed - Show Purchase Options */}
            {showPurchaseOptions && planOptions.length > 0 && (
              <div className="space-y-4">
                {planOptions.map((option) => (
                  <PlanTile
                    key={option.plan.id}
                    option={option}
                    isSelected={option.period === selectedPeriod}
                    isExpanded={expandedBenefits[option.period] ?? false}
                    isPurchasing={isPurchasing}
                    onSelect={() => setSelectedPeriod(option.period)}
                    onToggleBenefits={() => toggleBenefits(option.period)}
                    onSubscribe={handleSubscribeClick}
                  />
                ))}

                {/* Store compliance text */}
                <p className="text-center text-xs text-brand-medium/50 dark:text-brand-darkTextMuted pt-2 px-4">
                  Payment will be charged to your {platformLabels.storeName} account.
                  Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
                </p>
              </div>
            )}

            {/* No plans available */}
            {showPurchaseOptions && planOptions.length === 0 && (
              <div className="bg-white dark:bg-brand-darkSurface rounded-2xl p-6 border border-brand-light dark:border-brand-darkBorder text-center">
                <p className="text-sm text-brand-medium/70 dark:text-brand-darkTextMuted">
                  Subscription plans are not available right now. Please try again later.
                </p>
              </div>
            )}
          </>
        )}
        {!isLoading && !purchaseSuccess && (
          <div className="pt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/privacy-policy')}
              className="text-xs font-semibold text-brand-primary dark:text-brand-gold underline hover:opacity-80 transition-opacity"
            >
              Privacy Policy
            </button>
          </div>
        )}
      </div>

      {/* Phone Number Modal */}
      <PhoneNumberModal
        open={isPhoneModalOpen}
        defaultValue={phoneNumber}
        isLoading={isPurchasing}
        onClose={() => setIsPhoneModalOpen(false)}
        onSubmit={handlePhoneSubmit}
      />

    </div>
  );
};
