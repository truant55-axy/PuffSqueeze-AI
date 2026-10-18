import { recordActivity, flushAccountSync } from './accountSync';
import { apiFetch } from './apiFetch';
import { API_BASE } from './apiBase';

export interface WeeklyMetric {
  date: string;
  day: string;
  count: number;
  stress: number;
}

export interface DashboardData {
  today_squeezes: number;
  total_squeezes: number;
  current_stress: number;
  stress_status: string;
  weekly_average_squeezes: number;
  weekly: WeeklyMetric[];
}

export interface AuthUser {
  id: number;
  email: string;
  display_name: string;
  care_token?: string;
}

export interface UserProfile {
  id: number;
  email: string;
  display_name: string;
  age: number | null;
  gender: string;
  signature: string;
  avatar_url: string;
}

export interface ConnectPost {
  id: string;
  user_id: number;
  content_text: string;
  media_type: 'none' | 'image' | 'video';
  media_mime: string;
  media_data: string;
  media_url: string;
  visibility: 'public';
  published_at: string;
  author: {
    name: string;
    email: string;
    avatar: string;
  };
}

export interface UsagePayload {
  user_id: number;
  action_type: string;
  action_detail?: Record<string, unknown>;
}

export interface LatestSqueezeData {
  user_id: number;
  device_id: string;
  strike_value: number;
  raw_data?: Record<string, unknown>;
  received_at: string;
}

const M5_API_BASE = import.meta.env.VITE_M5_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8090' : '');

async function parseJson(res: Response) {
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Request failed');
  }
  return data;
}

export async function getDashboard(userId: number): Promise<DashboardData> {
  const res = await apiFetch(`${API_BASE}/api/dashboard?user_id=${userId}`);
  const data = await parseJson(res);
  return data.data as DashboardData;
}

export async function recordSqueezeEvent(userId: number, strikeValue: number): Promise<DashboardData> {
  const saved = await recordActivity('squeeze', { device_id: 'M5StickCPlus', strike_value: strikeValue, raw_data: { simulated: true, client_time: new Date().toISOString() } }, userId);
  if (!saved) throw new Error('Device storage unavailable; squeeze could not be queued');
  if (!await flushAccountSync()) throw new Error('Squeeze saved on this device; waiting to sync');
  return getDashboard(userId);
}

export async function getAiSuggestion(userId: number): Promise<string> {
  const res = await apiFetch(`${API_BASE}/api/ai/suggestion?user_id=${userId}`);
  const data = await parseJson(res);
  return data.data.suggestion as string;
}

export async function getAiReport(userId: number, lang: 'en' | 'zh' = 'en'): Promise<string> {
  const res = await apiFetch(`${API_BASE}/api/ai/report?user_id=${userId}&lang=${lang}`);
  const data = await parseJson(res);
  return data.data.report as string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  }, false);
  const data = await parseJson(res);
  return data.data as AuthUser;
}

export async function register(email: string, displayName: string, password: string): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      display_name: displayName,
      password,
    }),
  }, false);
  const data = await parseJson(res);
  return data.data as AuthUser;
}

export async function getProfile(userId: number): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/api/profile?user_id=${userId}`);
  const data = await parseJson(res);
  return data.data as UserProfile;
}

export async function updateProfile(
  userId: number,
  payload: { display_name?: string; age?: number | null; gender?: string; signature?: string }
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/profile/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      ...payload,
    }),
  });
  await parseJson(res);
}

export async function getConnectPosts(limit = 50): Promise<ConnectPost[]> {
  const res = await apiFetch(`${API_BASE}/api/connect/posts?limit=${limit}`);
  const data = await parseJson(res);
  return data.data.posts as ConnectPost[];
}

export async function createConnectPost(payload: {
  user_id: number;
  content_text?: string;
  media_type?: 'none' | 'image' | 'video';
  media_mime?: string;
  media_data?: string;
  media_url?: string;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/connect/post/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  await parseJson(res);
}

export async function logUsage(payload: UsagePayload): Promise<number> {
  if (!await recordActivity(payload.action_type, payload.action_detail ?? {}, payload.user_id)) throw new Error('Could not save activity');
  return 0;
}

export async function getLatestSqueeze(): Promise<LatestSqueezeData | null> {
  if (!M5_API_BASE) return null;
  const res = await fetch(`${M5_API_BASE}/api/latest-squeeze`);
  const data = await parseJson(res);
  return (data?.data ?? null) as LatestSqueezeData | null;
}
