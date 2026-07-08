import React from 'react';
import { Bell } from 'lucide-react';
import { NativeModal } from './ui/NativeModal';

interface NotificationPromptModalProps {
  open: boolean;
  onAllow: () => void;
  onNotNow: () => void;
  isLoading?: boolean;
}

export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({
  open,
  onAllow,
  onNotNow,
  isLoading = false,
}) => {
  return (
    <NativeModal
      isOpen={open}
      onClose={onNotNow}
      variant="center"
      hideCloseButton
      className="p-6"
    >
      <div className="flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/30">
          <Bell size={32} className="text-brand-gold" />
        </div>
        <div>
          <h2
            id="notification-prompt-title"
            className="text-xl font-serif font-bold text-brand-dark dark:text-white mb-2"
          >
            Stay on track with reminders
          </h2>
          <p
            id="notification-prompt-desc"
            className="text-sm text-brand-primary dark:text-brand-darkTextMuted leading-relaxed"
          >
            Get mindful reminders for your breathing practice, gratitude check-ins, and restful sleep.
          </p>
        </div>
        <div className="flex w-full gap-3 mt-1">
          <button
            onClick={onNotNow}
            disabled={isLoading}
            className="flex-1 h-12 rounded-full border border-brand-light dark:border-white/20 text-sm font-semibold text-brand-medium dark:text-white/80 bg-transparent hover:bg-brand-light/10 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Not now
          </button>
          <button
            onClick={onAllow}
            disabled={isLoading}
            className="flex-1 h-12 rounded-full bg-brand-gold hover:bg-brand-gold/90 text-sm font-semibold text-white shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isLoading ? 'Enabling…' : 'Allow'}
          </button>
        </div>
      </div>
    </NativeModal>
  );
};
