import { saveAccountItem } from '../../services/accountSync';
import { getCurrentUserId } from '../../services/session';

export const FISH_CATALOG = [
  { id: 'ripple', en: 'Ripple minnow', zh: '涟漪银鱼', color: '#83b9cc', accent: '#c6e5ee', weight: 30, depth: 0, points: 1 },
  { id: 'mint', en: 'Mint puffer', zh: '薄荷小河豚', color: '#8dbfb3', accent: '#d3e9d8', weight: 24, depth: 0, points: 1 },
  { id: 'peach', en: 'Peach fantail', zh: '蜜桃扇尾鱼', color: '#dfa798', accent: '#f6d8c5', weight: 18, depth: 1, points: 2 },
  { id: 'lilac', en: 'Lilac angelfish', zh: '丁香神仙鱼', color: '#aaa7cd', accent: '#dcd8ee', weight: 14, depth: 1, points: 2 },
  { id: 'gold', en: 'Sunbeam koi', zh: '金光小锦鲤', color: '#d4ba79', accent: '#f5e6b3', weight: 9, depth: 2, points: 3 },
  { id: 'moon', en: 'Moonlit pearl', zh: '月光珍珠鱼', color: '#94aabf', accent: '#e5ebf5', weight: 5, depth: 2, points: 5 },
  { id: 'clown', en: 'Apricot clownfish', zh: '杏子小丑鱼', color: '#dca17b', accent: '#f5d9b9', weight: 10, depth: 0, points: 2 },
  { id: 'ray', en: 'Cloud ray', zh: '云朵小鳐鱼', color: '#95b5c9', accent: '#dae9ef', weight: 6, depth: 2, points: 4 },
  { id: 'ribbon', en: 'Breeze ribbonfish', zh: '微风丝带鱼', color: '#8eafb8', accent: '#d6e7e6', weight: 8, depth: 1, points: 3 },
  { id: 'bubble', en: 'Buttercup boxfish', zh: '奶油方方鱼', color: '#cfbc82', accent: '#f0e5c0', weight: 8, depth: 0, points: 2 },
] as const;
export type FishId = typeof FISH_CATALOG[number]['id'];
export type FishSpecies = typeof FISH_CATALOG[number];
export const FISH_TRAITS: Record<FishId, { en: string; zh: string }> = {
  ripple: { en: 'A slender swimmer with a silver stripe and a forked tail.', zh: '细长的身体，带着一条银色细纹和小小的叉尾。' },
  mint: { en: 'A round little puffer with tiny dots and soft-looking spines.', zh: '圆鼓鼓的小河豚，身上有圆点和软乎乎的小刺。' },
  peach: { en: 'A peach-colored fish trailing a broad, flowing fan tail.', zh: '蜜桃色的圆身体，拖着一把轻轻摆动的大扇尾。' },
  lilac: { en: 'Tall triangular fins and pale stripes, like a little sail.', zh: '高高的三角鱼鳍配着浅色条纹，像一面小小的帆。' },
  gold: { en: 'Cream and gold patches, with a long, gently swishing tail.', zh: '奶白色与金色的斑纹，配上轻轻摇摆的长尾巴。' },
  moon: { en: 'A tall, round body scattered with little pearl-like spots.', zh: '像月亮一样的圆盘身体，点缀着珍珠般的小圆点。' },
  clown: { en: 'An apricot swimmer wearing two soft cream-colored bands.', zh: '杏子色的小丑鱼，穿着两道奶油色的条纹。' },
  ray: { en: 'Cloud-like wings and a thin ribbon of a tail.', zh: '像云朵一样展开的小翅膀，身后跟着细细的长尾。' },
  ribbon: { en: 'A long, flowing silhouette with a pale stripe along its side.', zh: '细长柔软的轮廓，身侧的一道浅纹像流动的丝带。' },
  bubble: { en: 'A softly squared body, tiny fins and little dotted freckles.', zh: '圆角方方的身体，小小的鱼鳍，还有点点小雀斑。' },
};
export type FishingDifficulty = 'gentle' | 'flow' | 'challenge';
export interface FishCollection { counts: Partial<Record<FishId, number>>; total: number }
const collectionKey = (userId: number) => `puffsqueeze_fishing_collection_v1_${userId}`;
export const FISHING_STORAGE_EVENT = 'puffsqueeze:fishing-collection';

export function readFishCollection(userId = getCurrentUserId()): { collection: FishCollection; available: boolean } {
  const empty: FishCollection = { counts: {}, total: 0 };
  try {
    const raw = localStorage.getItem(collectionKey(userId));
    if (!raw) return { collection: empty, available: true };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('counts' in value) || !value.counts || typeof value.counts !== 'object' || Array.isArray(value.counts)) throw new Error('collection');
    const counts: FishCollection['counts'] = {};
    for (const fish of FISH_CATALOG) {
      const count = (value.counts as Record<string, unknown>)[fish.id];
      if (count === undefined) continue;
      if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw new Error('collection');
      counts[fish.id] = count;
    }
    return { collection: { counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) }, available: true };
  } catch { return { collection: empty, available: false }; }
}

export function keepFish(id: FishId, userId = getCurrentUserId()): FishCollection {
  const saved = readFishCollection(userId);
  if (!saved.available) throw new Error('storage');
  const counts = { ...saved.collection.counts, [id]: (saved.collection.counts[id] ?? 0) + 1 };
  const next = { counts, total: saved.collection.total + 1 };
  saveAccountItem(collectionKey(userId), JSON.stringify(next), userId);
  window.dispatchEvent(new Event(FISHING_STORAGE_EVENT));
  return next;
}

export function chooseFish(): FishSpecies {
  let choice = Math.random() * FISH_CATALOG.reduce((sum, fish) => sum + fish.weight, 0);
  for (const fish of FISH_CATALOG) { choice -= fish.weight; if (choice < 0) return fish; }
  return FISH_CATALOG[0];
}
