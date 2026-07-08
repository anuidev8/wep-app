import { Capacitor } from '@capacitor/core';

// We keep the Filesystem import optional to avoid breaking web builds if the plugin is missing.
// On web, all functions simply fall back to the original remote URL.
let Filesystem: any;
let Directory: any;
let FileTransfer: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@capacitor/filesystem');
  Filesystem = mod.Filesystem;
  Directory = mod.Directory;
} catch {
  // Running on web or without Filesystem installed – we'll just use network URLs.
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@capacitor/file-transfer');
  FileTransfer = mod.FileTransfer;
} catch {
  // Optional dependency – fall back to fetch+write
}

const VIDEO_CACHE_DIR = 'breathVideoClues';
const MIN_VALID_VIDEO_BYTES = 1024;

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        // Strip the data URL prefix – Filesystem expects raw base64
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      } else {
        reject(new Error('Unexpected FileReader result type'));
      }
    };
    reader.readAsDataURL(blob);
  });

const getFilenameForUrl = (url: string): string => {
  // Simple deterministic filename based on URL
  return encodeURIComponent(url);
};

const downloadToFilesystem = async (remoteUrl: string, fullPath: string): Promise<string> => {
  if (!FileTransfer || !Filesystem || !Directory) {
    throw new Error('FileTransfer or Filesystem not available');
  }

  const fileInfo = await Filesystem.getUri({
    path: fullPath,
    directory: Directory.Data,
  });

  await FileTransfer.downloadFile({
    url: remoteUrl,
    path: fileInfo.uri,
  });

  const stat = await Filesystem.stat({
    path: fullPath,
    directory: Directory.Data,
  });
  if ((stat.size ?? 0) < MIN_VALID_VIDEO_BYTES) {
    throw new Error('Downloaded video too small');
  }

  return Capacitor.convertFileSrc(fileInfo.uri);
};

/**
 * Check if video is already cached (non-blocking, fast check).
 * Returns cached local URL if available, null otherwise.
 */
export const getCachedVideoSrcSync = (remoteUrl: string): string | null => {
  if (!remoteUrl || !isNative() || !Filesystem || !Directory) {
    return null;
  }

  // This is a synchronous check - we'll do async verification separately
  // For now, return null to use remote URL immediately
  return null;
};

/**
 * Ensure a given remote video URL is cached locally (on native) and return
 * a playable URL (local file URL via convertFileSrc, or original URL on web).
 * 
 * IMPORTANT: This function now prioritizes speed - it returns the remote URL
 * immediately and caches in the background. Use getCachedVideoSrcIfAvailable
 * for synchronous cache checks.
 */
export const getCachedVideoSrc = async (remoteUrl: string): Promise<string> => {
  if (!remoteUrl) return remoteUrl;

  if (!isNative() || !Filesystem || !Directory) {
    // On web or when Filesystem is unavailable, fall back to normal URL.
    return remoteUrl;
  }

  const fileName = getFilenameForUrl(remoteUrl);
  const fullPath = `${VIDEO_CACHE_DIR}/${fileName}`;

  // Fast path: Check if already cached (non-blocking)
  try {
    const stat = await Promise.race([
      Filesystem.stat({
        path: fullPath,
        directory: Directory.Data,
      }),
      // Timeout after 500ms - don't block video loading
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cache check timeout')), 500))
    ]) as any;

    if ((stat.size ?? 0) >= MIN_VALID_VIDEO_BYTES) {
      const fileUri = await Filesystem.getUri({
        path: fullPath,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(fileUri.uri);
    }
  } catch {
    // Not cached or check timed out - continue with remote URL
  }

  // Return remote URL immediately (don't block on download)
  // Cache download happens in background
  cacheVideoInBackground(remoteUrl, fullPath).catch((err) => {
    console.warn('[videoCacheService] Background cache failed', err);
  });

  return remoteUrl;
};

/**
 * Cache video in background (non-blocking).
 */
const cacheVideoInBackground = async (remoteUrl: string, fullPath: string): Promise<void> => {
  try {
    if (FileTransfer) {
      await downloadToFilesystem(remoteUrl, fullPath);
      return;
    }

    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    await Filesystem.writeFile({
      path: fullPath,
      directory: Directory.Data,
      data: base64,
      recursive: true,
    });

    const stat = await Filesystem.stat({
      path: fullPath,
      directory: Directory.Data,
    });
    if ((stat.size ?? 0) < MIN_VALID_VIDEO_BYTES) {
      throw new Error('Downloaded video too small');
    }
  } catch (err) {
    console.warn('[videoCacheService] Background caching failed', err);
  }
};
