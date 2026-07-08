/**
 * Social login: @capgo/capacitor-social-login for both Google and Apple.
 * Fully native flows (no web redirects on iOS/Android): GIDSignIn, ASAuthorizationController.
 * Secure ID/identity tokens for backend. Capacitor 8 compatible (no SPM conflict with RevenueCat).
 */

import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';

// --- Types ---

export type SocialProvider = 'google' | 'apple';

export interface SocialLoginResult {
  token: string;
  provider: SocialProvider;
}

/** User cancelled the native sign-in dialog */
export const SOCIAL_LOGIN_CANCELLED = 'SOCIAL_LOGIN_CANCELLED';

/** Thrown when user cancels; message is SOCIAL_LOGIN_CANCELLED so UI can handle silently */
export class SocialLoginCancelledError extends Error {
  constructor(provider: SocialProvider) {
    super(SOCIAL_LOGIN_CANCELLED);
    this.name = 'SocialLoginCancelledError';
  }
}

const getEnv = (key: string): string => {
  const value = (import.meta as any).env?.[key];
  return typeof value === 'string' ? value : '';
};

const hasGoogleConfig = (): boolean => {
  return !!(
    getEnv('VITE_GOOGLE_WEB_CLIENT_ID') ||
    getEnv('VITE_GOOGLE_IOS_CLIENT_ID') ||
    getEnv('VITE_GOOGLE_IOS_SERVER_CLIENT_ID')
  );
};

const hasAppleConfig = (): boolean => {
  return !!(
    getEnv('VITE_APPLE_CLIENT_ID') ||
    getEnv('VITE_APPLE_REDIRECT_URL')
  );
};

/**
 * Whether Apple Sign-In is available (iOS only; Capgo Apple is iOS-native).
 */
export const isAppleSignInSupported = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Whether Google Sign-In is available (native: iOS/Android; web: if config present).
 */
export const isGoogleSignInSupported = (): boolean => {
  if (Capacitor.getPlatform() === 'web') {
    return hasGoogleConfig();
  }
  return true;
};

/**
 * Initialize social login (Google + Apple via Capgo). Safe to call with partial config; no-ops if none.
 */
export const initializeSocialLogin = async (): Promise<void> => {
 // const googleWebClientId = getEnv('VITE_GOOGLE_WEB_CLIENT_ID');
 const googleWebClientId = '116109207837-nhhjo9bkk5nq3ha2hbq2judfum6d33g5.apps.googleusercontent.com';
  const googleIosClientId = getEnv('VITE_GOOGLE_IOS_CLIENT_ID');
  const googleIosServerClientId = getEnv('VITE_GOOGLE_IOS_SERVER_CLIENT_ID');
  const appleClientId = getEnv('VITE_APPLE_CLIENT_ID') || 'com.meditatewithabhi.theschoolofbreath';
  // Capgo docs: on iOS use empty redirectUrl to avoid any URLSession redirect fetch.
  const appleRedirectUrl =
    Capacitor.getPlatform() === 'ios'
      ? ''
      : getEnv('VITE_APPLE_REDIRECT_URL') || 'https://theschoolofbreath.com/auth/apple';

  const googleConfig: Record<string, string> = {};
  if (googleWebClientId) googleConfig.webClientId = googleWebClientId;
  if (googleIosClientId) googleConfig.iOSClientId = googleIosClientId;
  if (googleIosServerClientId) googleConfig.iOSServerClientId = googleIosServerClientId;
  if (Object.keys(googleConfig).length > 0) googleConfig.mode = 'online';

  const appleConfig: Record<string, string> = {};
  if (appleClientId) appleConfig.clientId = appleClientId;
  appleConfig.redirectUrl = appleRedirectUrl;

  if (Object.keys(googleConfig).length === 0 && Object.keys(appleConfig).length === 0) return;

  try {
    await SocialLogin.initialize({
      google: Object.keys(googleConfig).length > 0 ? googleConfig : undefined,
      apple: Object.keys(appleConfig).length > 0 ? appleConfig : undefined,
    });
  } catch (e) {
    console.warn('[SocialLogin] Init failed (non-fatal):', e);
  }
};

const isUserCancel = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('cancel') ||
    lower.includes('cancelled') ||
    lower.includes('user denied') ||
    lower.includes('1001') ||
    lower.includes('sign_in_canceled') ||
    lower.includes('12501')
  );
};

/**
 * Google Sign-In via native dialog (GIDSignIn). Returns idToken for backend.
 * Android: we omit scopes here so login works without MainActivity changes; the plugin still requests email/profile/openid.
 * To use custom scopes on Android, implement ModifiedMainActivityForSocialLoginPlugin in MainActivity — see
 * https://capgo.app/docs/plugins/social-login/google/android/
 */
export const signInWithGoogle = async (): Promise<SocialLoginResult> => {
  if (!hasGoogleConfig()) {
    throw new Error('Google Sign-In is not configured. Add VITE_GOOGLE_WEB_CLIENT_ID to .env');
  }

  try {
    console.log('Google login: starting...');
    // On Android, do NOT pass scopes unless MainActivity implements ModifiedMainActivityForSocialLoginPlugin
    // (see https://capgo.app/docs/plugins/social-login/google/android/). Plugin defaults include email/profile/openid.
    const isAndroid = Capacitor.getPlatform() === 'android';
    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        ...(Capacitor.getPlatform() === 'ios' ? { scopes: ['email', 'profile'], forcePrompt: true } : {}),
        ...(isAndroid
          ? { filterByAuthorizedAccounts: false, autoSelectEnabled: false }
          : {}),
        // Only pass scopes on web/iOS; on Android omit to avoid "main activity" requirement
        ...(Capacitor.getPlatform() === 'web' ? { scopes: ['email', 'profile'] } : {}),
      },
    });
    console.info('[SocialLogin] Google response:', response);
    const idToken =
      (response as { result?: { idToken?: string } })?.result?.idToken ??
      (response as { idToken?: string })?.idToken ??
      null;
    console.info('[SocialLogin] Google idToken present:', Boolean(idToken));
    if (!idToken) throw new Error('Google Sign-In did not return an ID token.');
    return { token: idToken, provider: 'google' };
  } catch (err) {
    if (isUserCancel(err)) throw new SocialLoginCancelledError('google');
    const raw = err instanceof Error ? err.message : String(err);
    // [16] Account reauth failed = SHA-1 not in Google Cloud or user disabled sign-in prompts
    if (Capacitor.getPlatform() === 'android' && (raw.includes('[16]') || raw.toLowerCase().includes('account reauth failed'))) {
      throw new Error(
        'Google Sign-In failed on this device. Add your app\'s debug SHA-1 to Google Cloud Console (Credentials → Create OAuth client ID → Android, package com.meditatewithabhi.theschoolofbreath). Run from project root: cd android && ./gradlew signingReport'
      );
    }
    throw new Error(raw || 'Google Sign-In failed.');
  }
};

/**
 * Apple Sign-In via native dialog (ASAuthorizationController on iOS). Returns identityToken for backend.
 * On non-iOS throws so UI can hide the button.
 */
export const signInWithApple = async (): Promise<SocialLoginResult> => {
  if (Capacitor.getPlatform() !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS.');
  }
  if (!hasAppleConfig() && !getEnv('VITE_APPLE_CLIENT_ID')) {
    throw new Error('Apple Sign-In is not configured. Add VITE_APPLE_CLIENT_ID to .env');
  }

  try {
    const response = await SocialLogin.login({
      provider: 'apple',
      options: { scopes: ['email', 'name'] },
    });
    const identityToken =
      (response as { result?: { idToken?: string } })?.result?.idToken ??
      (response as { identityToken?: string })?.identityToken ??
      (response as { idToken?: string })?.idToken ??
      null;
    if (!identityToken) throw new Error('Apple Sign-In did not return an identity token.');
    return { token: identityToken, provider: 'apple' };
  } catch (err) {
    if (isUserCancel(err)) throw new SocialLoginCancelledError('apple');
    throw new Error(err instanceof Error ? err.message : 'Apple Sign-In failed.');
  }
};

/**
 * Run native sign-in for the given provider.
 */
export const signInWithProvider = async (provider: SocialProvider): Promise<SocialLoginResult> => {
  if (provider === 'google') return signInWithGoogle();
  return signInWithApple();
};
