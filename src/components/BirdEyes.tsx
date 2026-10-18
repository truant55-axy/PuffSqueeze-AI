import { motion } from 'motion/react';
import type { CompanionEye } from './companionVisuals';
import type { CompanionMood } from '../services/companionMoodService';

export function BirdEyes({ eyes, mood, closed, idPrefix, color = '#2c3644' }: {
  eyes: readonly CompanionEye[];
  mood: CompanionMood;
  closed: boolean;
  idPrefix: string;
  color?: string;
}) {
  const shut = closed || mood === 'sleepy';
  return <g fill={color} stroke={color} strokeLinecap="round">
    {eyes.map((eye, index) => {
      const { x, y, rx, ry } = eye;
      const lidId = `${idPrefix}-lid-${index}`;
      return <g key={index} transform={`rotate(${eye.rotation ?? 0} ${x} ${y})`}>
        <defs><clipPath id={lidId}><rect x={x - rx - 2} y={y - ry * 0.05} width={rx * 2 + 4} height={ry * 1.1} /></clipPath></defs>
        <motion.g initial={false} animate={{ scaleY: shut ? 0 : 1, opacity: shut ? 0 : 1 }} transition={{ duration: 0.1 }} style={{ transformOrigin: `${x}px ${y}px` }}>
          {mood === 'happy'
            ? <path d={`M ${x - rx * 1.3} ${y + ry * 0.25} Q ${x} ${y - ry * 1.6} ${x + rx * 1.3} ${y + ry * 0.25}`} fill="none" strokeWidth={Math.max(3, rx * 0.34)} />
            : <g clipPath={mood === 'tired' ? `url(#${lidId})` : undefined}>
              <ellipse cx={x} cy={y} rx={rx} ry={ry} stroke="none" />
              <ellipse cx={x - rx * 0.23} cy={y - ry * 0.3} rx={rx * 0.2} ry={ry * 0.16} fill="#fffaf2" stroke="none" opacity="0.8" />
            </g>}
          {mood === 'tired' && <path d={`M ${x - rx * 1.1} ${y} L ${x + rx * 1.1} ${y}`} strokeWidth={Math.max(2, rx * 0.23)} />}
        </motion.g>
        <motion.path
          d={`M ${x - rx * 1.2} ${y} Q ${x} ${y + ry * 0.55} ${x + rx * 1.2} ${y}`}
          fill="none" strokeWidth={Math.max(3, rx * 0.3)}
          initial={false} animate={{ opacity: shut ? 1 : 0, scaleY: shut ? 1 : 0 }}
          transition={{ duration: 0.1 }} style={{ transformOrigin: `${x}px ${y}px` }}
        />
      </g>;
    })}
  </g>;
}

