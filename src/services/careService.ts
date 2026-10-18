import { saveAccountItem } from './accountSync';
import { apiFetch } from './apiFetch';
import { COMPANION_CHOICES, isCompanionKind, type CompanionKind } from './companionService';
import { getCareToken, getCurrentUserId } from './session';
import { API_BASE } from './apiBase';
export { GROWTH_STAGES, growthStage, growthProgress } from './careGrowth';

export type CareAction = 'feed' | 'pet' | 'wash' | 'play' | 'rest' | 'breathe';
export type FoodKind = 'seeds' | 'berry' | 'biscuit';
export interface CareEvent {
  id: string; user_id: number; name: string; action: CareAction; food: string; xp_gain: number; created_at: string;
}
export interface CarePet {
  id: string; owner_id: number; kind: CompanionKind; name: string; xp: number;
  happiness: number; fullness: number; cleanliness: number; energy: number;
  members: { id: number; name: string }[]; events: CareEvent[]; updated_at: string;
}
export const CARE_REWARDS: Record<CareAction, number> = { feed: 10, pet: 5, wash: 8, play: 12, rest: 6, breathe: 15 };
export class CareError extends Error {
  constructor(message: string, public code: string) { super(message); }
}
// getRandomValues is available on HTTP LAN pages as well as localhost/HTTPS.
function newRequestId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('');
}
async function request(payload?: Record<string, unknown>) {
  const token = getCareToken();
  if (!token) throw new CareError('Please sign in again to sync companion care', 'CARE_LOGIN');
  const res = await apiFetch(`${API_BASE}/api/care`, {
    method: payload ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new CareError(data.message || 'Companion sync unavailable', data.code || 'CARE_SERVER');
  return data.data;
}
export async function loadCarePets(): Promise<CarePet[]> { return (await request()).pets; }
export async function sendCareAction(pet: CarePet, action: CareAction, food: FoodKind): Promise<CarePet> {
  return (await request({ op: 'action', pet_id: pet.id, action, food, request_id: newRequestId() })).pet;
}
export async function joinCareHome(code: string): Promise<CarePet> { return (await request({ op: 'join', code })).pet; }
export async function createCareInvite(pet: CarePet): Promise<string> { return (await request({ op: 'invite', pet_id: pet.id })).code; }
export async function manageCareHome(pet: CarePet, op: 'rename' | 'remove' | 'revoke' | 'leave', extra: Record<string, unknown> = {}): Promise<CarePet | undefined> {
  return (await request({ op, pet_id: pet.id, ...extra })).pet;
}
const storageKey = () => `puffsqueeze_care_local_v1_${getCurrentUserId()}`;
export function localCarePets(): CarePet[] {
  let saved: unknown;
  try { saved = JSON.parse(localStorage.getItem(storageKey()) || '[]'); } catch { saved = []; }
  return COMPANION_CHOICES.map(({ kind }) => {
    const previous = Array.isArray(saved) ? saved.find(p => isCompanionKind(p?.kind) && p.kind === kind) : undefined;
    const base: CarePet = { id: `local-${kind}`, owner_id: getCurrentUserId(), kind, name: '', xp: 0, happiness: 65, fullness: 55, cleanliness: 70, energy: 65, members: [{ id: getCurrentUserId(), name: 'You' }], events: [], updated_at: new Date().toISOString() };
    if (!previous) return base;
    return { ...base, name: typeof previous.name === 'string' ? previous.name.slice(0, 30) : '', xp: Number.isFinite(previous.xp) ? Math.max(0, Math.min(1000000, previous.xp)) : 0, ...Object.fromEntries(['happiness', 'fullness', 'cleanliness', 'energy'].map(key => [key, Number.isFinite(previous[key]) ? Math.max(25, Math.min(100, previous[key])) : base[key as keyof CarePet]])), events: Array.isArray(previous.events) ? previous.events.slice(0, 20) : [] };
  });
}
export function saveLocalCarePets(pets: CarePet[]) { saveAccountItem(storageKey(), JSON.stringify(pets.filter(p => p.id.startsWith('local-')))); }
export function applyLocalCareAction(pet: CarePet, action: CareAction, food: FoodKind): CarePet {
  const changes: Record<CareAction, Partial<Record<'happiness' | 'fullness' | 'cleanliness' | 'energy', number>>> = { feed: { fullness: 18, happiness: 4, cleanliness: -2 }, pet: { happiness: 12 }, wash: { cleanliness: 20, happiness: 4 }, play: { happiness: 18, energy: -6, fullness: -3 }, rest: { energy: 22, happiness: 3 }, breathe: { happiness: 15, energy: 8 } };
  const next = { ...pet, xp: Math.min(1000000, pet.xp + CARE_REWARDS[action]), updated_at: new Date().toISOString() };
  for (const [key, gain] of Object.entries(changes[action])) { const k = key as 'happiness' | 'fullness' | 'cleanliness' | 'energy'; next[k] = Math.max(25, Math.min(100, next[k] + gain)); }
  next.events = [{ id: newRequestId(), user_id: getCurrentUserId(), name: 'You', action, food: action === 'feed' ? food : '', xp_gain: CARE_REWARDS[action], created_at: next.updated_at }, ...pet.events].slice(0, 20);
  return next;
}
