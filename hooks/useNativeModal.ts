import { useEffect, useRef, useMemo } from 'react';
import { useModalContext } from '../context/ModalContext';

/**
 * Hook to register a modal with ModalContext for navigation hiding and back button handling.
 * 
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Function to call when modal should close
 * 
 * @example
 * const MyModal = ({ isOpen, onClose }) => {
 *   useNativeModal(isOpen, onClose);
 *   return isOpen ? <div>Modal content</div> : null;
 * };
 */
export const useNativeModal = (isOpen: boolean, onClose: () => void) => {
  const { registerModal, unregisterModal } = useModalContext();
  
  // Generate stable modal ID only once - prevents infinite re-render loops
  // This ID persists for the lifetime of the component
  const modalId = useMemo(() => Date.now().toString() + Math.random().toString(), []);
  
  // Store the latest onClose function in a ref to avoid dependency issues
  // This prevents re-registration when onClose function reference changes between renders
  const onCloseRef = useRef(onClose);
  
  // Keep ref updated with latest onClose function
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Register/unregister modal based on isOpen state
  useEffect(() => {
    if (isOpen) {
      // Create wrapper that calls the latest onClose from ref
      // This ensures we always call the most recent onClose without re-registering
      registerModal(modalId, () => onCloseRef.current());
    }

    // Cleanup: always unregister on unmount or when isOpen changes
    return () => {
      unregisterModal(modalId);
    };
  }, [isOpen, modalId, registerModal, unregisterModal]);
};
