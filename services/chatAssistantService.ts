import axios from 'axios';
import { apiClient } from './authService';
import type { AssistantResponse } from '../types';

interface SystemVars {
  llm?: {
    openaiApiKey?: string;
    openaiModel?: string;
  };
  [key: string]: any;
}

const THREAD_STORAGE_KEY = 'sob_chat_thread_id';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Narrow clean-up of assistant answer, mirroring mobile behavior
function cleanResponse(answer: string): string {
  return String(answer || '')
    .replace(/【[^】]*】/g, '')
    .replace(/\b\d+:\d+†source\b/g, '')
    .replace(/†source\b/g, '')
    .replace(/[🌟🌼🙏😊✨💫]/g, '')
    .replace(/,?\s*"shortcuts"\s*:\s*\[[\s\S]*?\]/g, '')
    .replace(/\n*\*?\*?Shortcuts:?\*?\*?\s*[\s\S]*$/i, '')
    .replace(/\s*\}\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

let cachedSystemVars: SystemVars | null = null;

export const loadSystemVars = async (): Promise<SystemVars> => {
  if (cachedSystemVars) return cachedSystemVars;

  const res = await apiClient.get('/system-vars');
  // Backend (mobile) stores env in response.data; support both shapes
  const data = (res.data && res.data.data) || res.data || {};
  cachedSystemVars = data as SystemVars;
  return cachedSystemVars;
};

export const getStoredThreadId = (): string | undefined => {
  try {
    const stored = localStorage.getItem(THREAD_STORAGE_KEY);
    return stored || undefined;
  } catch {
    return undefined;
  }
};

export const storeThreadId = (threadId: string) => {
  try {
    localStorage.setItem(THREAD_STORAGE_KEY, threadId);
  } catch {
    // Ignore storage errors in web
  }
};

interface OpenAIResponse {
  answer: string;
  bullets?: string[];
  steps?: string[];
  shortcuts: string[];
  backgroundColor?: string;
  source: string;
}

// Core Assistants API call – adapted from mobile `getOpenAIResponse`
async function getOpenAIResponse(
  query: string,
  selectedGuide: string,
  OPENAI_API_KEY: string,
  ASSISTANT_ID: string,
  OPENAI_MODEL: string,
  existingThreadId?: string
): Promise<OpenAIResponse & { threadId: string }> {
  if (!OPENAI_API_KEY || !ASSISTANT_ID) {
    throw new Error('OpenAI configuration missing');
  }

  const OPENAI_HEADERS = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2',
  };

  try {
    // 1. Create or reuse thread
    let threadId = existingThreadId;
    if (!threadId) {
      const threadRes = await axios.post(
        'https://api.openai.com/v1/threads',
        {
          metadata: {
            source: 'breathwork_web_app',
            guide: selectedGuide,
            timestamp: new Date().toISOString(),
          },
        },
        { headers: OPENAI_HEADERS }
      );

      if (!threadRes.data?.id) {
        throw new Error('Failed to create thread: No thread ID returned');
      }
      threadId = threadRes.data.id;
    }

    // 2. Add user message
    const messageRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { role: 'user', content: String(query || '') },
      { headers: OPENAI_HEADERS }
    );

    if (!messageRes.data?.id) {
      throw new Error('Failed to add message: No message ID returned');
    }

    // 3. Run assistant
    const runRes = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        assistant_id: ASSISTANT_ID,
        tool_choice: 'required',
        temperature: 1.0,
        top_p: 1.0,
        response_format: { type: 'text' },
      },
      { headers: OPENAI_HEADERS }
    );

    if (!runRes.data?.id) {
      throw new Error('Failed to create run: No run ID returned');
    }
    const runId = runRes.data.id;

    // 4. Poll until completion
    let runStatus = 'queued';
    let attempts = 0;
    const maxAttempts = 60;

    while (['queued', 'in_progress'].includes(runStatus) && attempts < maxAttempts) {
      await sleep(1000);
      attempts++;

      const statusRes = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        { headers: OPENAI_HEADERS }
      );

      runStatus = statusRes.data.status;

      if (runStatus === 'failed') {
        const errorDetails = statusRes.data.last_error;
        throw new Error(errorDetails?.message || 'Assistant run failed');
      }
      if (['expired', 'cancelled'].includes(runStatus)) {
        throw new Error(`Assistant run ${runStatus}`);
      }
      if (runStatus === 'in_progress') {
        await sleep(500);
      }
      if (runStatus === 'completed') {
        await sleep(500);
        break;
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Assistant run timed out');
    }

    // 5. Get messages
    const messagesRes = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers: OPENAI_HEADERS }
    );

    if (!messagesRes.data?.data || !Array.isArray(messagesRes.data.data)) {
      throw new Error('Invalid messages response structure');
    }

    const assistantMessage = messagesRes.data.data.find((msg: any) => msg.role === 'assistant');
    if (!assistantMessage) {
      throw new Error('No assistant message found in response');
    }

    const parts = (assistantMessage.content || [])
      .map((p: any) => p?.text?.value || p?.text || '')
      .filter(Boolean);
    const raw = parts.join('\n');

    // Try extracting JSON block
    let jsonText = raw;
    const codeFenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeFenceMatch) {
      jsonText = codeFenceMatch[1].trim();
    } else {
      const jsonObjectMatch = raw.match(/\{[\s\S]*"answer"[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonText = jsonObjectMatch[0];
      }
    }

    let jsonResponse: any = null;
    try {
      jsonResponse = JSON.parse(jsonText);
    } catch {
      // Fallback: try to at least extract shortcuts
      const shortcutsMatch = raw.match(/"shortcuts"\s*:\s*\[([\s\S]*?)\]/);
      if (shortcutsMatch) {
        try {
          const shortcutsArray = JSON.parse('[' + shortcutsMatch[1] + ']');
          jsonResponse = {
            answer: raw.replace(/```[\s\S]*```/g, '').replace(/"shortcuts"[\s\S]*?\]/, '').trim(),
            shortcuts: shortcutsArray,
          };
        } catch {
          const items = shortcutsMatch[1].match(/"([^"]+)"/g);
          if (items) {
            jsonResponse = {
              answer: raw,
              shortcuts: items.map((s: string) => s.replace(/"/g, '')),
            };
          }
        }
      }
    }

    if (jsonResponse && typeof jsonResponse === 'object') {
      const rawAnswer = jsonResponse.answer || '';
      const cleanedAnswer = cleanResponse(rawAnswer);

      return {
        answer: cleanedAnswer,
        bullets: Array.isArray(jsonResponse.bullets)
          ? jsonResponse.bullets.filter(Boolean)
          : [],
        steps: Array.isArray(jsonResponse.steps)
          ? jsonResponse.steps.filter(Boolean)
          : [],
        shortcuts: Array.isArray(jsonResponse.shortcuts)
          ? jsonResponse.shortcuts.filter(Boolean)
          : [],
        source: 'openai_assistant_json',
        threadId,
      };
    }

    // Plain-text fallback
    let fallbackAnswer = jsonText || raw;
    const answerMatch = fallbackAnswer.match(
      /"answer"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*\})/
    );
    if (answerMatch && answerMatch[1]) {
      fallbackAnswer = answerMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    const cleanedFallback = cleanResponse(fallbackAnswer);

    return {
      answer: cleanedFallback,
      bullets: [],
      steps: [],
      shortcuts: [],
      source: 'openai_assistant',
      threadId,
    };
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 400) {
      throw new Error(
        'There was an issue with the request format. Please try rephrasing your question.'
      );
    }
    if (status === 401) {
      throw new Error('Authentication issue. Please contact support.');
    }
    if (status === 429) {
      throw new Error('The service is currently busy. Please try again in a moment.');
    }
    if (status >= 500) {
      throw new Error(
        'The service is experiencing technical difficulties. Please try again later.'
      );
    }
    throw new Error(
      "I'm having trouble connecting to my knowledge base right now. Please try again later."
    );
  }
}

// Public adapter used by ChatPage
export const sendAssistantMessage = async (
  query: string,
  existingThreadId?: string,
  selectedGuide: string = 'abhi'
): Promise<AssistantResponse> => {
  const systemVars = await loadSystemVars();
  const OPENAI_API_KEY = systemVars.llm?.openaiApiKey;
  const OPENAI_MODEL = systemVars.llm?.openaiModel || 'gpt-4o';
  const ASSISTANT_ID = 'asst_UfoKbpfZLXD6YTDcg4MGzYP8';

  if (!OPENAI_API_KEY) {
    throw new Error(
      'Assistant configuration is missing. Please check your subscription or try again later.'
    );
  }

  const assistantResponse = await getOpenAIResponse(
    query,
    selectedGuide,
    OPENAI_API_KEY,
    ASSISTANT_ID,
    OPENAI_MODEL,
    existingThreadId || getStoredThreadId()
  );

  const answer = assistantResponse?.answer?.trim() || '';
  const finalAnswer =
    answer ||
    "I couldn't find specific information about that right now. However, I'm here to help you with questions about breathwork, meditation techniques, Kundalini practices, and The School of Breath courses.";

  const shortcuts = assistantResponse?.shortcuts?.length ? assistantResponse.shortcuts : [];

  if (assistantResponse.threadId) {
    storeThreadId(assistantResponse.threadId);
  }

  const result: AssistantResponse = {
    answer: finalAnswer,
    bullets: assistantResponse?.bullets ?? [],
    steps: assistantResponse?.steps ?? [],
    shortcuts,
    backgroundColor: '#E8D1D1',
    source: assistantResponse?.source || 'openai_assistant',
    threadId: assistantResponse.threadId,
  };

  return result;
};

// Simple init hook for ChatPage – validates system vars early
export const initAssistantSession = async (): Promise<void> => {
  await loadSystemVars();
};


