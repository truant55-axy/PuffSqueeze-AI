import { API_BASE } from './apiBase';
import { apiFetch } from './apiFetch';
import { getCurrentUserId } from './session';

type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] };

interface ChatContext {
  userId?: number;
  strikeLevel?: 'low' | 'medium' | 'high' | 'unknown';
  deviceData?: Record<string, unknown>;
}


export async function getChatResponse(message: string, history: ChatHistory[], context: ChatContext = {}) {
  const userId = context.userId ?? getCurrentUserId();

  const res = await apiFetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      message,
      history,
      strike_level: context.strikeLevel ?? 'unknown',
      device_data: context.deviceData ?? {},
    }),
  });

  const raw = await res.text();
  let data: any = null;
  if (raw && raw.trim() !== '') {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`AI returned non-JSON response (HTTP ${res.status})`);
    }
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `AI request failed (HTTP ${res.status})`);
  }

  return data.data.reply as string;
}
