import { API_BASE } from './apiBase';
import { apiFetch } from './apiFetch';

export type VoiceId = 'ana' | 'xiaoxiao';
export type VoiceClip = { id: string; text: string; voice: VoiceId; audio: string; createdAt: string };
export class VoiceServiceError extends Error {
  constructor(public code: string) { super(code); }
}

export async function synthesizeVoice(text: string, voice: VoiceId, signal: AbortSignal): Promise<string> {
  const response = await apiFetch(`${API_BASE}/api/voice/synthesize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }), signal,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) throw new VoiceServiceError(json?.code ?? 'voice_unavailable');
  if (typeof json.data?.audio_base64 !== 'string' || json.data.audio_base64.length > 1400000 || json.data.mime_type !== 'audio/mpeg') {
    throw new VoiceServiceError('voice_unavailable');
  }
  return `data:audio/mpeg;base64,${json.data.audio_base64}`;
}

export async function transcribeRecording(audio: Blob, language: string, signal: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append('audio', audio, 'recording');
  form.append('language', language.startsWith('zh') ? 'zh' : 'en');
  const response = await apiFetch(`${API_BASE}/api/voice/transcribe`, { method: 'POST', body: form, signal });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success || typeof json.data?.text !== 'string') throw new VoiceServiceError(json?.code ?? 'voice_unavailable');
  return json.data.text.slice(0, 600);
}
