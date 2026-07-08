import React from 'react';
import { BackButton } from './BackButton';

export type ScreenHeaderVariant = 'dark' | 'light';

export interface ScreenHeaderProps {
  /** Back button press handler. When provided, the back arrow is shown. */
  onBack: () => void;
  /** Title shown in the center of the header (string or custom React node, e.g. icon + text). */
  title: React.ReactNode;
  /** Visual variant: dark (for dark backgrounds) or light. */
  variant?: ScreenHeaderVariant;
  /** Optional right-side slot (e.g. actions, close button). */
  rightSlot?: React.ReactNode;
  /** Optional class for the root header bar. */
  className?: string;
  /** Accessible label for the back button. */
  backAriaLabel?: string;
  /** Optional custom title color class (e.g. 'text-brand-gold'). Overrides default variant color. */
  titleColor?: string;
}

const SAFE_TOP = 'calc(1.5rem + env(safe-area-inset-top, 0px))';

/**
 * Reusable screen header: back arrow + title in one bar, with safe area.
 * Follows iOS-style navigation: single row, safe area inset, consistent tap target.
 * Matches font sizes and spacing from Sleep Music and ChakraMantras screens.
 * Use on any screen that needs "Back" + title (e.g. Morning Ritual, Settings, Journals).
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  onBack,
  title,
  variant = 'dark',
  rightSlot,
  className = '',
  backAriaLabel = 'Back',
  titleColor,
}) => {
  const defaultTitleColor = variant === 'dark' ? 'text-white' : 'text-brand-dark';
  const finalTitleColor = titleColor || defaultTitleColor;

  return (
    <header
      className={`relative flex items-center justify-between w-full shrink-0 z-20 px-6 min-h-[4rem] ${className}`}
      style={{ paddingTop: SAFE_TOP, paddingBottom: '1rem' }}
    >
      <div className="flex items-center justify-start min-w-0 flex-1">
        <BackButton
          variant={variant}
          onClick={onBack}
          aria-label={backAriaLabel}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-14">
        <div className={`text-xl font-serif font-bold text-center truncate max-w-full ${finalTitleColor}`}>
          {typeof title === 'string' ? title : title}
        </div>
      </div>

      <div className="flex items-center justify-end min-w-[42px] flex-1">
        {rightSlot ?? <span className="w-[42px]" aria-hidden />}
      </div>
    </header>
  );
};
