import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  iconColor?: string;
  valueColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  iconColor = '#2F5A6C',
  valueColor = '#1A4D5C',
}) => {
  return (
    <div className="
      flex flex-col items-center justify-center
      bg-white dark:bg-brand-darkSurface rounded-2xl px-6 py-6
      shadow-md hover:shadow-lg transition-shadow duration-300
      border border-brand-light dark:border-brand-darkBorder/50
      min-h-[160px] w-full
    ">
      {/* Icon Container */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shrink-0"
        style={{ backgroundColor: `${iconColor}10` }}
      >
        <Icon className="w-7 h-7" style={{ color: iconColor }} strokeWidth={2} />
      </div>

      {/* Value */}
      <span
        className="text-3xl font-bold mb-2 leading-none"
        style={{ color: valueColor }}
      >
        {value}
      </span>

      {/* Label */}
      <span className="text-sm text-brand-medium dark:text-brand-darkTextMuted text-center font-medium leading-tight">
        {label}
      </span>
    </div>
  );
};

