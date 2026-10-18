import { saveAccountItem } from './accountSync';
import { getCurrentUserId } from './session';

export type CompanionKind = 'bird' | 'cat' | 'dog' | 'pig' | 'penguin' | 'owl' | 'seagull' | 'dolphin';

export const COMPANION_CHOICES: { kind: CompanionKind; emoji: string; en: string; zh: string }[] = [
  { kind: 'bird', emoji: '🐦', en: 'captain bird', zh: 'captain bird' },
  { kind: 'cat', emoji: '🐈', en: 'Tabby cat', zh: '灰蓝猫' },
  { kind: 'dog', emoji: '🐶', en: 'Spaniel', zh: '垂耳犬' },
  { kind: 'pig', emoji: '🐷', en: 'Pig', zh: '小猪' },
  { kind: 'penguin', emoji: '🐧', en: 'Penguin', zh: '企鹅' },
  { kind: 'owl', emoji: '🦉', en: 'Owl', zh: '猫头鹰' },
  { kind: 'seagull', emoji: '🐦', en: 'Seagull', zh: '海鸥' },
  { kind: 'dolphin', emoji: '🐬', en: 'Dolphin', zh: '海豚' },
];

const COMPANION_EVENT = 'puffsqueeze:companion-change';

export function isCompanionKind(value: unknown): value is CompanionKind {
  return COMPANION_CHOICES.some((choice) => choice.kind === value);
}

export function readCompanion(userId = getCurrentUserId()): CompanionKind {
  const saved = localStorage.getItem(`puffsqueeze_companion_${userId}`);
  if (saved === 'fox') return 'cat';
  if (saved === 'frog') return 'dog';
  return isCompanionKind(saved) ? saved : 'bird';
}

export function selectCompanion(kind: CompanionKind, userId = getCurrentUserId()): void {
  saveAccountItem(`puffsqueeze_companion_${userId}`, kind, userId);
  window.dispatchEvent(new Event(COMPANION_EVENT));
}

export function subscribeToCompanion(onChange: () => void): () => void {
  window.addEventListener(COMPANION_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(COMPANION_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
