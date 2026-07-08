import React, { useState } from 'react';
import { Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { MembershipBenefits, MEMBERSHIP_BENEFITS } from './MembershipBenefits';
import { MembershipStateResult, getPlatformLabels, formatExpirationDate } from '../../utils/membershipState';

interface CurrentPlanCardProps {
  membershipState: MembershipStateResult;
  onManageSubscription: () => Promise<void>;
  isManaging: boolean;
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  membershipState,
  onManageSubscription,
  isManaging,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const labels = getPlatformLabels(membershipState.billingPlatform);

  const getStatusBadgeStyles = () => {
    switch (membershipState.statusColor) {
      case 'green':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'yellow':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'red':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  const isCanceled = membershipState.state === 'SUBSCRIBED_STORE_CANCELED_BUT_ACTIVE';
  const isWebOnly = membershipState.state === 'SUBSCRIBED_WEB_ONLY';

  return (
    <div className="bg-white dark:bg-brand-darkSurface rounded-3xl border border-brand-light dark:border-brand-darkBorder shadow-sm overflow-hidden">
      {/* Platform Pill */}
      <div className="bg-brand-primary/5 dark:bg-brand-gold/10 px-5 py-2">
        <span className="text-xs font-medium text-brand-primary dark:text-brand-gold uppercase tracking-wider">
          {labels.billedVia}
        </span>
      </div>

      {/* Plan Details */}
      <div className="p-5">
        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeStyles()}`}>
            {membershipState.statusLabel}
          </span>
        </div>

        {/* Plan Title */}
        <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-2">
          Current plan: {membershipState.planName}
        </h3>

        {/* Renewal/Expiry Info */}
        {membershipState.subscription?.expiresDate && (
          <div className="space-y-1 mb-4">
            <p className="text-sm text-brand-medium dark:text-brand-darkTextMuted">
              {isCanceled ? 'Access until' : 'Renews on'}{' '}
              <span className="font-medium text-brand-dark dark:text-white">
                {formatExpirationDate(membershipState.subscription.expiresDate)}
              </span>
            </p>
            {membershipState.subscription.priceString && (
              <p className="text-sm text-brand-medium/70 dark:text-brand-darkTextMuted">
                {membershipState.subscription.priceString} /{' '}
                {membershipState.subscription.periodType === 'YEARLY' ? 'year' : 'month'}
              </p>
            )}
          </div>
        )}

        {/* Canceled Warning */}
        {isCanceled && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Your access continues until the end date. You won't be charged again.
            </p>
          </div>
        )}

        {/* Web Only Info - Policy-compliant disclosure for iOS/Android */}
        {isWebOnly && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
              This subscription was purchased on our website and is billed through the Systeme.io platform. Payments and renewals are managed outside this app. To update payment method or cancel, visit our website or contact support.
            </p>
          </div>
        )}

        {/* Manage Button */}
        {!isWebOnly && (
          <button
            type="button"
            onClick={onManageSubscription}
            disabled={isManaging}
            className="w-full py-3 rounded-xl bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-70"
          >
            {isManaging ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                {labels.managementButton}
              </>
            )}
          </button>
        )}

        {/* Helper Text */}
        {!isWebOnly && (
          <p className="text-xs text-brand-medium/50 dark:text-brand-darkTextMuted text-center mt-3">
            {`To change or cancel, use your ${labels.storeName} account. Access updates automatically.`}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-brand-light/70 dark:bg-brand-darkBorder" />

      {/* Benefits Accordion */}
      <MembershipBenefits
        previewBenefits={MEMBERSHIP_BENEFITS.preview}
        benefitGroups={MEMBERSHIP_BENEFITS.groups}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />
    </div>
  );
};

// Conflict Warning Component
export const ConflictWarning: React.FC = () => (
  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-4">
    <div className="flex items-start gap-3">
      <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
      <div>
        <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">
          Multiple Memberships Detected
        </h4>
        <p className="text-sm text-orange-700 dark:text-orange-300">
          We've detected more than one active membership on this account. Please contact support to consolidate billing.
        </p>
      </div>
    </div>
  </div>
);
