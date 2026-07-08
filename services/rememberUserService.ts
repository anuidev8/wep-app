import { Preferences } from '@capacitor/preferences';

const rememberEmailKey = 'breathAppRememberedEmail';

export const setRememberedEmail = async (email: string): Promise<void> => {
  if (!email) return;
  try {
    await Preferences.set({ key: rememberEmailKey, value: email });
  } catch (e) {
    console.warn('[RememberUser] Capacitor Preferences failed, using localStorage', e);
    localStorage.setItem(rememberEmailKey, email);
  }
};

export const getRememberedEmail = async (): Promise<string> => {
  try {
    const { value } = await Preferences.get({ key: rememberEmailKey });
    return value || '';
  } catch (e) {
    console.warn('[RememberUser] Capacitor Preferences failed, using localStorage', e);
    return localStorage.getItem(rememberEmailKey) || '';
  }
};

export const clearRememberedEmail = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: rememberEmailKey });
  } catch (e) {
    console.warn('[RememberUser] Capacitor Preferences failed, using localStorage', e);
    localStorage.removeItem(rememberEmailKey);
  }
};
