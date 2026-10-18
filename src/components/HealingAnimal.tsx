import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getGrowthVisual } from './growthVisuals';
import { getSleepyVisual } from './sleepyVisuals';
import { useCompanionMood } from '../hooks/useCompanionMood';
import { BirdEyes } from './BirdEyes';
import type { CompanionMood } from '../services/companionMoodService';
import type { CompanionKind } from '../services/companionService';
import { readGrowthStage, subscribeCareGrowth } from '../services/careVisualStore';

export type { CompanionKind } from '../services/companionService';

interface HealingAnimalProps {
  kind: CompanionKind;
  isJiggling?: boolean;
  growthStage?: 0 | 1 | 2;
  mood?: CompanionMood;
}

function useBlink(kind: CompanionKind) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    setClosed(false);
    function scheduleBlink() {
      timer = setTimeout(() => {
        if (!active) return;
        setClosed(true);
        timer = setTimeout(() => {
          if (!active) return;
          setClosed(false);
          scheduleBlink();
        }, 150);
      }, 2800 + Math.random() * 3400);
    }
    scheduleBlink();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [kind]);
  return closed;
}

export default function HealingAnimal({ kind, isJiggling = false, growthStage, mood: moodOverride }: HealingAnimalProps) {
  const savedStage = useSyncExternalStore(subscribeCareGrowth, () => readGrowthStage(kind), () => 0 as const);
  const stage = growthStage ?? savedStage;
  const normalVisual = getGrowthVisual(kind, stage);
  const [savedMood] = useCompanionMood(kind);
  const mood = moodOverride ?? savedMood;
  const isSleepy = mood === 'sleepy';
  const isHappy = mood === 'happy';
  const companion = isSleepy ? getSleepyVisual(kind, stage, normalVisual) : normalVisual;
  const clipId = `companion-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const cropScale = companion.crop ? 1000 / Math.max(companion.crop.width, companion.crop.height) : 1;
  const blinking = useBlink(kind);
  const reduceMotion = useReducedMotion();
  const eyesClosed = blinking || isJiggling || isSleepy;
  const rasterEyesClosed = eyesClosed;

  return (
    <div className="relative z-10 flex h-full w-full items-center justify-center" role="img" aria-label={`A ${mood} ${kind} companion`} data-companion={kind} data-growth-stage={stage} data-eyes={isSleepy ? 'drooping' : (kind === 'bird' ? eyesClosed : rasterEyesClosed) ? 'closed' : 'open'} data-mood={mood}>
      <div className="pointer-events-none absolute bottom-[8%] h-3 w-[52%] rounded-full bg-[#91acc2]/15 blur-[2px]" />
      <motion.svg
        viewBox="0 0 1000 1000"
        className="relative h-full w-full select-none overflow-visible drop-shadow-[0_20px_25px_rgba(53,72,91,0.14)]"
        aria-hidden="true"
        animate={reduceMotion ? { scale: 1, y: 0, rotate: 0 } : {
          scale: isJiggling ? [1, 0.97, 1.015, 1] : [1, 0.995, 1],
          y: isJiggling ? [0, 3, -1, 0] : [0, isSleepy ? 0.8 : stage === 2 ? 1.5 : 2, 0],
          rotate: isJiggling ? [0, -1.5, 1.5, 0] : isSleepy ? [-3, -3.5, -3] : [0, isHappy ? 0.9 : 0.3, 0],
        }}
        transition={{ duration: isJiggling ? 0.6 : stage === 2 ? 5.2 : 4.6, repeat: isJiggling || reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
      >
        {companion.crop ? (
          <svg x={(1000 - companion.crop.width * cropScale) / 2} y={(1000 - companion.crop.height * cropScale) / 2} width={companion.crop.width * cropScale} height={companion.crop.height * cropScale} viewBox={`${companion.crop.x} ${companion.crop.y} ${companion.crop.width} ${companion.crop.height}`} overflow="hidden">
            {companion.crop.clipPoints && <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><polygon points={companion.crop.clipPoints} /></clipPath></defs>}
            <image href={companion.src} width={companion.crop.atlasWidth} height={companion.crop.atlasHeight} pointerEvents="none" clipPath={companion.crop.clipPoints ? `url(#${clipId})` : undefined} />
          </svg>
        ) : <image href={companion.src} width="1000" height="1000" pointerEvents="none" />}
        {kind === 'bird' || companion.liveEyes ? <BirdEyes eyes={companion.eyes} mood={mood} closed={eyesClosed} idPrefix={clipId} color={companion.eyeColor} /> : companion.eyes.map((eye, index) => (
          <g key={index} transform={`rotate(${eye.rotation ?? 0} ${eye.x} ${eye.y})`}>
          <motion.g
            initial={false}
            animate={{ scaleY: rasterEyesClosed ? 0 : mood === 'tired' ? 0.48 : 1, opacity: rasterEyesClosed ? 0 : 1 }}
            transition={{ duration: 0.085, ease: 'easeInOut' }}
            style={{ transformOrigin: `${eye.x}px ${eye.y}px` }}
          >
            <path d={`M ${eye.x - eye.rx} ${eye.y} C ${eye.x - eye.rx} ${eye.y - eye.ry * 1.34} ${eye.x + eye.rx} ${eye.y - eye.ry * 1.34} ${eye.x + eye.rx} ${eye.y} C ${eye.x + eye.rx} ${eye.y + eye.ry * (isHappy ? 0.55 : 0.95)} ${eye.x - eye.rx} ${eye.y + eye.ry * (isHappy ? 0.55 : 0.95)} ${eye.x - eye.rx} ${eye.y} Z`} fill={companion.eyeColor ?? '#58433e'} />
            <ellipse cx={eye.x - eye.rx * 0.28} cy={eye.y - eye.ry * 0.35} rx={eye.rx * (isHappy ? 0.25 : 0.21)} ry={eye.ry * 0.2} fill="#fffaf1" opacity="0.95" />
            <circle cx={eye.x + eye.rx * 0.32} cy={eye.y + eye.ry * 0.28} r={eye.rx * (isHappy ? 0.12 : 0.09)} fill="#fffaf1" opacity="0.65" />
          </motion.g>
          </g>
        ))}
      </motion.svg>
    </div>
  );
}
