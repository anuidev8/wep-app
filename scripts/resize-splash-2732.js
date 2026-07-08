/**
 * Pads resources/splash.png to 2732x2732 (Capacitor recommended size).
 * Centers the image on a white background - no upscaling, preserves sharpness.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const RESOURCES = path.join(ROOT, 'resources');
const ANDROID_NODPI = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'drawable-nodpi', 'splash.png');
const SPLASH_SRC = path.join(RESOURCES, 'splash.png');
const SPLASH_OUT = path.join(RESOURCES, 'splash-2732.png');
const SPLASH_FINAL = path.join(RESOURCES, 'splash.png');
const SIZE = 2732;

const fs = await import('fs');
const inputPath = fs.existsSync(ANDROID_NODPI) ? ANDROID_NODPI : SPLASH_SRC;
const meta = await sharp(inputPath).metadata();
const w = meta.width;
const h = meta.height;
const left = Math.round((SIZE - w) / 2);
const top = Math.round((SIZE - h) / 2);

const buf = await sharp(inputPath).toBuffer();
await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  }
})
  .composite([{ input: buf, left, top }])
  .png({ compressionLevel: 6 })
  .toFile(SPLASH_OUT);

fs.renameSync(SPLASH_OUT, SPLASH_FINAL);
console.log(`Created ${SIZE}x${SIZE} splash at resources/splash.png (centered ${w}x${h}, source: ${path.basename(inputPath)})`);
