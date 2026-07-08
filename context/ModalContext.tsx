import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { App } from '@capacitor/app';

interface ModalContextType {
  registerModal: (id: string, close: () => void) => void;
  unregisterModal: (id: string) => void;
  isModalOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<{ id: string; close: () => void }[]>([]);

  const registerModal = useCallback((id: string, close: () => void) => {
    setModals((prev) => [...prev, { id, close }]);
  }, []);

  const unregisterModal = useCallback((id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Handle Hardware Back Button
  useEffect(() => {
    const handleBackButton = async () => {
      // If modals are open, close the top-most one
      if (modals.length > 0) {
        const topModal = modals[modals.length - 1];
        topModal.close();
      } else {
        // If no modals, let the app handle navigation (or exit if on root)
        // We don't need to do anything here if we want default behavior,
        // but often we might want to minimize app if on home screen.
        // For now, we simply don't stop propagation if no modals.
      }
    };

    const listener = App.addListener('backButton', (event) => {
        if (modals.length > 0) {
            // We have a modal open, so we handle the back button
            // and prevent default behavior (app exit)
            handleBackButton();
        } else {
            // No modals, let the router or default behavior handle it.
            // But verify if we are at root to exit app?
            // Usually React Router handles history.
            // If we want to exit app on back press at root:
            /*
            if (window.location.pathname === '/') {
                App.exitApp();
            }
            */
           // For now, we strictly handle "Modal Closing" priority.
        }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [modals]);

  return (
    <ModalContext.Provider
      value={{
        registerModal,
        unregisterModal,
        isModalOpen: modals.length > 0,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
};
