import React, { useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useNativeModal } from '../../hooks/useNativeModal';

export interface NativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: 'center' | 'bottom-sheet';
  title?: string;
  className?: string;
  hideCloseButton?: boolean;
}

export const NativeModal: React.FC<NativeModalProps> = ({
  isOpen,
  onClose,
  children,
  variant = 'center',
  title,
  className = '',
  hideCloseButton = false,
}) => {
  // Register with back button handler
  useNativeModal(isOpen, onClose);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center sm:items-center pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Content */}
          {variant === 'center' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`relative w-full max-w-md bg-white dark:bg-brand-darkSurface rounded-2xl shadow-2xl m-4 pointer-events-auto overflow-hidden ${className}`}
              role="dialog"
              aria-modal="true"
            >
              {children}
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.05}
              onDragEnd={handleDragEnd}
              className={`relative w-full max-w-lg bg-white dark:bg-brand-darkSurface rounded-t-[32px] shadow-2xl pointer-events-auto pb-safe ${className}`}
              role="dialog"
              aria-modal="true"
            >
              {/* Drag Handle */}
              <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
                 <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600/50" />
              </div>

              {/* Header */}
              {(title || !hideCloseButton) && (
                <div className="flex items-center justify-between px-6 py-2">
                  {title && (
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {title}
                    </h2>
                  )}
                  {!hideCloseButton && (
                     <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-auto"
                        aria-label="Close"
                      >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                      </button>
                  )}
                </div>
              )}

              <div className="px-6 pb-6">
                 {children}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
