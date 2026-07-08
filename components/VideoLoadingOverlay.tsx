import React from 'react';

/**
 * Loading overlay shown on top of video players while the video (from API/remote URL) is loading.
 * Matches MorningRitual TRANSITION phase pattern: fixed overlay with gradient + spinner + message.
 * Use inside the same render as the player so layout doesn't swap (no flash/empty state).
 * Use high zIndex (e.g. 250) when used inside a full-screen player (z-[200]) so overlay stays above native video chrome on Capacitor.
 */
interface VideoLoadingOverlayProps {
  message?: string;
  show: boolean;
  /** Use higher value (e.g. 250) when parent has z-[200] so overlay is above native video layer on iOS/Android */
  zIndex?: number;
}

export const VideoLoadingOverlay: React.FC<VideoLoadingOverlayProps> = ({
  message = 'loading...',
  show,
  zIndex = 50,
}) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-[#0f172a]"
      style={{ zIndex }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2F5A6C_0%,_#0f172a_70%)] opacity-90" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-12 h-12 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mb-4" />
        <p className="text-brand-gold/80 text-xs tracking-widest uppercase">{message}</p>
      </div>
    </div>
  );
};
