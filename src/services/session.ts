const USER_ID_KEY = 'puffsqueeze_user_id';
const DEFAULT_USER_ID = 1;

export function getCurrentUserId(): number {
  const value = localStorage.getItem(USER_ID_KEY);
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_USER_ID;
}

export function setCurrentUserId(userId: number): void {
  localStorage.setItem(USER_ID_KEY, String(userId));
}

export function clearCurrentUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}

export function hasCurrentUserId(): boolean {
  const value = localStorage.getItem(USER_ID_KEY);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}
