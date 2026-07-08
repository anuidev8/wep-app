import { useState, useEffect, useRef } from 'react';

/**
 * Hook to ensure a loading state displays for a minimum amount of time
 * to prevent flashing/flickering when data loads quickly
 */
export const useMinimumDisplayTime = (
  isLoading: boolean,
  minDisplayTime: number = 300
): boolean => {
  const [shouldShow, setShouldShow] = useState(isLoading);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start loading - record start time
      startTimeRef.current = Date.now();
      setShouldShow(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      // Loading finished - check if minimum time has passed
      if (startTimeRef.current !== null) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, minDisplayTime - elapsed);
        
        if (remaining > 0) {
          // Wait for remaining time before hiding
          timeoutRef.current = setTimeout(() => {
            setShouldShow(false);
            startTimeRef.current = null;
          }, remaining);
        } else {
          // Minimum time already passed, hide immediately
          setShouldShow(false);
          startTimeRef.current = null;
        }
      } else {
        setShouldShow(false);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, minDisplayTime]);

  return shouldShow;
};

