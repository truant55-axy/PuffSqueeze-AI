import { API_BASE } from './apiBase';

const USER_ID_KEY = 'puffsqueeze_user_id';
const DEFAULT_USER_ID = 0;

export function getCurrentUserId(): number {
  const value = localStorage.getItem(USER_ID_KEY);
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_USER_ID;
}

export function setCurrentUserId(userId: number, careToken?: string): void {
  localStorage.setItem(USER_ID_KEY, String(userId));
  if (careToken) localStorage.setItem(`puffsqueeze_care_token_${userId}`, careToken);
  else localStorage.removeItem(`puffsqueeze_care_token_${userId}`);
}

export function getCareToken(): string | null {
  return localStorage.getItem(`puffsqueeze_care_token_${getCurrentUserId()}`);
}

export function clearCurrentUserId(): void {
  const token = getCareToken();
  if (token) void fetch(`${API_BASE}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => undefined);
  localStorage.removeItem(`puffsqueeze_care_token_${getCurrentUserId()}`);
  localStorage.removeItem(USER_ID_KEY);
}

export function hasCurrentUserId(): boolean {
  const value = localStorage.getItem(USER_ID_KEY);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && !!getCareToken();
}
