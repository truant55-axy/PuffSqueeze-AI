import type { FishId } from './catalog';

// Original vector artwork. Canvas fish and journal SVGs share these exact paths.
export type FishInk = 'body' | 'accent' | 'pattern' | 'cream' | 'blush';
export interface FishPart { path: string; ink: FishInk; opacity?: number }
export interface FishArtwork {
  body: string;
  tail: string;
  tailX: number;
  tailSwing: number;
  back: FishPart[];
  marks: FishPart[];
  fins: FishPart[];
  eye: { x: number; y: number; r: number };
  radiusX: number;
  radiusY: number;
}
const part = (path: string, ink: FishInk, opacity = 1): FishPart => ({ path, ink, opacity });
export const FISH_ARTWORK: Record<FishId, FishArtwork> = {
  ripple: {
    body: 'M22 0C10-8-10-8-20 0C-10 8 10 8 22 0Z',
    tail: 'M2 0Q-7-4-14-10L-11 0-14 10Q-7 4 2 0Z', tailX: -18, tailSwing: 1,
    back: [part('M-7-4Q-4-13 3-5Z', 'body', .8)],
    marks: [part('M-19-1Q0-5 20-1L20 1Q0-1-19 2Z', 'cream', .8), part('M-10 3Q4 2 17 3L12 7-6 7Z', 'accent')],
    fins: [part('M0 1Q-7 3-6 8Q0 7 4 2Z', 'accent', .9)],
    eye: { x: 15, y: -1.6, r: 2.1 }, radiusX: 20, radiusY: 6,
  },
  mint: {
    body: 'M17 0C18-11 8-17-2-16C-13-15-19-7-18 2C-16 14-4 18 7 13Q17 10 17 0Z',
    tail: 'M2 0Q-6-9-13-7L-10 0-13 7Q-6 9 2 0Z', tailX: -16, tailSwing: .65,
    back: [part('M-10-12L-12-18-5-15-1-20 3-15 9-17 10-11Z', 'body', .6)],
    marks: [part('M-18 2Q-2-3 17 3L15 14Q-5 24-18 10Z', 'accent'), part('M-11-7a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0M-5-11a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M2-8a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M-13 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0', 'pattern', .55)],
    fins: [part('M-1 1Q-10-2-9 6Q-6 10 1 5Z', 'body', .65), part('M9 3a2.4 1.7 0 1 0 4.8 0a2.4 1.7 0 1 0-4.8 0', 'blush', .6)],
    eye: { x: 10, y: -3, r: 2.7 }, radiusX: 17, radiusY: 15,
  },
  peach: {
    body: 'M17-1C17-10 4-15-8-9C-19-4-16 8-5 11C6 14 16 8 17-1Z',
    tail: 'M2 0C-5-5-8-16-20-16Q-14-7-18-1Q-25 8-23 16C-12 18-4 6 2 0Z', tailX: -13, tailSwing: .75,
    back: [part('M-9-8Q-4-21 4-12L7-8Z', 'body', .7)],
    marks: [part('M-15 3Q-2 0 15 3L8 15-9 12Z', 'accent'), part('M-10-6Q-3-10 4-7Q-4-5-10-6Z', 'cream', .6)],
    fins: [part('M-1 2Q-12 9-8 16Q0 13 4 5Z', 'body', .75)],
    eye: { x: 10, y: -2, r: 2.7 }, radiusX: 16, radiusY: 12,
  },
  lilac: {
    body: 'M16 0Q8-11-2-10Q-13-8-15 0Q-12 9-2 11Q9 10 16 0Z',
    tail: 'M1 0L-13-8Q-10 0-13 8Z', tailX: -13, tailSwing: .65,
    back: [part('M-11-3Q-8-16-1-26L4-7Z', 'body', .8), part('M-10 5Q-5 23 1 26L4 7Z', 'body', .8), part('M4 8Q7 19 4 23Q9 17 9 7Z', 'accent', .9)],
    marks: [part('M-10-14L-5-15-2 16-6 16Z', 'pattern', .38), part('M0-15L4-14 8 15 3 16Z', 'cream', .8)],
    fins: [part('M-1 2Q-6 5-5 11Q2 8 4 3Z', 'accent')],
    eye: { x: 10, y: -1.5, r: 2.4 }, radiusX: 15, radiusY: 13,
  },
  gold: {
    body: 'M23 0C13-8-6-10-21-1C-9 11 13 10 23 0Z',
    tail: 'M2 0Q-6-4-16-11Q-12-3-9 0Q-16 8-18 14Q-5 9 2 0Z', tailX: -19, tailSwing: .85,
    back: [part('M-10-6Q-7-13 3-9L8-5Z', 'body', .7)],
    marks: [part('M-24-10H26V12H-24Z', 'cream', .5), part('M-12-6Q-7-10-3-6Q0-2-5 0Q-13 1-12-6ZM3-7Q12-8 13-2Q10 3 5 1Q1-1 3-7ZM-1 3Q4 0 7 5L2 9-4 7Z', 'body'), part('M-19-1Q-10-4-11 2L-17 5Z', 'pattern', .5)],
    fins: [part('M0 2Q-6 8-4 12Q2 10 5 4Z', 'accent')],
    eye: { x: 16, y: -1.5, r: 2.2 }, radiusX: 21, radiusY: 9,
  },
  moon: {
    body: 'M14 0C14-11 7-20-3-18C-13-16-17-4-14 6C-10 19 1 21 9 12Q15 7 14 0Z',
    tail: 'M1 0L-10-6Q-6 0-10 6Z', tailX: -13, tailSwing: .5,
    back: [part('M-10-12Q-7-23 0-21L6-15Z', 'body', .75), part('M-11 10Q-7 24 0 23L6 15Z', 'body', .75)],
    marks: [part('M-10-16Q0-9-1 0Q-2 11 7 16L-2 23-16 6Z', 'accent', .9), part('M-6-10a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M-9-3a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M-6 6a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0', 'cream', .85)],
    fins: [part('M1 1Q-9 1-8 8Q-3 11 4 4Z', 'body', .6)],
    eye: { x: 9, y: -3, r: 2.7 }, radiusX: 14, radiusY: 18,
  },
  clown: {
    body: 'M20 0C15-10-5-13-17-4Q-22 1-14 8C-1 16 16 10 20 0Z',
    tail: 'M1 0Q-6-8-13-7Q-17 0-13 7Q-6 8 1 0Z', tailX: -17, tailSwing: .8,
    back: [part('M-13-7Q-4-19 8-10L12-6Z', 'body', .85)],
    marks: [part('M-13-15L-7-15Q-12 0-6 16L-13 16Q-19 1-13-15ZM2-15L8-15Q2 0 9 16L3 16Q-4 0 2-15Z', 'cream')],
    fins: [part('M-1 3Q-8 4-6 12Q0 12 5 5Z', 'body', .75)],
    eye: { x: 14, y: -1.5, r: 2.5 }, radiusX: 19, radiusY: 11,
  },
  ray: {
    body: 'M19 0Q12-6 2-8Q-8-12-17-20Q-16-6-11 0Q-17 6-17 20Q-8 12 2 8Q12 6 19 0Z',
    tail: 'M3 0Q-10-4-21 2Q-26 4-31 1Q-24 8-18 5Q-6 0 3 2Z', tailX: -10, tailSwing: .5,
    back: [],
    marks: [part('M-16 13Q-7 7 17 2L12 8-14 21Z', 'accent', .8), part('M-9-9a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0M-5-5a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0M-9 9a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0', 'cream', .8)],
    fins: [part('M-12-14Q-8-7 2-4L-7-8Z', 'accent', .55), part('M-12 14Q-8 7 2 4L-7 8Z', 'accent', .55)],
    eye: { x: 9, y: -3, r: 2.4 }, radiusX: 16, radiusY: 17,
  },
  ribbon: {
    body: 'M27-1Q18-8 6-6Q-8-3-28-1Q-10 5 6 6Q21 8 27-1Z',
    tail: 'M2 0Q-9-8-17-6Q-11-2-13 0Q-20 4-21 10Q-8 6 2 0Z', tailX: -25, tailSwing: 1.1,
    back: [part('M-20-2Q-11-10-4-6Q5-12 15-6L20-3Z', 'body', .6)],
    marks: [part('M-28-1Q2-2 25-2L25 0Q2 1-28 1Z', 'cream', .85)],
    fins: [part('M7 2Q0 7 2 10Q11 7 14 3Z', 'accent', .9)],
    eye: { x: 21, y: -1, r: 2.1 }, radiusX: 26, radiusY: 6,
  },
  bubble: {
    body: 'M15-9Q21-7 21 0Q21 8 15 10L-10 11Q-17 9-17 2L-17-5Q-17-12-9-12Z',
    tail: 'M1 0Q-5-7-12-6L-11 0-12 6Q-5 7 1 0Z', tailX: -16, tailSwing: .6,
    back: [part('M-6-10Q-7-17-1-17Q4-15 3-10Z', 'body', .65)],
    marks: [part('M-18 3Q0-1 22 4L20 14H-18Z', 'accent'), part('M-10-5a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M-2-6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M5-5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M-6 2a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0M2 3a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0', 'pattern', .6)],
    fins: [part('M2 1Q-6 0-7 6Q-3 11 4 5Z', 'body', .7), part('M12 4a2 1.4 0 1 0 4 0a2 1.4 0 1 0-4 0', 'blush', .45)],
    eye: { x: 15, y: -2, r: 2.6 }, radiusX: 19, radiusY: 11,
  },
};

export function fishInk(ink: FishInk, color: string, accent: string, quiet = false): string {
  if (ink === 'body') return quiet ? '#b7cad7' : color;
  if (ink === 'accent') return quiet ? '#d5e1e9' : accent;
  if (ink === 'cream') return quiet ? '#edf2f5' : '#fff8e9';
  if (ink === 'blush') return quiet ? '#c1d2dd' : '#dda69e';
  return quiet ? '#95adbe' : '#627f91';
}
