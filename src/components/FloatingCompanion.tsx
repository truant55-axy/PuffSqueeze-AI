import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import HealingAnimal from './HealingAnimal';
import { useCompanion } from '../hooks/useCompanion';
import { getCurrentUserId } from '../services/session';
import { COMPANION_CHOICES } from '../services/companionService';
import { type AppLanguage, tr } from '../i18n';

interface Position { x: number; y: number }
interface Layout { width: number; height: number; size: number; bottomSpace: number }
interface DragSession { pointerId: number; startX: number; startY: number; origin: Position; moved: boolean }
const MARGIN = 12;

function viewportLayout(bottomSpace: number): Layout {
  const width = document.documentElement.clientWidth;
  return { width, height: window.innerHeight, size: width < 640 ? 112 : 136, bottomSpace };
}

function bounds(layout: Layout) {
  return {
    maxX: Math.max(MARGIN, layout.width - layout.size - MARGIN),
    maxY: Math.max(MARGIN, layout.height - layout.size - layout.bottomSpace),
  };
}

function clampPosition(position: Position, layout: Layout): Position {
  const { maxX, maxY } = bounds(layout);
  return { x: Math.max(MARGIN, Math.min(maxX, position.x)), y: Math.max(MARGIN, Math.min(maxY, position.y)) };
}

function readPosition(storageKey: string, layout: Layout): Position {
  const { maxX, maxY } = bounds(layout);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (saved && typeof saved.xRatio === 'number' && typeof saved.yRatio === 'number'
      && Number.isFinite(saved.xRatio) && Number.isFinite(saved.yRatio)) {
      return clampPosition({ x: MARGIN + saved.xRatio * (maxX - MARGIN), y: MARGIN + saved.yRatio * (maxY - MARGIN) }, layout);
    }
  } catch { /* A damaged preference falls back to the visible bottom-right corner. */ }
  return { x: maxX, y: maxY };
}

export default function FloatingCompanion({ language, bottomSpace }: { language: AppLanguage; bottomSpace: number }) {
  const [companion] = useCompanion();
  const storageKey = `puffsqueeze_companion_position_${getCurrentUserId()}`;
  const [layout, setLayout] = useState(() => viewportLayout(bottomSpace));
  const [position, setPosition] = useState(() => readPosition(storageKey, layout));
  const positionRef = useRef(position);
  const layoutRef = useRef(layout);
  const dragRef = useRef<DragSession | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reacting, setReacting] = useState(false);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function moveTo(next: Position) {
    const clamped = clampPosition(next, layoutRef.current);
    positionRef.current = clamped;
    setPosition(clamped);
    return clamped;
  }

  function savePosition(next: Position) {
    const { maxX, maxY } = bounds(layoutRef.current);
    localStorage.setItem(storageKey, JSON.stringify({
      xRatio: maxX > MARGIN ? (next.x - MARGIN) / (maxX - MARGIN) : 0,
      yRatio: maxY > MARGIN ? (next.y - MARGIN) / (maxY - MARGIN) : 0,
    }));
  }

  useEffect(() => {
    function updateLayout() {
      const nextLayout = viewportLayout(bottomSpace);
      layoutRef.current = nextLayout;
      setLayout(nextLayout);
      moveTo(readPosition(storageKey, nextLayout));
    }
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [bottomSpace, storageKey]);

  useEffect(() => () => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
  }, []);

  function greet() {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReacting(true);
    reactionTimer.current = setTimeout(() => setReacting(false), 450);
  }

  function resetPosition() {
    const { maxX, maxY } = bounds(layoutRef.current);
    savePosition(moveTo({ x: maxX, y: maxY }));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: positionRef.current, moved: false };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (!session.moved && Math.hypot(dx, dy) < 6) return;
    session.moved = true;
    setDragging(true);
    moveTo({ x: session.origin.x + dx, y: session.origin.y + dy });
  }

  function endDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (session.moved) savePosition(positionRef.current);
    else if (!cancelled) greet();
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 30 : 12;
    const offsets: Record<string, Position> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    };
    if (offsets[event.key]) {
      event.preventDefault();
      const offset = offsets[event.key];
      savePosition(moveTo({ x: positionRef.current.x + offset.x, y: positionRef.current.y + offset.y }));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      greet();
    } else if (event.key === 'Home') {
      event.preventDefault();
      resetPosition();
    }
  }

  const choice = COMPANION_CHOICES.find((item) => item.kind === companion)!;
  const name = tr(language, choice.en, choice.zh);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={tr(language, `${name}. Drag to move; use arrow keys, or Home to reset.`, `${name}。可拖拽移动，也可用方向键移动、Home 键归位。`)}
      title={tr(language, 'Drag me to move · Double-click to return to the corner', '按住拖动 · 双击回到角落')}
      data-floating-companion={companion}
      className="fixed z-[60] select-none rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      style={{ left: position.x, top: position.y, width: layout.size, height: layout.size, touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={(event) => endDrag(event)}
      onPointerCancel={(event) => endDrag(event, true)}
      onLostPointerCapture={(event) => endDrag(event, true)}
      onDoubleClick={resetPosition}
      onKeyDown={handleKeys}
    >
      <div className="pointer-events-none h-full w-full">
        <HealingAnimal kind={companion} isJiggling={reacting} />
      </div>
    </div>
  );
}
