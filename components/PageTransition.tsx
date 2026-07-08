import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Native iOS-like easing curve for smooth, soft transitions
// cubic-bezier(0.25, 0.46, 0.45, 0.94) - smooth and natural
const nativeEasing = [0.25, 0.46, 0.45, 0.94];

const pageVariants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
  },
  out: {
    opacity: 0,
  },
};

// Optimized transition config - soft but not too slow
const pageTransition = {
  type: 'tween' as const,
  ease: nativeEasing,
  duration: 0.3, // Slightly faster for better responsiveness while keeping it soft
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  // Memoize transition config to prevent recreation
  const transition = useMemo(() => pageTransition, []);

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={transition}
      className="w-full h-full"
      style={{ 
        willChange: 'opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(0)', // Force hardware acceleration
        WebkitTransform: 'translateZ(0)'
      }}
    >
      {children}
    </motion.div>
  );
};
