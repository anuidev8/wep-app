/**
 * Pads resources/icon.png to 1024x1024 (Capacitor required size).
 * Centers the image on a white background - no upscaling.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const RESOURCES = path.join(ROOT, 'resources');
const ICON_SRC = path.join(RESOURCES, 'icon.png');
const ICON_OUT = path.join(RESOURCES, 'icon-1024.png');
const ICON_FINAL = path.join(RESOURCES, 'icon.png');
const SIZE = 1024;

const fs = await import('fs');
if (!fs.existsSync(ICON_SRC)) {
  console.error('resources/icon.png not found');
  process.exit(1);
}

const meta = await sharp(ICON_SRC).metadata();
const w = meta.width;
const h = meta.height;
const left = Math.round((SIZE - w) / 2);
const top = Math.round((SIZE - h) / 2);

const buf = await sharp(ICON_SRC).toBuffer();
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
  .toFile(ICON_OUT);

fs.renameSync(ICON_OUT, ICON_FINAL);
console.log(`Created ${SIZE}x${SIZE} icon at resources/icon.png (centered ${w}x${h}). Replace with a real 1024x1024 export for best quality.`);
