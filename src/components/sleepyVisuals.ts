import type { CompanionKind } from '../services/companionService';
import type { CompanionVisual } from './companionVisuals';

// Dedicated sleepy face edits keep drooping lids and yawning mouths through growth.
export function getSleepyVisual(kind: CompanionKind, stage: 0 | 1 | 2, normal: CompanionVisual): CompanionVisual {
  if (stage === 0) {
    return {
      src: '/assets/companions/generated/' + (kind === 'bird' ? 'puff-bird' : kind) + '-sleepy-v1.png',
      eyes: [],
    };
  }
  return {
    ...normal,
    src: '/assets/companions/generated/growth-' + (stage === 1 ? 'explorer' : 'mature') + '-sleepy-atlas-v3.png',
    eyes: [],
    liveEyes: false,
  };
}
