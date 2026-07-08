import axios from 'axios';
import { getStoredAuth } from './authService';

// --- Helpers ---

const getBreathApiUrl = (): string | null => {
  const raw =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL_BREATH) || '';
  const apiUrl = typeof raw === 'string' ? raw.trim() : '';
  if (!apiUrl) return null;
  try {
    new URL(apiUrl);
    return apiUrl;
  } catch {
    console.warn('[SessionResults] VITE_API_URL_BREATH is not a valid URL:', apiUrl);
    return null;
  }
};

const generateClientId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getHeaders = async (): Promise<Record<string, string> | null> => {
  const auth = await getStoredAuth();
  if (!auth?.email) return null;
  return {
    'x-user-email': auth.email,
    'Content-Type': 'application/json',
  };
};

// --- Breathing Session ---

export interface StartSessionParams {
  patternId: string;
  activeSoundscapeId?: string;
  roundCount?: number;
  estimatedDurationSec?: number;
  intent?: string;
}

export interface StartSessionResult {
  sessionId: string;
  clientId: string;
}

export const startBreathingSession = async (
  params: StartSessionParams
): Promise<StartSessionResult | null> => {
  const apiUrl = getBreathApiUrl();
  if (!apiUrl) return null;

  const headers = await getHeaders();
  if (!headers) return null;

  const clientId = generateClientId();

  try {
    const response = await axios.post(
      `${apiUrl}/breath/sessions/start`,
      {
        patternId: params.patternId,
        clientId,
        intent: params.intent,
        activeSoundscapeId: params.activeSoundscapeId,
        roundCount: params.roundCount,
        estimatedDurationSec: params.estimatedDurationSec,
        startedAt: new Date().toISOString(),
      },
      { headers, timeout: 10000 }
    );

    const sessionId = response.data?.sessionId;
    console.log('[SessionResults] Breathing session started', { sessionId, clientId });
    return { sessionId, clientId };
  } catch (error: any) {
    console.warn('[SessionResults] Failed to start breathing session', error?.message);
    return null;
  }
};

export interface CompleteSessionParams {
  sessionId: string;
  clientId: string;
  patternId: string;
  actualDurationSec?: number;
  cyclesCompleted?: number;
  retentionSeconds?: number;
  calmPointsEarned?: number;
  streakDelta?: number;
  roundsMeta?: any[];
  deviceInfo?: Record<string, any>;
}

export const completeBreathingSession = async (
  params: CompleteSessionParams
): Promise<void> => {
  const apiUrl = getBreathApiUrl();
  if (!apiUrl) return;

  const headers = await getHeaders();
  if (!headers) return;

  try {
    await axios.post(
      `${apiUrl}/breath/sessions/${params.sessionId}/complete`,
      {
        clientId: params.clientId,
        sessionId: params.sessionId,
        patternId: params.patternId,
        actualDurationSec: params.actualDurationSec,
        cyclesCompleted: params.cyclesCompleted,
        retentionSeconds: params.retentionSeconds,
        calmPointsEarned: params.calmPointsEarned,
        streakDelta: params.streakDelta,
        completedAt: new Date().toISOString(),
        roundsMeta: params.roundsMeta,
        deviceInfo: params.deviceInfo,
      },
      { headers, timeout: 10000 }
    );
    console.log('[SessionResults] Breathing session completed', { sessionId: params.sessionId });
  } catch (error: any) {
    console.warn('[SessionResults] Failed to complete breathing session', error?.message);
  }
};

// --- Morning Ritual ---

export interface StartRitualParams {
  intent: string;
  practiceMode?: string;
  rounds: Array<{
    id: number;
    patternId: string;
    name: string;
    durationCycles: number;
    intensity: string;
    speedMultiplier: number;
    description: string;
    retentionType?: string;
    retentionDuration?: number;
  }>;
  omCount: number;
  totalDurationMin: number;
  totalSeconds: number;
  userLevel: number;
}

export interface StartRitualResult {
  ritualId: string;
}

export const startMorningRitual = async (
  params: StartRitualParams
): Promise<StartRitualResult | null> => {
  const apiUrl = getBreathApiUrl();
  if (!apiUrl) return null;

  const headers = await getHeaders();
  if (!headers) return null;

  try {
    const response = await axios.post(
      `${apiUrl}/breath/morning-ritual/start`,
      {
        intent: params.intent,
        practiceMode: params.practiceMode,
        plan: {
          intent: params.intent,
          practiceMode: params.practiceMode,
          rounds: params.rounds.map((r) => ({
            id: r.id,
            patternId: r.patternId,
            name: r.name,
            durationCycles: r.durationCycles,
            intensity: r.intensity,
            speedMultiplier: r.speedMultiplier,
            description: r.description,
            retentionType: r.retentionType,
            retentionDuration: r.retentionDuration,
          })),
          omCount: params.omCount,
          totalDurationMin: params.totalDurationMin,
          totalSeconds: params.totalSeconds,
          userLevel: params.userLevel,
        },
      },
      { headers, timeout: 10000 }
    );

    const ritualId = response.data?.ritualId;
    console.log('[SessionResults] Morning ritual started', { ritualId });
    return { ritualId };
  } catch (error: any) {
    console.warn('[SessionResults] Failed to start morning ritual', error?.message);
    return null;
  }
};

export interface CompleteRitualParams {
  ritualId: string;
  actualDurationSec?: number;
  roundsCompleted?: number;
  totalCycles?: number;
  calmPointsEarned?: number;
  metadata?: {
    pauseCount?: number;
    skipCount?: number;
    omCyclesCompleted?: number;
    beeCyclesCompleted?: number;
    totalIntegrationCycles?: number;
  };
}

export const completeMorningRitual = async (
  params: CompleteRitualParams
): Promise<void> => {
  const apiUrl = getBreathApiUrl();
  if (!apiUrl) return;

  const headers = await getHeaders();
  if (!headers) return;

  try {
    await axios.post(
      `${apiUrl}/breath/morning-ritual/${params.ritualId}/complete`,
      {
        actualDurationSec: params.actualDurationSec,
        roundsCompleted: params.roundsCompleted,
        totalCycles: params.totalCycles,
        calmPointsEarned: params.calmPointsEarned,
        metadata: params.metadata,
      },
      { headers, timeout: 10000 }
    );
    console.log('[SessionResults] Morning ritual completed', { ritualId: params.ritualId });
  } catch (error: any) {
    console.warn('[SessionResults] Failed to complete morning ritual', error?.message);
  }
};

// --- Combined: start + complete morning ritual in one call ---

export interface SaveRitualResultParams {
  plan: StartRitualParams;
  actualDurationSec?: number;
  roundsCompleted?: number;
  totalCycles?: number;
  calmPointsEarned?: number;
  metadata?: {
    pauseCount?: number;
    skipCount?: number;
    omCyclesCompleted?: number;
    beeCyclesCompleted?: number;
    totalIntegrationCycles?: number;
  };
}

export const saveMorningRitualResult = async (
  params: SaveRitualResultParams
): Promise<void> => {
  const result = await startMorningRitual(params.plan);
  if (!result?.ritualId) return;

  await completeMorningRitual({
    ritualId: result.ritualId,
    actualDurationSec: params.actualDurationSec,
    roundsCompleted: params.roundsCompleted,
    totalCycles: params.totalCycles,
    calmPointsEarned: params.calmPointsEarned,
    metadata: params.metadata,
  });
};
