
import { GoogleGenAI, Chat, Modality, FunctionDeclaration, Type } from "@google/genai";
import { BirthDetails, Horoscope, RecommendationResponse } from "../types";

// --- NAVIGATION TOOL DEFINITION ---
const navigateToFunctionDeclaration: FunctionDeclaration = {
  name: 'navigateTo',
  parameters: {
    type: Type.OBJECT,
    description: 'Navigate the user to a specific section of the School of Breath app.',
    properties: {
      destination: {
        type: Type.STRING,
        description: 'The target section to open for the user.',
        enum: [
          'HOME', 
          'COURSES', 
          'BREATH_TRAINING', 
          'GUIDED_MEDITATION', 
          'SLEEP_MUSIC', 
          'MANTRAS', 
          'CHAKRAS', 
          'ASTROLOGY', 
          'MORNING_RITUAL', 
          'GRATITUDE_JOURNAL', 
          'SANCTUARY_STUDIO', 
          'LIVE_SESSIONS',
          'MANTRA_EXPLORER'
        ],
      },
      patternId: {
        type: Type.STRING,
        description: 'If destination is BREATH_TRAINING, specifies the pattern (e.g. CALM, ENERGY, FOCUS, BALANCE, BHASTRIKA, BHRAMARI).',
      }
    },
    required: ['destination'],
  },
};

// --- SUGGESTION TOOL DEFINITION ---
const suggestPromptsFunctionDeclaration: FunctionDeclaration = {
  name: 'suggestPrompts',
  parameters: {
    type: Type.OBJECT,
    description: 'Provide 3 contextually relevant follow-up questions or prompt shortcuts for the user based on the current conversation.',
    properties: {
      prompts: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'A list of exactly 3 short, engaging prompt strings.',
      }
    },
    required: ['prompts'],
  },
};

// --- INTERNAL KNOWLEDGE BASE (Condensed from FAQ) ---
const SCHOOL_OF_BREATH_KB = `
KNOWLEDGE BASE - THE SCHOOL OF BREATH:
- Membership: Holistic Awakening Membership costs $24.99/mo or $199/yr ($17,499/yr in India). Includes ALL courses.
- Individual Courses: Most are $129 (promotional $99).
- Refund Policy: 30-day money-back guarantee.
- Courses: 
  * 9-Day Breathwork Challenge (Energy & Vitality)
  * 9-Day Meditation Challenge (Clarity & Focus)
  * 9-Day Breathwork for Bliss (Healing Trauma)
  * 12-Day Third Eye Activation (Intuition)
  * 21-Week Kundalini Awakening (Deep Transformation)
  * Swara Yoga (Nostril science & decision making)
  * Sleep Mastery (Deep rest)
  * Conscious Decision Making (9 weeks)
- Support: connect@meditatewithabhi.com or WhatsApp +91 92533 92845.
- App Info: Free to download, available on iOS/Android. Data is secure and encrypted.
- Practice: Even 5-10 minutes daily brings results.
- Live: We offer real-time global sessions in the app (Sangha).
`;

// --- CHATBOT (gemini-3-pro-preview with Google Search and Navigation) ---
export const createBreathingCoachChat = (): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are Maya Abhi AI assistant and you answer people's questions from "The School of Breath". 
      
      CORE RULES:
      1. KNOWLEDGE BASE: Use the following official data for business questions: ${SCHOOL_OF_BREATH_KB}
      2. NAVIGATION: Use 'navigateTo' to move users to sections (e.g. if they want to see courses, navigate to 'COURSES').
      3. SUGGESTIONS: After EVERY response, call 'suggestPrompts' with 3 logical next steps. 
         - If they ask about pricing, suggest: ["Membership Benefits", "Refund Policy", "Buy Membership"].
         - If they ask about stress, suggest: ["Start 6-3-9 Breathing", "Explain Vagus Nerve", "9-Day Bliss Course"].
         - If they ask about courses, suggest: ["9-Day Challenge", "Kundalini Awakening", "See All Courses"].
      4. NO EXTERNAL LINKS: Apple policy forbids clickable external URLs. Do NOT provide raw URLs. Mention "our website" or "email us" as text, or use the 'navigateTo' tool.
      5. PERSONALITY: Serene, Vedic, compassionate. Start greetings with "Namaste". 
      6. TOOLS: You have Google Search for general science/tradition, but prioritize the internal Knowledge Base for business details.
      `,
      tools: [
        { googleSearch: {} },
        { functionDeclarations: [navigateToFunctionDeclaration, suggestPromptsFunctionDeclaration] }
      ],
    },
  });
};

// --- TTS Helper: Enhance text for wellness/meditation context ---
const enhanceTextForSpeech = (text: string): string => {
  // Remove markdown formatting that might interfere with speech
  let enhanced = text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
    .replace(/\*(.*?)\*/g, '$1')      // Remove italic
    .replace(/`(.*?)`/g, '$1')         // Remove code blocks
    .replace(/#{1,6}\s/g, '')         // Remove headers
    .replace(/\n{3,}/g, '\n\n')        // Normalize multiple newlines
    .trim();
  
  // Ensure proper punctuation for natural pauses
  if (!enhanced.match(/[.!?]$/)) {
    enhanced += '.';
  }
  
  return enhanced;
};

// --- TTS (gemini-2.5-flash-preview-tts) ---
export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: `[speaking warmly and calmly] ${enhanceTextForSpeech(text)}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
            prebuiltVoiceConfig: { 
              voiceName: 'Aoede'  // Warm, calming female voice
            },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated from model.");

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error: any) {
    console.error("TTS Generation Error:", error);
    // Preserve original error message if it's already descriptive
    if (error?.message?.includes("API key") || error?.message?.includes("GEMINI_API_KEY")) {
      throw error;
    }
    throw new Error(error?.message || "Unable to generate speech at this moment.");
  }
};

// --- VEDIC ASTROLOGY (gemini-3-pro-preview) ---
export const generateVedicHoroscope = async (details: BirthDetails): Promise<Horoscope> => {
  try {
    const prompt = `Act as an expert Vedic Astrologer (Jyotish) with deep knowledge of astronomy.
    
    User Details: 
    - Name: ${details.name}
    - Date: ${details.date}
    - Time: ${details.time}
    - Place: ${details.place}
    
    TASK:
    1. Calculate the Sidereal (Nirayana) positions. You MUST use the **Lahiri Ayanamsa**.
    2. Determine the correct **Moon Sign (Rashi)** and **Ascendant (Lagna)**. 
    3. Provide a personalized daily forecast for TODAY focusing on mindfulness, mental peace, and breathwork.
    4. Suggest a specific short practice from the yoga tradition.
    
    Output MUST be valid JSON with this schema:
    {
      "ascendant": "string",
      "moonSign": "string",
      "prediction": "string",
      "luckyMantra": "string",
      "cosmicTip": "string",
      "recommendedPractice": "string"
    }
    `;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as Horoscope;
  } catch (e) {
    console.error("Horoscope Error:", e);
    return {
      ascendant: "Unknown",
      moonSign: "Unknown",
      prediction: "The stars are currently aligned in mystery. Take this moment to breathe.",
      luckyMantra: "Om Shanti",
      cosmicTip: "Trust your intuition today.",
      recommendedPractice: "Simple Awareness"
    };
  }
};

// --- BREATH HOROSCOPE (gemini-3-pro-preview) ---
export const generateBreathHoroscope = async (sign: string): Promise<BreathHoroscope> => {
  try {
    const prompt = `Act as an expert astrologer and breathwork guide. Generate a daily breath horoscope for ${sign} sign for TODAY.

    Create a personalized daily guidance that combines astrological insights with breathwork practices.
    
    IMPORTANT: For the "breath" field in action, use one of these specific formats to enable smart navigation:
    - For 6-3-9 breathing: "Practice 6-3-9 breathing for 5 minutes in the morning"
    - For Alternate Nostril: "Practice alternate nostril breathing for 5 minutes"
    - For Morning Ritual: "Begin your morning ritual with a full breathwork sequence"
    - For 4-7-8 breathing: "Practice 4-7-8 breathing for 5 minutes before sleep"
    - For Box Breathing: "Practice box breathing for 3-5 minutes"
    - For Breath of Fire: "Practice breath of fire for 3 minutes"
    
    Choose the breath practice that best aligns with ${sign}'s energy for today.
    
    Output MUST be valid JSON with this exact schema:
    {
      "sign": "${sign}",
      "theme": "A short, inspiring theme for the day (2-4 words)",
      "prediction": "A personalized daily prediction focusing on energy, mood, and opportunities (2-3 sentences, poetic and inspiring)",
      "focus": ["First focus area", "Second focus area", "Third focus area"],
      "aware": ["First thing to be aware of", "Second thing to be aware of"],
      "action": {
        "do": "A specific recommended action or practice for today (1-2 sentences)",
        "breath": "A specific breathwork practice recommendation using the formats above (must include technique name like '6-3-9', 'alternate nostril', 'morning ritual', etc.)"
      },
      "meta": {
        "lucky_time": "A time of day (e.g., '6:00 AM - 8:00 AM')",
        "color": "A color name (e.g., 'Gold', 'Deep Blue')",
        "lucky_number": "A single digit number (1-9)"
      }
    }
    
    Make it mystical, inspiring, and practical. Focus on breathwork integration.`;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text) as BreathHoroscope;
    
    // Ensure all required fields exist
    return {
      sign: parsed.sign || sign,
      theme: parsed.theme || "Cosmic Alignment",
      prediction: parsed.prediction || "The stars align for your breathwork practice today.",
      focus: parsed.focus || ["Presence", "Awareness", "Flow"],
      aware: parsed.aware || ["Energy shifts", "Emotional patterns"],
      action: {
        do: parsed.action?.do || "Take moments throughout the day to connect with your breath.",
        breath: parsed.action?.breath || "Practice 6-3-9 breathing for 5 minutes."
      },
      meta: {
        lucky_time: parsed.meta?.lucky_time || "Morning",
        color: parsed.meta?.color || "Gold",
        lucky_number: parsed.meta?.lucky_number || "7"
      }
    };
  } catch (e) {
    console.error("Breath Horoscope Error:", e);
    return {
      sign: sign,
      theme: "Cosmic Alignment",
      prediction: "The stars are currently aligned in mystery. Take this moment to breathe deeply and connect with your inner wisdom.",
      focus: ["Presence", "Awareness", "Flow"],
      aware: ["Energy shifts", "Emotional patterns"],
      action: {
        do: "Take moments throughout the day to connect with your breath.",
        breath: "Practice 6-3-9 breathing for 5 minutes in the morning."
      },
      meta: {
        lucky_time: "Morning",
        color: "Gold",
        lucky_number: "7"
      }
    };
  }
};

// --- VIDEO GENERATION (veo-3.1-fast-generate-preview) ---
export const generateVisualisationVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9') => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p', 
        aspectRatio: aspectRatio 
      }
    });

    const MAX_ATTEMPTS = 20; 
    let attempts = 0;

    while (!operation.done) {
      if (attempts > MAX_ATTEMPTS) throw new Error("Video generation timed out.");
      await new Promise(resolve => setTimeout(resolve, 10000)); 
      operation = await ai.operations.getVideosOperation({operation: operation});
      attempts++;
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed or returned no URI");

    const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!response.ok) throw new Error("Failed to download generated video.");
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Video Generation Error:", error);
    throw error;
  }
};

// --- IMAGE GENERATION (gemini-3-pro-image-preview) ---
export const generateAffirmationImage = async (prompt: string, aspectRatio: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: aspectRatio as any, 
            imageSize: "1K"
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    throw new Error("No image data found in response.");
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

// --- BREATH RECOMMENDATION ENGINE (gemini-3-flash-preview) ---
export const getBreathRecommendation = async (userState: any): Promise<RecommendationResponse> => {
  const systemInstruction = `
  You are the **Breath Recommendation Engine** for “The School of Breath” app.
  Given a user's DESIRED FEELING (goal), **choose ONE breathing practice**.
  Respond ONLY with a single JSON object matching the RecommendationResponse schema.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: JSON.stringify(userState) }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text) as RecommendationResponse;
  } catch (e) {
    console.error("Recommendation Error:", e);
    return {
        patternId: "CALM",
        techniqueName: "6-3-9 Breathing",
        reasoning: "A gentle default to help you center yourself.",
        config: { ratio: { inhale: 6, hold: 3, exhale: 9, holdBottom: 0 }, cycles: 6, difficulty: "easy" },
        screenTitle: "Suggested Practice",
        headline: "Stress Relief",
        subheadline: "Let's bring you back to center.",
        ctaLabel: "Start Breathing",
        reassurance: "Take it at your own pace."
    };
  }
};

// --- SESSION CONFIG GENERATION (gemini-3-flash-preview) ---
export interface SessionConfig {
  hexColor: string;
  intention: string;
}

export const generateSessionConfig = async (title: string, category: string): Promise<SessionConfig> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate session config for "${title}" (${category}) with calming hexColor and intention string.`,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as SessionConfig;
  } catch (error) {
    console.error("Session Config Error:", error);
    return {
      hexColor: "#4F46E5",
      intention: "I am here to find peace and clarity."
    };
  }
};
