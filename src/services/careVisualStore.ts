import { saveAccountItem } from './accountSync';
import { getCurrentUserId } from './session';
import { growthStage } from './careGrowth';
import type { CarePet } from './careService';
import type { CompanionKind } from './companionService';
const event = 'puffsqueeze:care-growth';
const key = () => `puffsqueeze_care_visuals_${getCurrentUserId()}`;
export function readGrowthStage(kind: CompanionKind): 0 | 1 | 2 {
  try { const value = JSON.parse(localStorage.getItem(key()) || '{}')[kind]; return value === 1 || value === 2 ? value : 0; } catch { return 0; }
}
export function publishCareGrowth(pets: CarePet[]) {
  const stages = Object.fromEntries(pets.filter(p => p.owner_id === getCurrentUserId()).map(p => [p.kind, growthStage(p.xp)]));
  const serialized = JSON.stringify(stages);
  if (localStorage.getItem(key()) !== serialized) { saveAccountItem(key(), serialized); window.dispatchEvent(new Event(event)); }
}
export function subscribeCareGrowth(fn: () => void) {
  window.addEventListener(event, fn); window.addEventListener('storage', fn);
  return () => { window.removeEventListener(event, fn); window.removeEventListener('storage', fn); };
}
