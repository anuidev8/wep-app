import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type BenefitGroup = {
  category: string;
  items: string[];
};

interface MembershipBenefitsProps {
  previewBenefits: string[];
  benefitGroups: BenefitGroup[];
  isExpanded: boolean;
  onToggle: () => void;
}

export const MembershipBenefits: React.FC<MembershipBenefitsProps> = ({
  previewBenefits,
  benefitGroups,
  isExpanded,
  onToggle,
}) => {
  return (
    <div className="px-5 pt-4 pb-5">
      {/* Preview Benefits (always visible) */}
      <div className="space-y-2">
        {previewBenefits.map((benefit, idx) => (
          <div key={idx} className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 dark:bg-brand-gold/20">
              <Check size={12} className="text-brand-primary dark:text-brand-gold" strokeWidth={3} />
            </div>
            <span className="text-sm text-brand-medium dark:text-brand-darkText">
              {benefit}
            </span>
          </div>
        ))}
      </div>

      {/* Accordion Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 mt-3 text-sm font-medium text-brand-primary dark:text-brand-gold hover:underline"
      >
        <span>{isExpanded ? 'Hide benefits' : '+ View all benefits'}</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Benefits */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[800px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-4">
          {benefitGroups.map((group) => (
            <div key={group.category}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 dark:text-brand-darkTextMuted mb-2">
                {group.category}
              </h4>
              <div className="space-y-1.5">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary/10 dark:bg-brand-gold/20">
                      <Check size={10} className="text-brand-primary dark:text-brand-gold" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-brand-medium/80 dark:text-brand-darkTextMuted">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Static benefits data
export const MEMBERSHIP_BENEFITS = {
  preview: [
    'Access all current courses',
    'New content added weekly',
    '1:1 community support',
  ],
  groups: [
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
        'Guided meditations library for relaxation',
        'Mantra music with sacred chants',
        'Chakra music for energy balance',
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
};
