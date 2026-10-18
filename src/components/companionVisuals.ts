import type { CompanionKind } from '../services/companionService';

export interface CompanionEye {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation?: number;
}

export interface CompanionVisual {
  src: string;
  eyes: readonly CompanionEye[];
  eyeColor?: string;
  liveEyes?: boolean;
  crop?: { x: number; y: number; width: number; height: number; atlasWidth: number; atlasHeight: number; clipPoints?: string };
}

// Landmarks share the square PNGs' 1000 x 1000 coordinate system.
// The artwork supplies closed eyelids; live SVG eyes open over them.
export const companionVisuals: Record<CompanionKind, CompanionVisual> = {
  bird: { src: '/assets/companions/generated/puff-bird-v5.png', eyeColor: '#2c3644', eyes: [
    { x: 400, y: 435, rx: 10, ry: 14 }, { x: 592, y: 462, rx: 10, ry: 14 },
  ] },
  cat: { src: '/assets/companions/generated/cat-cozy-v2.png', eyes: [
    { x: 598.1, y: 461.7, rx: 60.6, ry: 61.4 }, { x: 851.7, y: 412.3, rx: 44.7, ry: 68.6 },
  ] },
  dog: { src: '/assets/companions/generated/dog-spaniel-v2.png', eyes: [
    { x: 562.6, y: 301.4, rx: 42.7, ry: 54.2 }, { x: 737.7, y: 241.6, rx: 25.6, ry: 44.6 },
  ] },
  pig: { src: '/assets/companions/generated/pig-seated-v2.png', eyes: [
    { x: 475.7, y: 385.2, rx: 45.9, ry: 52.7 }, { x: 744.4, y: 327.0, rx: 33.9, ry: 45.5 },
  ] },
  penguin: { src: '/assets/companions/generated/penguin-cozy-v2.png', eyes: [
    { x: 509.6, y: 352.5, rx: 48.7, ry: 57.4 }, { x: 731.3, y: 287.1, rx: 34.3, ry: 55.8 },
  ] },
  owl: { src: '/assets/companions/generated/owl-cozy-v2.png', eyes: [
    { x: 531.1, y: 394.7, rx: 59.8, ry: 66.2 }, { x: 783.9, y: 349.3, rx: 45.5, ry: 66.2 },
  ] },
  seagull: { src: '/assets/companions/generated/seagull-cozy-v2.png', eyes: [
    { x: 577.8, y: 311.8, rx: 48.3, ry: 55.8 }, { x: 758.8, y: 265.6, rx: 25.9, ry: 51.1 },
  ] },
  dolphin: { src: '/assets/companions/generated/dolphin-blue-v2.png', eyeColor: '#49576b', eyes: [
    { x: 622.9, y: 265.6, rx: 48.7, ry: 50.3 }, { x: 804.3, y: 240.8, rx: 21.2, ry: 44.6 },
  ] },
};
