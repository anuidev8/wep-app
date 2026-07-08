const PRIVATE_RELAY_DOMAIN = 'privaterelay.appleid.com';

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const isLikelyHumanName = (value: string): boolean => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return false;
  if (normalized.includes('@')) return false;

  const compact = normalized.replace(/\s+/g, '');
  if (!/[A-Za-z]/.test(compact)) return false;
  if (/\d/.test(compact)) return false;
  if (compact.length >= 6 && !/[aeiouy]/i.test(compact)) return false;

  return true;
};

export const isApplePrivateRelayEmail = (email: string): boolean =>
  email.toLowerCase().endsWith(`@${PRIVATE_RELAY_DOMAIN}`);

const titleCase = (value: string): string =>
  value
    .split(' ')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
    .join(' ');

const deriveNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] ?? '';
  const cleaned = normalizeWhitespace(localPart.replace(/[._+-]+/g, ' '));
  return titleCase(cleaned);
};

type UserDisplayNameOptions = {
  fullName?: string | null;
  email?: string | null;
  fallback?: string;
};

export const getUserDisplayName = ({
  fullName,
  email,
  fallback = 'Friend',
}: UserDisplayNameOptions): string => {
  const cleanedFullName =
    typeof fullName === 'string' ? normalizeWhitespace(fullName) : '';

  if (cleanedFullName && isLikelyHumanName(cleanedFullName)) {
    return cleanedFullName;
  }

  const normalizedEmail =
    typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (normalizedEmail && !isApplePrivateRelayEmail(normalizedEmail)) {
    const derivedName = deriveNameFromEmail(normalizedEmail);
    if (derivedName && isLikelyHumanName(derivedName)) {
      return derivedName;
    }
  }

  return fallback;
};

export const getUserInitials = (displayName: string, fallback = 'ME'): string => {
  const cleaned = normalizeWhitespace(displayName);
  if (!cleaned) return fallback;

  const parts = cleaned.split(' ').filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};
