import React from 'react';

/** Muted gold for last-breath labels. Use at 60–80% opacity. */
export const LAST_BREATH_GOLD = '#C9A85D';

export interface LastBreathPromptProps {
  /** When true, show the prompt; when false, hide but reserve layout space. */
  visible: boolean;
  /** Secondary text below orb. Default: "Exhale fully — last breath." */
  text?: string;
  /** Optional className for the fixed-height container. */
  className?: string;
}

/**
 * Shared "last breath" prompt used by all breathing patterns (box, 4-7-8, triangle, etc.).
 * Always reserves fixed height so adding/removing the label does not cause layout jump.
 * Driven by isLastBreath / lastBreathText state from the parent.
 */
export const LastBreathPrompt: React.FC<LastBreathPromptProps> = ({
  visible,
  text = 'Exhale fully — last breath.',
  className = '',
}) => {
  return (
    <div
      className={`min-h-[2rem] flex items-center justify-center transition-opacity duration-500 ${className}`}
      role={visible ? 'status' : 'presentation'}
      aria-hidden={!visible}
    >
      <span
        className="text-sm font-serif font-medium tracking-wide"
        style={{
          color: LAST_BREATH_GOLD,
          opacity: visible ? 0.75 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        {text}
      </span>
    </div>
  );
};
