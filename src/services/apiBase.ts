// Vite forwards PHP requests from the same origin, including LAN devices.
// This avoids resolving a friend's "localhost" to their own computer.
// Production defaults to this website's /api, independent of its domain.
const configured = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
export const API_BASE = import.meta.env.DEV ? '/backend' : configured;
