/**
 * Resolve deeplink/route from notification content.
 * Used when user taps a notification (push or in-app list) to navigate to the relevant screen.
 */

/** Maps notification title/body prefixes to breathing pattern IDs */
const BODY_TO_PATTERN: Array<{ match: RegExp | string; patternId: string }> = [
  { match: /calm diaphragmatic breathing|diaphragmatic breathing/i, patternId: 'CALM' },
  { match: /breath of fire/i, patternId: 'ENERGY' },
  { match: /alternate nostril breathing/i, patternId: 'BALANCE' },
  { match: /bhramari|humming bee/i, patternId: 'BHRAMARI' },
  { match: /4-7-8|relaxation breath/i, patternId: 'REST' },
  { match: /box breathing|sama vritti/i, patternId: 'FOCUS' },
  { match: /new releases?|guided meditation/i, patternId: 'GUIDED' },
  { match: /sleep music|chakra/i, patternId: 'SLEEP' },
];

export interface NotificationLike {
  title?: string;
  body?: string;
  data?: { deeplink?: string };
}

/**
 * Returns a deeplink path (e.g. /breathe?pattern=CALM) for the given notification, or null.
 * Uses data.deeplink if present, otherwise infers from body text.
 */
export function resolveDeeplinkFromNotification(n: NotificationLike): string | null {
  if (typeof n?.data?.deeplink === 'string' && n.data.deeplink.trim()) {
    const d = n.data.deeplink.trim();
    return d.startsWith('/') ? d : `/${d}`;
  }

  const text = `${n?.title || ''} ${n?.body || ''}`.trim();
  if (!text) return null;

  for (const { match, patternId } of BODY_TO_PATTERN) {
    if (typeof match === 'string') {
      if (text.toLowerCase().includes(match.toLowerCase())) {
        return patternIdToDeeplink(patternId);
      }
    } else if (match.test(text)) {
      return patternIdToDeeplink(patternId);
    }
  }

  return null;
}

function patternIdToDeeplink(patternId: string): string | null {
  switch (patternId) {
    case 'GUIDED':
      return '/meditate?tab=guided';
    case 'SLEEP':
      return '/sleep-music';
    default:
      return `/breathe?pattern=${patternId}`;
  }
}
