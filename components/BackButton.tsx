import React from 'react';
import { ArrowLeft } from 'lucide-react';

type BackButtonVariant = 'dark' | 'light' | 'adaptive';

interface BackButtonProps {
  variant: BackButtonVariant;
  onClick: () => void;
  'aria-label'?: string;
  className?: string;
}

/**
 * Standardized back button for subpages.
 * - 42px circular container
 * - Dark teal backgrounds: rgba(255,255,255,0.15) with white arrow
 * - Light backgrounds: rgba(0,0,0,0.08) with dark arrow
 * - 3px stroke weight on arrow icon
 */
export const BackButton: React.FC<BackButtonProps> = ({
  variant,
  onClick,
  'aria-label': ariaLabel = 'Back',
  className = '',
}) => {
  const base = 'w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 flex-shrink-0';
  const dark = 'bg-[rgba(255,255,255,0.15)] text-white hover:bg-[rgba(255,255,255,0.25)]';
  const light = 'bg-[rgba(0,0,0,0.08)] text-brand-dark hover:bg-[rgba(0,0,0,0.12)]';
  const adaptive = `${light} dark:bg-[rgba(255,255,255,0.15)] dark:text-white dark:hover:bg-[rgba(255,255,255,0.25)]`;

  const variantClass = variant === 'dark' ? dark : variant === 'light' ? light : adaptive;

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${base} ${variantClass} ${className}`}
    >
      <ArrowLeft size={20} strokeWidth={3} />
    </button>
  );
};
