import React, { useEffect } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';

// Maps to voice-recording.riv: Viewing (idle), Hover (ready), Click (listening), Fire (thinking/speaking).
// In Rive: create e.g. VoiceAgentMachine, number input "state", route 0→Viewing, 1→Hover, 2→Click, 3→Fire.
const STATE_MACHINE_NAME = 'State Machine 1';
const INPUT_NAME = 'state';

export type VoiceState = 'idle' | 'ready' | 'listening' | 'thinking';

const STATE_TO_RIVE: Record<VoiceState, number> = {
  idle: 0,      // Viewing – default idle
  ready: 1,     // Hover – ready to listen (user about to tap mic)
  listening: 2, // Click – mic on, STT running
  thinking: 3,  // Fire – recording active / agent processing or speaking
};

/** Responsive default: scales with viewport, works on mobile and web. */
const RESPONSIVE_SIZE = 'clamp(56px, 20vmin, 96px)';

interface VoiceAgentIndicatorProps {
  state: VoiceState;
  /** Optional: URL to .riv file. Defaults to assets/voice-recording.riv */
  src?: string;
  /** Width: number (px) or CSS string. Omit for responsive default (mobile + web). */
  width?: number | string;
  /** Height: number (px) or CSS string. Omit for responsive default. */
  height?: number | string;
  /** Scale the animation (e.g. 1.5 = 150%). Default 1. */
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

const defaultRivUrl = new URL('../assets/voice-recording.riv', import.meta.url).href;

/**
 * Listening indicator for AI coach. Adapts to all screens (mobile + web).
 * Does not take full screen. Use next to mic or in chat header.
 */
export function VoiceAgentIndicator({
  state,
  src: srcProp,
  width,
  height,
  scale = 1,
  className,
  style,
}: VoiceAgentIndicatorProps) {
  const sizeWidth = width ?? RESPONSIVE_SIZE;
  const sizeHeight = height ?? RESPONSIVE_SIZE;

  const { rive, RiveComponent } = useRive({
    src: srcProp ?? defaultRivUrl,
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });

  const stateInput = useStateMachineInput(rive, STATE_MACHINE_NAME, INPUT_NAME);

  useEffect(() => {
    if (!stateInput) return;
    stateInput.value = STATE_TO_RIVE[state];
  }, [state, stateInput]);

  return (
    <div
      className={className}
      style={{
        width: sizeWidth,
        height: sizeHeight,
        minWidth: typeof sizeWidth === 'number' ? sizeWidth : undefined,
        minHeight: typeof sizeHeight === 'number' ? sizeHeight : undefined,
        overflow: scale !== 1 ? 'visible' : undefined,
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'center center',
        }}
      >
        <RiveComponent style={{ width: '100%', height: '100%' , transform:"scale(2)  translateY(35%)" }} />
      </div>
    </div>
  );
}
