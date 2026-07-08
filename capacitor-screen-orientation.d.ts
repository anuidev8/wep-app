declare module '@capacitor/screen-orientation' {
  export interface ScreenOrientationChangeEvent {
    type: string;
  }

  export interface OrientationLockOptions {
    orientation: string;
  }

  export interface ScreenOrientationPlugin {
    lock(options: OrientationLockOptions): Promise<void>;
    unlock(): Promise<void>;
    addListener(
      eventName: 'screenOrientationChange',
      listenerFunc: (info: ScreenOrientationChangeEvent) => void
    ): Promise<{ remove: () => void }>;
    removeAllListeners(): Promise<void>;
  }

  export const ScreenOrientation: ScreenOrientationPlugin;
}
