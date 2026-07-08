import React from 'react';
import { Loader2 } from 'lucide-react';
import { MembershipBenefits, BenefitGroup } from './MembershipBenefits';
import { UISubscriptionPlan } from '../../types';

export interface PlanOption {
  period: 'MONTHLY' | 'YEARLY';
  plan: UISubscriptionPlan;
  title: string;
  valueStatement: string;
  billingNote: string;
  benefitGroups: BenefitGroup[];
  previewBenefits: string[];
  savingsMessage?: string;
  badge?: string;
}

interface PlanTileProps {
  option: PlanOption;
  isSelected: boolean;
  isExpanded: boolean;
  isPurchasing: boolean;
  onSelect: () => void;
  onToggleBenefits: () => void;
  onSubscribe: () => void;
}

export const PlanTile: React.FC<PlanTileProps> = ({
  option,
  isSelected,
  isExpanded,
  isPurchasing,
  onSelect,
  onToggleBenefits,
  onSubscribe,
}) => {
  return (
    <div
      className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
        isSelected
          ? 'border-brand-primary dark:border-brand-gold ring-2 ring-brand-primary/20 dark:ring-brand-gold/20'
          : 'border-brand-light dark:border-brand-darkBorder'
      } bg-white dark:bg-brand-darkSurface shadow-sm`}
    >
      {/* Badge */}
      {option.badge && (
        <div className="bg-brand-gold/10 dark:bg-brand-gold/20 text-brand-gold text-[10px] font-semibold tracking-wider uppercase px-4 py-1.5 text-center">
          {option.badge}
        </div>
      )}

      {/* Tile Header - Clickable to select */}
      <button
        type="button"
        disabled={isPurchasing}
        onClick={onSelect}
        className="w-full text-left p-5 pb-4"
      >
        {/* Price Section - Large at top */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-brand-dark dark:text-white">
            {option.plan.displayPriceUSD}
          </span>
          <span className="text-base text-brand-medium/70 dark:text-brand-darkTextMuted">
            /{option.period === 'MONTHLY' ? 'month' : 'year'}
          </span>
        </div>

        {/* Billing Note */}
        <p className="text-sm text-brand-medium/60 dark:text-brand-darkTextMuted mt-1">
          {option.billingNote}
        </p>

        {/* Savings Message for Yearly */}
        {option.savingsMessage && (
          <p className="text-sm font-medium text-brand-gold mt-1">
            {option.savingsMessage}
          </p>
        )}

        {/* Title & Value Statement */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-brand-dark dark:text-white">
              {option.title}
            </h3>
            {isSelected && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-brand-primary/10 dark:bg-brand-gold/20 text-brand-primary dark:text-brand-gold rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-sm text-brand-medium/70 dark:text-brand-darkTextMuted mt-0.5">
            {option.valueStatement}
          </p>
        </div>
      </button>

      {/* Divider */}
      <div className="h-px bg-brand-light/70 dark:bg-brand-darkBorder mx-5" />

      {/* Benefits Section */}
      <MembershipBenefits
        previewBenefits={option.previewBenefits}
        benefitGroups={option.benefitGroups}
        isExpanded={isExpanded}
        onToggle={onToggleBenefits}
      />

      {/* Action Button */}
      <div className="px-5 pb-5 -mt-1">
        <button
          type="button"
          onClick={onSubscribe}
          disabled={!isSelected || isPurchasing}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            isSelected
              ? 'bg-brand-primary dark:bg-brand-gold text-white dark:text-brand-dark hover:opacity-90'
              : 'bg-brand-light dark:bg-brand-darkBorder text-brand-medium/50 dark:text-brand-darkTextMuted cursor-not-allowed'
          }`}
        >
          {isPurchasing && isSelected ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing...
            </>
          ) : isSelected ? (
            'Continue'
          ) : (
            'Select this plan'
          )}
        </button>
      </div>
    </div>
  );
};

// Helper to build plan options from UI plans
export const buildPlanOptions = (
  uiPlans: UISubscriptionPlan[]
): PlanOption[] => {
  const monthly = uiPlans.find((plan) => plan.billingPeriod === 'MONTHLY');
  const yearly = uiPlans.find((plan) => plan.billingPeriod === 'YEARLY');
  const options: PlanOption[] = [];

  // Calculate savings percentage
  const monthlyPrice = monthly
    ? parseFloat(monthly.displayPriceUSD.replace(/[^0-9.]/g, ''))
    : 0;
  const yearlyPrice = yearly
    ? parseFloat(yearly.displayPriceUSD.replace(/[^0-9.]/g, ''))
    : 0;
  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  const savingsPercent =
    monthlyPrice > 0
      ? Math.round(((monthlyPrice - yearlyMonthlyEquivalent) / monthlyPrice) * 100)
      : 0;

  if (monthly) {
    options.push({
      period: 'MONTHLY',
      plan: monthly,
      title: 'Monthly Membership',
      valueStatement: 'Flexible, pay month-to-month',
      billingNote: 'Renews monthly. Cancel anytime.',
      previewBenefits: [
        'Access all current courses',
        'New content added weekly',
        '1:1 community support',
      ],
      benefitGroups: [
        {
          category: 'Courses',
          items: ['Instant access to all current courses', 'Regularly updated content'],
        },
        {
          category: 'Sleep Music',
          items: ['Personalized sleep music', 'New tracks added twice a month'],
        },
        {
          category: 'Healing Music & Guided Meditation',
          items: [
            'Guided meditations library for relaxation, focus, and breathwork',
            'Mantra music with sacred chants and affirmations',
            'Chakra music journeys with healing frequencies for energy balance',
          ],
        },
        {
          category: 'Daily Features',
          items: [
            'Daily horoscope hub',
            'One-tap daily intention and gratitude',
          ],
        },
        {
          category: 'Breathwork',
          items: [
            'Mastering ancient timed breathing techniques',
          ],
        },
        {
          category: 'Community',
          items: ['Active 1:1 community support', 'Freedom to cancel anytime'],
        },
      ],
    });
  }

  if (yearly) {
    options.push({
      period: 'YEARLY',
      plan: yearly,
      title: 'Yearly Membership',
      valueStatement: `Best value, save ${savingsPercent}% per year`,
      billingNote: 'Renews yearly. Cancel anytime.',
      badge: 'Best Value',
      savingsMessage: `Equivalent to $${yearlyMonthlyEquivalent.toFixed(2)}/month`,
      previewBenefits: [
        'Access all current courses',
        'New content added weekly',
        '1:1 community support',
      ],
      benefitGroups: [
        {
          category: 'Courses',
          items: ['Instant access to all current courses', 'Regularly updated content'],
        },
        {
          category: 'Sleep Music',
          items: ['Personalized sleep music', 'New tracks added twice a month'],
        },
        {
          category: 'Community',
          items: ['Active 1:1 community support', 'Best value with annual commitment'],
        },
      ],
    });
  }

  return options;
};
