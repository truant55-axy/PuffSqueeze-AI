import { API_BASE } from './apiBase';
import { apiFetch } from './apiFetch';

export type VoiceId = 'ana' | 'xiaoxiao' | 'clone';
export type VoiceChoice = VoiceId | 'off';
export type VoiceClip = { id: string; text: string; voice: VoiceId; audio: string; createdAt: string };
export type VoiceProfile = {
  display_name: string;
  ai_voice: VoiceChoice;
  interaction_voice: VoiceChoice;
  created_at: string;
  updated_at: string;
};
export class VoiceServiceError extends Error {
  constructor(public code: string, public status = 0) { super(code); }
}

let configuredPlayer: HTMLAudioElement | null = null;

export async function synthesizeVoice(text: string, voice: VoiceId | 'auto', signal: AbortSignal, purpose: 'studio' | 'ai' | 'interaction' = 'studio'): Promise<string> {
  const response = await apiFetch(`${API_BASE}/api/voice/synthesize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, purpose }), signal,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) throw new VoiceServiceError(json?.code ?? 'voice_unavailable');
  if (typeof json.data?.audio_base64 !== 'string' || json.data.audio_base64.length > 1400000 || json.data.mime_type !== 'audio/mpeg') {
    throw new VoiceServiceError('voice_unavailable');
  }
  return `data:audio/mpeg;base64,${json.data.audio_base64}`;
}

export async function transcribeRecording(audio: Blob, language: string, signal: AbortSignal): Promise<{ text: string; recordingId: number }> {
  const form = new FormData();
  const extension = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : audio.type.includes('wav') ? 'wav' : 'webm';
  form.append('audio', audio, `recording.${extension}`);
  form.append('language', language.startsWith('zh') ? 'zh' : 'en');
  let response: Response;
  try {
    response = await apiFetch(`${API_BASE}/api/voice/transcribe`, {
      method: 'POST', headers: { Accept: 'application/json' }, body: form, signal, cache: 'no-store',
    });
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new VoiceServiceError('transcription_timeout');
    }
    throw new VoiceServiceError('network_unavailable');
  }
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success || typeof json.data?.text !== 'string') {
    const code = response.status === 401 ? 'login_required'
      : response.status === 502 ? 'transcription_unavailable'
      : response.status === 503 ? 'recording_storage_unavailable'
      : json?.code ?? 'voice_unavailable';
    throw new VoiceServiceError(code, response.status);
  }
  return { text: json.data.text.slice(0, 600), recordingId: Number(json.data.recording_id) || 0 };
}

export async function loadVoiceProfile(signal?: AbortSignal): Promise<VoiceProfile | null> {
  const response = await apiFetch(`${API_BASE}/api/voice/profile`, { signal });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) throw new VoiceServiceError(json?.code ?? 'voice_unavailable');
  return json.data?.profile ?? null;
}

export async function cloneOwnVoice(recordingId: number, name: string, consent: boolean, signal: AbortSignal): Promise<VoiceProfile> {
  const response = await apiFetch(`${API_BASE}/api/voice/clone`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ recording_id: recordingId, name, consent }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success || !json.data?.profile) throw new VoiceServiceError(json?.code ?? 'clone_unavailable');
  return json.data.profile as VoiceProfile;
}

export async function saveVoicePreferences(aiVoice: VoiceChoice, interactionVoice: VoiceChoice): Promise<VoiceProfile> {
  const response = await apiFetch(`${API_BASE}/api/voice/profile`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ai_voice: aiVoice, interaction_voice: interactionVoice }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success || !json.data?.profile) throw new VoiceServiceError(json?.code ?? 'voice_unavailable');
  return json.data.profile as VoiceProfile;
}

export async function deleteVoiceClone(): Promise<void> {
  const response = await apiFetch(`${API_BASE}/api/voice/profile`, { method: 'DELETE' });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) throw new VoiceServiceError(json?.code ?? 'voice_unavailable');
}

export async function playConfiguredVoice(text: string, purpose: 'ai' | 'interaction', signal?: AbortSignal): Promise<HTMLAudioElement | null> {
  const controller = signal ? null : new AbortController();
  const audioData = await synthesizeVoice(text.slice(0, 600), 'auto', signal ?? controller!.signal, purpose);
  configuredPlayer?.pause();
  const player = new Audio(audioData);
  configuredPlayer = player;
  player.addEventListener('ended', () => { if (configuredPlayer === player) configuredPlayer = null; }, { once: true });
  await player.play();
  return player;
}
