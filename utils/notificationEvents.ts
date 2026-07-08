/**
 * Single source for notification refresh events.
 * Dispatch when notifications change (saved, app foreground) so Home badge and Notifications list update.
 */
export const NOTIFICATION_UPDATED_EVENT = 'breathApp:notifications-updated';

/**
 * Dispatch when user disables notifications and devices are unregistered.
 * Hook clears lastSentToken so re-enable will trigger register-device again.
 */
export const NOTIFICATION_UNREGISTERED_EVENT = 'breathApp:notifications-unregistered';

export const dispatchNotificationUpdated = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATED_EVENT));
  }
};

export const dispatchNotificationUnregistered = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_UNREGISTERED_EVENT));
  }
};
