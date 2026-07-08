import { useState, useCallback, useRef, useEffect } from 'react';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Initialize client with environment variable (Vite uses import.meta.env.VITE_*)
const apiKey = import.meta.env.VITE_ELEVENLABS_KEY || 'sk_c3c781513503c414a03ff5ef9a51196589e6957a28223d12';

// If the key is missing, we might want to warn or handle gracefully
if (!apiKey) {
  console.warn('ElevenLabs API Key is missing. Check VITE_ELEVENLABS_KEY in .env');
}

const client = new ElevenLabsClient({ apiKey });

export const useElevenLabsTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM'); // Aria (calm default)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(async (text: string, options = {}) => {
    if (!apiKey) {
      console.error('ElevenLabs API Key not found');
      return;
    }

    setIsSpeaking(true);
    try {
      // Create a stream
      const response = await client.textToSpeech.convert(voiceId, {
        text: text.slice(0, 3000), // Chunk for speed
        modelId: 'eleven_turbo_v2_english', // Lowest latency ~150ms
        voiceSettings: {
          stability: 0.4, // Calm/consistent for breathwork
          similarityBoost: 0.8,
          style: 0.2, // Subtle emotion
          ...options
        },
        optimizeStreamingLatency: 3, // Max speed
        outputFormat: 'mp3_22050_32' // Low-bandwidth streaming
      });

      // The response is a ReadableStream in browser environment for 'convert' if implemented correctly in SDK,
      // but let's check the SDK return type. 
      // The snippet used `client.textToSpeech.stream` which returns an async iterator.
      // Let's stick to the snippet's approach but adapted for browser compatibility if needed.
      
      // In the browser, the SDK might return a Blob or ReadableStream.
      // The snippet assumes `stream` is an async iterable of Uint8Array chunks.
      // Let's try to follow that pattern.

      const stream = await client.textToSpeech.convert(voiceId, {
        text: text.slice(0, 3000),
        modelId: 'eleven_turbo_v2_english',
        voiceSettings: {
            stability: 0.4,
            similarityBoost: 0.8,
            style: 0.2,
            ...options
        },
        optimizeStreamingLatency: 3,
        outputFormat: 'mp3_22050_32'
      });
      
      const audioBlob = await new Response(stream as any).blob();
      const url = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error', e);
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();

    } catch (e) {
      console.error('TTS error:', e);
      setIsSpeaking(false);
    }
  }, [voiceId]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  }, []);

  return { speak, stop, isSpeaking, setVoiceId };
};
