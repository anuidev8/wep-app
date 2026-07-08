/// <reference types="@capacitor/splash-screen" />
import type { CapacitorConfig } from '@capacitor/cli';
import { networkInterfaces } from 'node:os';

// Live reload dev server used only when CAP_DEV_SERVER=true
// iOS Simulator: 127.0.0.1. Android Emulator: 10.0.2.2 (alias for host).
// Physical Android: LAN IP via CAP_ANDROID_LAN_IP or auto-detect.
function getDevServerUrl(): string {
  const platform = process.env.CAP_PLATFORM ?? '';
  if (platform === 'ios') {
    return 'http://127.0.0.1:3000';
  }
  // Android emulator: 10.0.2.2 is the host's localhost
  if (process.env.CAP_ANDROID_DEVICE !== 'true') {
    return 'http://10.0.2.2:3000';
  }
  // Physical Android device: use explicit IP or auto-detect LAN
  const explicitIp = process.env.CAP_ANDROID_LAN_IP;
  if (explicitIp) return `http://${explicitIp}:3000`;
  const nets = networkInterfaces();
  for (const name of ['en0', 'en1']) {
    const net = nets[name];
    if (!net) continue;
    for (const n of net) {
      if (n.family === 'IPv4' && !n.internal) {
        return `http://${n.address}:3000`;
      }
    }
  }
  return 'http://10.0.2.2:3000';
}
const serverUrl = getDevServerUrl();
if (process.env.CAP_DEV_SERVER === 'true') {
  console.log('[Capacitor] Live reload URL:', serverUrl, '\n');
}
const isDevServer = process.env.CAP_DEV_SERVER === 'true';

const config = {
  appId: 'com.meditatewithabhi.theschoolofbreath',
  appName: 'School Of Breath',
  webDir: 'dist',
  ...(isDevServer && {
    server: {
      url: serverUrl,
      cleartext: true
    }
  }),
  plugins: {
    NativeAudio: {
      background: true,
      showNotification: true,
      focus: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    CapacitorHttp: {
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: true
    }
  },
  ios: {
    // These go HERE for iOS-specific (syncs to Info.plist)
    version: '5.5',           // CFBundleShortVersionString
    buildNumber: '11',         // CFBundleVersion
    contentInset: 'automatic',
    scrollEnabled: true,
    webContentsDebuggingEnabled: true  // Safari Web Inspector (Capacitor debugging skill)
  }
} as CapacitorConfig;

export default config;
