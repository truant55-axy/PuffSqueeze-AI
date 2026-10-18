// Stage thresholds and progress calculation adapted from Mori/Tamagochi:
// https://github.com/Tech-aficionado/Tamagochi---Open-Source-Game
// Copyright (c) 2026 Tamagochi contributors. MIT; see public/credits/mori-license.txt.
export const GROWTH_STAGES = [
  { en: 'First connection', zh: '初遇期', detailEn: 'Getting to know each other', detailZh: '从熟悉彼此开始', minimum: 0, nextAt: 120 },
  { en: 'Explorer', zh: '探索期', detailEn: 'A rounder form, a curious new pose', detailZh: '圆润舒展，好奇初长', minimum: 120, nextAt: 320 },
  { en: 'Mature companion', zh: '成熟期', detailEn: 'A fuller form, a relaxed presence', detailZh: '体态饱满，姿态更从容', minimum: 320, nextAt: null },
] as const;
export function growthStage(points: number): 0 | 1 | 2 {
  if (points >= 320) return 2;
  if (points >= 120) return 1;
  return 0;
}
export function growthProgress(points: number) {
  const index = growthStage(points);
  const stage = GROWTH_STAGES[index];
  const level = 1 + Math.floor(points / 40);
  if (stage.nextAt === null) return { index, stage, percent: 100, remaining: 0, level };
  const range = stage.nextAt - stage.minimum;
  const progress = Math.max(0, points - stage.minimum);
  return { index, stage, percent: Math.min(100, progress / range * 100), remaining: Math.max(0, stage.nextAt - points), level };
}
