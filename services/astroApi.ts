export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour?: number; // Optional - not required for daily horoscope
  minute?: number; // Optional - not required for daily horoscope
  city?: string; // Optional - not required for daily horoscope
  tz_str?: string; // default "AUTO"
}

export interface DailyPersonalHoroscopeRequest {
  birth: BirthData;
  date: string; // ISO, e.g. "2026-02-09"
  tz_str?: string; // default "AUTO"
}

export interface DailyPersonalHoroscopeResponse {
  meta: {
    request_id: string;
    generated_at: string;
    [key: string]: unknown;
  };
  data: {
    sign: string;
    date: string;
    scores: {
      overall: number;
      love: number;
      career: number;
      money: number;
      health: number;
    };
    lucky: {
      color: { key: string; label: string };
      number: number;
      time_window: string;
    };
    content: {
      text: string;
      theme: string;
      keywords: string[];
      do: string[];
      dont: string[];
      intention?: string; // AI-generated intention based on horoscope
      gratitude?: string; // AI-generated gratitude based on horoscope
    };
    astro: any;
    personal: any;
  };
}

import { GoogleGenAI } from "@google/genai";

/**
 * Generate personalized intention based on horoscope data
 */
export async function generateIntentionFromHoroscope(
  theme: string,
  description: string,
  doToday: string[],
  dontToday: string[]
): Promise<string> {
  const apiKey = getGeminiApiKey();
  
  const doList = doToday.join(', ');
  const dontList = dontToday.join(', ');
  
  const prompt = `You are Abhi, a breathwork coach. Based on today's horoscope theme '${theme}' and context '${description}', generate ONE first-person intention (12-20 words) that:
- Uses 'Today I [action] and [outcome]' format
- Incorporates actions: ${doList}
- Avoids: ${dontList}
- Feels personal and empowering

Output ONLY the intention sentence.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
      }
    });

    let text = '';
    
    // Try multiple ways to extract text from response
    if (response.text) {
      text = response.text;
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = response.candidates[0].content.parts[0].text;
    } else if (typeof response === 'string') {
      text = response;
    } else {
      // Try to find text in any nested structure
      const responseStr = JSON.stringify(response);
      const textMatch = responseStr.match(/"text":\s*"([^"]+)"/);
      if (textMatch) {
        text = textMatch[1];
      }
    }
    
    // Clean up the response (remove quotes, markdown code blocks, trim)
    let cleaned = text
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^```[\w]*\n?|\n?```$/g, '') // Remove markdown code blocks
      .replace(/^Today I\s*/i, 'Today I ') // Normalize "Today I" format
      .trim();
    
    // Extract just the intention sentence if there's extra text
    const todayIMatch = cleaned.match(/Today I[^.!?]+[.!?]?/i);
    if (todayIMatch) {
      cleaned = todayIMatch[0].trim();
    }
    
    if (!cleaned || cleaned.length < 10) {
      throw new Error('Intention came back in an unexpected format. Please tap Generate again.');
    }
    
    return cleaned;
  } catch (error: any) {
    console.error('Error generating intention:', error);
    throw new Error(error?.message || 'Failed to generate intention. Please try again.');
  }
}

/**
 * Get Gemini API key from environment (same as other Gemini services)
 */
function getGeminiApiKey(): string {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.");
  }
  return apiKey;
}

/**
 * Calculate zodiac sign from birth date
 */
function calculateZodiacSign(month: number, day: number): string {
  const signs = [
    { name: 'capricorn', start: [12, 22], end: [1, 19] },
    { name: 'aquarius', start: [1, 20], end: [2, 18] },
    { name: 'pisces', start: [2, 19], end: [3, 20] },
    { name: 'aries', start: [3, 21], end: [4, 19] },
    { name: 'taurus', start: [4, 20], end: [5, 20] },
    { name: 'gemini', start: [5, 21], end: [6, 20] },
    { name: 'cancer', start: [6, 21], end: [7, 22] },
    { name: 'leo', start: [7, 23], end: [8, 22] },
    { name: 'virgo', start: [8, 23], end: [9, 22] },
    { name: 'libra', start: [9, 23], end: [10, 22] },
    { name: 'scorpio', start: [10, 23], end: [11, 21] },
    { name: 'sagittarius', start: [11, 22], end: [12, 21] },
  ];

  for (const sign of signs) {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;
    
    if (startMonth === endMonth) {
      if (month === startMonth && day >= startDay && day <= endDay) {
        return sign.name;
      }
    } else {
      if (
        (month === startMonth && day >= startDay) ||
        (month === endMonth && day <= endDay)
      ) {
        return sign.name;
      }
    }
  }
  return 'aries'; // fallback
}

/**
 * Generate daily personal horoscope using Gemini API
 */
export async function getDailyPersonalHoroscope(
  payload: DailyPersonalHoroscopeRequest
): Promise<DailyPersonalHoroscopeResponse> {
  const apiKey = getGeminiApiKey();

  const { year, month, day, hour, minute, city } = payload.birth;
  const zodiacSign = calculateZodiacSign(month, day);
  
  // Format date for display
  const horoscopeDate = new Date(payload.date);
  const dateStr = horoscopeDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Build birth details string (only include what's available)
  let birthDetailsStr = `- Birth Date: ${month}/${day}/${year}\n- Zodiac Sign: ${zodiacSign.toUpperCase()}`;
  if (hour !== undefined && minute !== undefined) {
    birthDetailsStr += `\n- Birth Time: ${hour}:${minute.toString().padStart(2, '0')} (24-hour format)`;
  }
  if (city && city.trim().length > 0) {
    birthDetailsStr += `\n- Birth Place: ${city.trim()}`;
  }

  const prompt = `Generate a simple, practical daily horoscope for ${dateStr}.

Birth Date: ${month}/${day}/${year} (${zodiacSign.toUpperCase()})${hour !== undefined && minute !== undefined ? `, Time: ${hour}:${minute.toString().padStart(2, '0')}` : ''}${city && city.trim() ? `, Place: ${city.trim()}` : ''}

IMPORTANT LANGUAGE RULES:
- Use SIMPLE, CLEAR language that anyone can understand
- NO astrological jargon: NO planet names (Jupiter, Saturn, etc.), NO house references (11th house, etc.), NO technical terms
- Focus on practical, actionable guidance people can use TODAY
- Write like a wise friend giving helpful advice, not an astrologer
- Keep it warm, encouraging, and easy to understand

Return ONLY valid JSON:
{
  "sign": "${zodiacSign}",
  "date": "${payload.date}",
  "scores": {"overall": <0-100>, "love": <0-100>, "career": <0-100>, "money": <0-100>, "health": <0-100>},
  "lucky": {
    "color": {"key": "<key>", "label": "<Color Name>"},
    "number": <1-9>,
    "time_window": "<e.g. 6:00 AM - 9:00 AM>"
  },
  "content": {
    "text": "<2-3 sentences in SIMPLE language. Practical guidance for today. NO planets, houses, or jargon. Just clear, helpful advice they can act on.>",
    "theme": "<Meaningful 2-4 word phrase, NOT generic>",
    "keywords": ["word1", "word2", "word3"],
    "do": [
      "<Simple, practical action they can take today - NO astro jargon>",
      "<Another simple, practical action - NO astro jargon>",
      "<One more simple, practical action - NO astro jargon>"
    ],
    "dont": [
      "<Simple thing to avoid today - NO astro jargon>",
      "<Another simple thing to avoid - NO astro jargon>"
    ],
    "intention": "<A personalized daily intention (one clear sentence) based on the horoscope text and theme. Should feel natural and connected to the day's energy. Example: 'Today I move slowly and trust my breath to lead me.' or 'Today I create space for peace and let go of what no longer serves me.'>",
    "gratitude": "<A personalized gratitude reflection (one sentence) based on the horoscope text and theme. Should feel natural and connected to the day's energy. Example: 'I am grateful for the quiet moments that help me find clarity.' or 'I am grateful for the energy to create a peaceful space for myself today.'>"
  },
  "astro": {
    "moon_sign": {"key": "<key>", "label": "<Moon Sign Name>"},
    "moon_phase": {"key": "<key>", "label": "<Moon Phase Name>"},
    "highlights": []
  },
  "personal": {
    "focus_areas": ["<Simple focus area>", "<Another simple focus area>"],
    "transits_top": []
  }
}

CRITICAL: 
- Different birth dates MUST produce different results
- All text must be in simple, everyday language
- Focus on what they can DO today, not astrological concepts
- Make it feel personal and practical, not technical`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9, // Higher creativity for personalized content
      }
    });

    const text = response.text || "{}";
    let horoscopeData: any;
    
    try {
      horoscopeData = JSON.parse(text);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        horoscopeData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Invalid JSON response from Gemini');
      }
    }

    // Validate and structure response
    const responseData: DailyPersonalHoroscopeResponse = {
      meta: {
        request_id: `gemini-${Date.now()}`,
        generated_at: new Date().toISOString(),
      },
      data: {
        sign: horoscopeData.sign || zodiacSign,
        date: horoscopeData.date || payload.date,
        scores: {
          overall: Math.max(0, Math.min(100, horoscopeData.scores?.overall || 75)),
          love: Math.max(0, Math.min(100, horoscopeData.scores?.love || 70)),
          career: Math.max(0, Math.min(100, horoscopeData.scores?.career || 70)),
          money: Math.max(0, Math.min(100, horoscopeData.scores?.money || 70)),
          health: Math.max(0, Math.min(100, horoscopeData.scores?.health || 75)),
        },
        lucky: {
          color: {
            key: (horoscopeData.lucky?.color?.key || horoscopeData.lucky?.color?.label || 'orange').toLowerCase(),
            label: horoscopeData.lucky?.color?.label || 'Orange',
          },
          number: horoscopeData.lucky?.number || 7,
          time_window: horoscopeData.lucky?.time_window || '6:00 AM - 9:00 AM',
        },
        content: {
          text: horoscopeData.content?.text || 'The stars align to bring you meaningful insights today.',
          theme: horoscopeData.content?.theme || 'Transformation',
          keywords: horoscopeData.content?.keywords || ['growth', 'insight', 'clarity'],
          do: horoscopeData.content?.do || ['Trust your intuition', 'Take mindful action', 'Connect with your inner wisdom'],
          dont: horoscopeData.content?.dont || ['Rush into decisions', 'Ignore your feelings'],
          intention: horoscopeData.content?.intention,
          gratitude: horoscopeData.content?.gratitude,
        },
        astro: horoscopeData.astro || {
          moon_sign: { key: 'scorpio', label: 'Scorpio' },
          moon_phase: { key: 'waning_gibbous', label: 'Waning Gibbous' },
          highlights: [],
        },
        personal: horoscopeData.personal || {
          focus_areas: ['Personal Growth', 'Spiritual Alignment'],
          transits_top: [],
        },
      },
    };

    console.log('Gemini Horoscope Generated:', {
      sign: responseData.data.sign,
      theme: responseData.data.content.theme,
      luckyColor: responseData.data.lucky.color.label,
      scores: responseData.data.scores,
    });

    return responseData;
  } catch (error: any) {
    console.error('Gemini horoscope generation error:', error);
    
    // Handle quota/rate limit errors specifically
    if (error?.error?.code === 429 || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      const retryDelay = error?.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'))?.retryDelay || '60';
      throw new Error(`API quota exceeded. Please wait ${retryDelay} seconds before trying again. If this persists, you may need to upgrade your Gemini API plan.`);
    }
    
    throw new Error(`Failed to generate horoscope: ${error?.error?.message || error?.message || 'Unknown error'}`);
  }
}


