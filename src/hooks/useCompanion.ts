import { useSyncExternalStore } from 'react';
import { getCurrentUserId } from '../services/session';
import { readCompanion, selectCompanion, subscribeToCompanion, type CompanionKind } from '../services/companionService';

export function useCompanion() {
  const userId = getCurrentUserId();
  const companion = useSyncExternalStore(
    subscribeToCompanion,
    () => readCompanion(userId),
    (): CompanionKind => 'bird',
  );
  return [companion, (kind: CompanionKind) => selectCompanion(kind, userId)] as const;
}
