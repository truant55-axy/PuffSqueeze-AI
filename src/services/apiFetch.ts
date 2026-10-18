import { getCareToken } from './session';

export async function apiFetch(url: string, init: RequestInit = {}, authenticated = true): Promise<Response> {
  const token = authenticated ? getCareToken() : null;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(45000) });
  if (authenticated && response.status === 401 && token === getCareToken()) {
    window.dispatchEvent(new Event('puffsqueeze:auth-expired'));
  }
  return response;
}
