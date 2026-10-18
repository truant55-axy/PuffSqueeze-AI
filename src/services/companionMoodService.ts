import { saveAccountItem } from './accountSync';
import type { CompanionKind } from './companionService';
import { getCurrentUserId } from './session';

export type CompanionMood = 'happy' | 'calm' | 'tired' | 'sleepy';
export const COMPANION_MOODS: readonly { value: CompanionMood; en: string; zh: string; detailEn: string; detailZh: string }[] = [
  { value: 'happy', en: 'Happy', zh: '开心', detailEn: 'A little joy, shared with you.', detailZh: '把一点小开心分享给你。' },
  { value: 'calm', en: 'Calm', zh: '平静', detailEn: 'Here with you, at your pace.', detailZh: '安静陪着你，按自己的节奏来。' },
  { value: 'tired', en: 'Tired', zh: '疲惫', detailEn: 'It is okay to slow down.', detailZh: '有点累了，慢下来也没关系。' },
  { value: 'sleepy', en: 'Sleepy', zh: '困倦', detailEn: 'A sleepy yawn. Time for a little rest.', detailZh: '打个哈欠，慢慢歇一会儿。' },
];
const eventName = 'puffsqueeze:companion-mood';
const key = (userId: number) => 'puffsqueeze_companion_moods_' + userId;
type MoodMap = Partial<Record<CompanionKind, CompanionMood>>;
const memory = new Map<number, MoodMap>();
function isMood(value: unknown): value is CompanionMood {
  return COMPANION_MOODS.some(mood => mood.value === value);
}
function readMap(userId: number): MoodMap {
  if (memory.has(userId)) return memory.get(userId)!;
  try {
    const value = JSON.parse(localStorage.getItem(key(userId)) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
export function readCompanionMood(kind: CompanionKind, userId = getCurrentUserId()): CompanionMood {
  const value = readMap(userId)[kind];
  if (isMood(value)) return value;
  // Preserve a Bird expression chosen before the controls covered all species.
  if (kind === 'bird') {
    try { const old = localStorage.getItem('puffsqueeze_bird_mood_' + userId); if (isMood(old)) return old; } catch { /* Default below. */ }
  }
  return 'calm';
}
export function selectCompanionMood(kind: CompanionKind, mood: CompanionMood, userId = getCurrentUserId()) {
  if (!isMood(mood)) return;
  const next = { ...readMap(userId), [kind]: mood };
  try { saveAccountItem(key(userId), JSON.stringify(next), userId); memory.delete(userId); }
  catch { memory.set(userId, next); }
  window.dispatchEvent(new Event(eventName));
}
export function subscribeCompanionMood(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith('puffsqueeze_companion_moods_') || event.key.startsWith('puffsqueeze_bird_mood_')) {
      memory.clear();
      onChange();
    }
  };
  window.addEventListener(eventName, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(eventName, onChange);
    window.removeEventListener('storage', onStorage);
  };
}
