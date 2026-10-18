import { useSyncExternalStore } from 'react';
import { getCurrentUserId } from '../services/session';
import type { CompanionKind } from '../services/companionService';
import { readCompanionMood, selectCompanionMood, subscribeCompanionMood, type CompanionMood } from '../services/companionMoodService';

export function useCompanionMood(kind: CompanionKind) {
  const userId = getCurrentUserId();
  const mood = useSyncExternalStore(subscribeCompanionMood, () => readCompanionMood(kind, userId), (): CompanionMood => 'calm');
  return [mood, (next: CompanionMood) => selectCompanionMood(kind, next, userId)] as const;
}
