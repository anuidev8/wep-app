let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });
  }
  return audioContext;
};

export const stopTtsPlayback = () => {
  // Stop any Web Audio playback
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      // no-op
    }
    try {
      currentSource.disconnect();
    } catch {
      // no-op
    }
    currentSource = null;
  }

  // Stop any Speech Synthesis playback
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
};

export const playTtsFromBuffer = async (audioBuffer: ArrayBuffer) => {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  stopTtsPlayback();

  const decoded = await ctx.decodeAudioData(audioBuffer.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source.connect(ctx.destination);
  currentSource = source;

  await new Promise<void>((resolve) => {
    source.onended = () => {
      try {
        currentSource?.disconnect();
      } catch {
        // no-op
      }
      if (currentSource === source) {
        currentSource = null;
      }
      resolve();
    };
    source.start(0);
  });
};

/**
 * Converts raw PCM data (16-bit integers) to an AudioBuffer
 * @param pcmData - Raw PCM data as Uint8Array (from Base64 decoded string)
 * @param sampleRate - Sample rate in Hz (default: 24000 for Gemini TTS)
 * @returns AudioBuffer ready for playback
 */
const pcmToAudioBuffer = (pcmData: Uint8Array, sampleRate: number = 24000): AudioBuffer => {
  const ctx = getAudioContext();
  
  // Ensure we have an even number of bytes (16-bit samples require 2 bytes each)
  const sampleCount = Math.floor(pcmData.length / 2);
  if (sampleCount === 0) {
    throw new Error("Invalid PCM data: insufficient bytes for 16-bit samples");
  }
  
  // Create AudioBuffer with 1 channel (mono)
  const audioBuffer = ctx.createBuffer(1, sampleCount, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  // Convert bytes to 16-bit integers (little-endian) and normalize to Float32
  // PCM data from Gemini TTS is 16-bit little-endian
  for (let i = 0; i < sampleCount; i++) {
    const byteOffset = i * 2;
    // Read little-endian 16-bit integer: low byte + (high byte << 8)
    // Handle sign extension for negative values
    const lowByte = pcmData[byteOffset];
    const highByte = pcmData[byteOffset + 1];
    const int16Value = (lowByte | (highByte << 8)) << 16 >> 16; // Sign-extend to 16-bit
    
    // Normalize from Int16 range (-32768 to 32767) to Float32 range (-1.0 to 1.0)
    channelData[i] = int16Value / 32768.0;
  }
  
  return audioBuffer;
};

/**
 * Plays audio from raw PCM data (from Gemini TTS)
 * @param pcmData - Raw PCM data as ArrayBuffer or Uint8Array
 * @param sampleRate - Sample rate in Hz (default: 24000 for Gemini TTS)
 */
export const playGeminiTts = async (pcmData: ArrayBuffer | Uint8Array, sampleRate: number = 24000): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  stopTtsPlayback();

  // Convert to Uint8Array if needed
  const uint8Data = pcmData instanceof Uint8Array ? pcmData : new Uint8Array(pcmData);
  
  // Convert PCM to AudioBuffer
  const audioBuffer = pcmToAudioBuffer(uint8Data, sampleRate);
  
  // Create and play the audio source
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  currentSource = source;

  await new Promise<void>((resolve, reject) => {
    source.onended = () => {
      try {
        currentSource?.disconnect();
      } catch {
        // no-op
      }
      if (currentSource === source) {
        currentSource = null;
      }
      resolve();
    };
    
    source.onerror = (error) => {
      if (currentSource === source) {
        currentSource = null;
      }
      reject(error);
    };
    
    source.start(0);
  });
};

export const speakText = async (text: string): Promise<void> => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    throw new Error("Text-to-speech is not supported in this environment.");
  }

  stopTtsPlayback();

  return new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    utterance.onend = () => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      resolve();
    };

    utterance.onerror = (event) => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
      }
      reject(event.error || new Error("Speech synthesis error"));
    };

    window.speechSynthesis.speak(utterance);
  });
};



