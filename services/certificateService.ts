import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { GoogleGenAI } from "@google/genai";

/**
 * Captures a screenshot of a DOM element
 * Waits for the element to be ready before capturing
 */
export const captureElementScreenshot = async (
  element: HTMLElement,
  options?: {
    width?: number;
    height?: number;
    scale?: number;
    backgroundColor?: string;
  }
): Promise<string> => {
  const {
    width = element.offsetWidth,
    height = element.offsetHeight,
    scale = 2, // Higher scale for better quality
    backgroundColor = '#0f172a'
  } = options || {};

  // Wait for any pending renders/animations
  await new Promise(resolve => requestAnimationFrame(resolve));

  // Additional small delay to ensure fonts and images are loaded
  await new Promise(resolve => setTimeout(resolve, 100));

  const canvas = await html2canvas(element, {
    width,
    height,
    scale,
    useCORS: true,
    backgroundColor,
    logging: false,
    allowTaint: true,
  });

  return canvas.toDataURL('image/png');
};

/**
 * Certificate data interface for Gemini generation
 * Extended to support Spotify Wrapped style annual recap.
 */
export interface CertificateData {
  // Core session / certificate info
  userName: string;
  date: string;
  message: string;
  symbolType: 'air' | 'water' | 'fire' | 'space' | 'earth';
  sessionDurationMinutes?: number;

  // Optional \"year in review\" metrics (for Spotify Wrapped style layouts)
  yearTitle?: string;              // e.g. \"Your Year at The School of Breath\"
  totalMinutes?: number;           // e.g. 8562
  highestAchievementTitle?: string; // e.g. \"Highest Achievement\"
  highestAchievementLabel?: string; // e.g. \"Breath Bearer\"
  highestAchievementLevel?: string; // e.g. \"Final Level\"
  sigilsEarned?: number;           // e.g. 5
  totalSigils?: number;            // e.g. 5
  meditationsCompleted?: number;   // e.g. 172
  longestStreakDays?: number;      // e.g. 37
  percentileText?: string;         // e.g. \"You are among the 1% of initiates\"
  memberId?: string;               // e.g. \"SOB-ADEPT-028391\"
  tagline?: string;                // e.g. \"Breathe deeply. The journey continues.\"
  ctaLabel?: string;               // e.g. \"Share Your Journey\"
}

/**
 * Generates a certificate image using Google Gemini 2.5 Flash Image (Nano Banana)
 * Replaces the screenshot/canvas approach with AI-generated certificate
 */
export const generateCertificateWithGemini = async (
  data: CertificateData
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

    // Create a detailed prompt describing the certificate design
    const symbolDescriptions: Record<string, string> = {
      air: 'elegant flowing curves representing wind and air movement',
      water: 'gentle wave-like patterns representing water and flow',
      fire: 'dynamic flame-like shapes representing fire and energy',
      space: 'geometric circle with intersecting lines representing space and cosmos',
      earth: 'grounded geometric shapes representing earth and stability'
    };

    const prompt = `Act as a world‑class visual designer.
Create a \"year in review\" certificate for a breathwork app.

STYLE REFERENCES (IMPORTANT):
- Use the exact visual language of the provided reference poster(s): cosmic night background, ornate thin gold frame, sacred‑geometry linework, and large elegant gold numerals.
- Match the reference layout style with a strong central vertical \"spine\" (a glowing line running top-to-bottom through the center) with small icons/ornaments along it.
- Keep the same overall composition: headline at top, balanced stat cards, a bold central highlight line, and a bottom identity + CTA + QR area.

DATA RULES (IMPORTANT):
- ONLY use the exact metrics/numbers provided below. Do NOT invent or guess any numbers.
- If a metric is missing, OMIT that card/section cleanly (do not show 0, N/A, placeholders, or fake defaults).
- Keep every displayed number accurate and clearly readable.

CORE THEME:
- Title: \"${data.yearTitle || 'Your Year at The School of Breath'}\"
- Overall feeling: mystical, Vedic, celebratory, as if revealing a secret initiation report for the user.

BACKGROUND & FRAME:
- Deep dark navy / cosmic night background (#0f172a) with rich star‑like grain and glowing specks.
- Thin, ornate golden frame around the edges, with subtle corner flourishes, similar to a mystical tarot or sacred geometry card.
- Use warm gold for lines and typography: #D4A574 with varying opacities.

LAYOUT (VERTICAL PORTRAIT, 3:4 RATIO):
1) Hero header at the top:
   - Centered headline: \"${data.yearTitle || 'Your Year at The School of Breath'}\" in elegant serif, warm gold, large size.
   - Small subtle symbol or wave motif above or below the title.

2) Stats grid (inspired by Spotify Wrapped / recap cards), arranged in a balanced, symmetric composition:
   - Top left card (ONLY if totalMinutes is provided): \"Breath Practice Minutes\" with a small icon and the value \"${data.totalMinutes ?? ''}\" and caption \"total minutes\".
   - Top right card (achievement card, show ONLY if at least one of these is provided: highestAchievementTitle/Label/Level):
     Title: \"${data.highestAchievementTitle || ''}\"
     Main label: \"${data.highestAchievementLabel || ''}\"
     Sublabel: \"${data.highestAchievementLevel || ''}\"
   - Bottom left card: choose ONE of these, following the reference style:
     A) (ONLY if longestStreakDays is provided) \"Longest Streak\" with value \"${data.longestStreakDays ?? ''}\" and caption \"days in a row\" plus a flame/drop icon.
     B) (ONLY if sigilsEarned and totalSigils are provided) \"Sigils Earned\" with value \"${(data.sigilsEarned != null && data.totalSigils != null) ? `${data.sigilsEarned}/${data.totalSigils}` : ''}\" and caption \"Elemental Sigils\".
   - Bottom right card (ONLY if meditationsCompleted is provided): \"Meditations Completed\" with value \"${data.meditationsCompleted ?? ''}\" and caption \"total sessions\".
   - Use clean, card‑like containers with thin golden outlines and minimal iconography, all in the same visual language as the reference image.

3) Central highlight (ONLY if percentileText is provided):
   - Text: \"${data.percentileText || ''}\" in large, impactful serif type, centered.

4) Name & identity block near the bottom:
   - Line: \"Congrats, ${data.userName}\" in prominent serif gold type.
   - Smaller ID line underneath (ONLY if memberId is provided): \"${data.memberId || ''}\".
   - Tagline below (ONLY if tagline is provided) in softer gold: \"${data.tagline || ''}\"

5) Footer:
   - Small text: \"The School of Breath\" in very subtle gold (40% opacity), centered or aligned in the lower area.
   - A pill‑shaped golden button (ONLY if ctaLabel is provided) with label \"${data.ctaLabel || ''}\".
   - Include a small QR‑style square in the bottom corner as a decorative element (no need to be scannable), matching the reference placement.

SYMBOL & ORNAMENTS:
- Integrate a central ${symbolDescriptions[data.symbolType]} motif in the middle of the composition, tying the whole layout together.
- Use delicate sacred geometry lines and arcs that echo the reference image, but keep everything readable and not cluttered.

TYPOGRAPHY & STYLE:
- Elegant serif fonts (Garamond / Baskerville‑like) for headings and key stats.
- Light to medium weights, with generous letter spacing for a refined, ceremonial feel.
- Maintain very high legibility of all numbers and labels.

TECHNICAL:
- Aspect ratio: 3:4 (portrait), suitable for mobile sharing.
- High resolution, crisp text, and clean vector‑like golden lines.
- No photos of real people; everything should look like a designed, illustrated certificate poster.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      // Per js-genai docs, `contents` can be a plain string for image models.
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: '3:4', // Portrait orientation for certificates
        },
      },
    });

    // Extract the generated image from the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Image = part.inlineData.data;
        return `data:image/png;base64,${base64Image}`;
      }
    }

    throw new Error("No image data found in Gemini response.");
  } catch (error) {
    console.error("Gemini Certificate Generation Error:", error);
    throw new Error("Unable to generate certificate with Gemini. Please try again.");
  }
};

/**
 * Generates a personalized mandala using Google Gemini 2.5 Flash Image (Nano Banana Pro)
 * Creates a unique mandala based on user's practice session
 */
export const generateMandala = async (
  data: {
    userName: string;
    date: string;
    message: string;
    symbolType?: string;
  }
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

    const symbolDescriptions: Record<string, string> = {
      air: 'flowing air currents, wind patterns, and ethereal movement',
      water: 'gentle waves, flowing water, and fluid motion',
      fire: 'dynamic flames, energy bursts, and transformative power',
      space: 'geometric circles, intersecting lines, and cosmic patterns',
      earth: 'grounded shapes, stability, and foundational geometry'
    };

    const symbolDesc = symbolDescriptions[data.symbolType || 'space'] || symbolDescriptions['space'];

    const prompt = `Create a beautiful, personalized mandala for a breathwork practice completion certificate.

REQUIREMENTS:
- Circular mandala design, perfectly centered and symmetrical
- Sacred geometry patterns inspired by ${symbolDesc}
- Warm golden-bronze color palette (#D4A574, #FCD34D, #F59E0B) with subtle gradients
- Intricate, detailed patterns that radiate from the center
- Mystical, meditative, and celebratory feeling
- High detail and precision, suitable for a 200x200px display
- Background should be dark navy (#0f172a) or transparent
- The mandala should feel unique and personalized for: ${data.userName}
- Incorporate elements that reflect the message: "${data.message}"
- Date context: ${data.date}

STYLE:
- Traditional mandala structure with radial symmetry
- Delicate linework and geometric patterns
- Ornate details that create depth and visual interest
- Balance between complexity and clarity
- Should feel like a sacred, earned symbol of practice

TECHNICAL:
- Square aspect ratio (1:1)
- High resolution for crisp display
- Clean vector-like appearance
- Suitable for circular cropping (200x200px circle)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: '1:1', // Square for mandala
          imageSize: '1K', // Good quality for 200x200px display
        },
      },
    });

    // Extract the generated image from the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64Image = part.inlineData.data;
        return `data:image/png;base64,${base64Image}`;
      }
    }

    throw new Error("No image data found in Gemini response.");
  } catch (error) {
    console.error("Mandala Generation Error:", error);
    throw new Error("Unable to generate mandala. Please try again.");
  }
};

/**
 * Downloads a screenshot of a DOM element
 */
export const downloadScreenshot = async (
  element: HTMLElement,
  filename?: string
): Promise<void> => {
  const dataUrl = await captureElementScreenshot(element);

  if (Capacitor.isNativePlatform()) {
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      throw new Error('Failed to encode certificate image.');
    }

    const perm = await Filesystem.checkPermissions();
    if (perm.publicStorage === 'denied') {
      await Filesystem.requestPermissions();
    }

    const cacheResult = await Filesystem.writeFile({
      path: filename || `practice-complete-${Date.now()}.png`,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      url: cacheResult.uri,
      title: 'Certificate Image',
    });
    return;
  }

  const link = document.createElement('a');
  link.download = filename || `practice-complete-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
};

export const downloadCertImage = async (
  certElementId: string,
  filename?: string
): Promise<void> => {
  const element = document.getElementById(certElementId);
  if (!element) {
    throw new Error(`Certificate element not found: ${certElementId}`);
  }

  await downloadScreenshot(element, filename || `certificate-${Date.now()}.png`);
};

/**
 * Downloads a Gemini-generated certificate image
 */
export const downloadGeminiCertificate = async (
  certificateData: CertificateData,
  filename?: string
): Promise<void> => {
  const dataUrl = await generateCertificateWithGemini(certificateData);

  const link = document.createElement('a');
  link.download = filename || `breathwork-certificate-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
};

/** Instagram Story dimensions */
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

/**
 * Exports Live Meditation Story Card as high-resolution PNG.
 * Uses html2canvas with scale 2 for retina-quality output.
 * On native: saves to Photos and opens share sheet.
 * On web: triggers download.
 */
export const exportLiveMeditationStory = async (
  element: HTMLElement,
  filename?: string
): Promise<void> => {
  const dataUrl = await captureElementScreenshot(element, {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    scale: 2,
    backgroundColor: '#0D171E',
  });

  const finalFilename = filename || `live-meditation-story-${Date.now()}.png`;

  if (Capacitor.isNativePlatform()) {
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      throw new Error('Failed to encode story image.');
    }

    const perm = await Filesystem.checkPermissions();
    if (perm.publicStorage === 'denied') {
      await Filesystem.requestPermissions();
    }

    const cacheResult = await Filesystem.writeFile({
      path: finalFilename,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      url: cacheResult.uri,
      title: 'Live Meditation Story',
      dialogTitle: 'Share your meditation story',
    });
    return;
  }

  const link = document.createElement('a');
  link.download = finalFilename;
  link.href = dataUrl;
  link.click();
};

/**
 * Shares content (uses Web Share API on mobile, clipboard on desktop)
 */
export const shareCertificate = async (
  sessionDurationMinutes: number,
  message: string
): Promise<void> => {
  const shareText = `I just completed my Morning Ritual! ${message}\n\n${sessionDurationMinutes} minutes of breathwork.\n\n#Breathwork #Mindfulness #MorningRitual #TheSchoolOfBreath`;
  const shareUrl = window.location.origin;

  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Practice Complete!',
        text: shareText,
        url: shareUrl
      });
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Share text copied to clipboard!');
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Share failed:', error);
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('Share text copied to clipboard!');
      } catch (clipboardError) {
        console.error('Clipboard copy failed:', clipboardError);
      }
    }
  }
};
