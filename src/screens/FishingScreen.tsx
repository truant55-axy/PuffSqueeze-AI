import AppIcon from '../components/AppIcon';
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import HealingAnimal from '../components/HealingAnimal';
import { useCompanion } from '../hooks/useCompanion';
import { COMPANION_CHOICES } from '../services/companionService';
import { getCurrentUserId } from '../services/session';
import { useGameController } from '../services/gameController';
import { FISH_CATALOG, FISH_TRAITS, FISHING_STORAGE_EVENT, readFishCollection, keepFish, type FishSpecies, type FishingDifficulty } from '../games/fishing/catalog';
import { FishingEngine, type FishingSnapshot } from '../games/fishing/engine';
import { FISH_ARTWORK, fishInk } from '../games/fishing/fishArtwork';
import { type AppLanguage, tr } from '../i18n';
import './fishing.css';
import { recordActivity } from '../services/accountSync';

const initialSnapshot: FishingSnapshot = { phase: 'ready', depth: 0, paused: false, hooked: null, lastCatch: null, casts: 0, caught: 0, points: 0, needsRelease: false };
const icon = (name: string) => <AppIcon className="app-icon" aria-hidden="true">{name}</AppIcon>;
const difficulties = [ { id: 'gentle', en: 'Gentle', zh: '轻松' }, { id: 'flow', en: 'In the flow', zh: '自在' }, { id: 'challenge', en: 'A little challenge', zh: '挑战' } ] as const;
type Side = 'left' | 'right';

function FishIcon({ fish, quiet = false }: { fish: FishSpecies; quiet?: boolean }) {
  const art = FISH_ARTWORK[fish.id];
  const id = `fish-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const ink = (value: Parameters<typeof fishInk>[0]) => fishInk(value, fish.color, fish.accent, quiet);
  return <svg viewBox="-49 -31 83 62" aria-hidden="true" className="fishing-fish-icon">
    <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ink('body')} /><stop offset="100%" stopColor={ink('accent')} /></linearGradient><clipPath id={`${id}-clip`}><path d={art.body} /></clipPath></defs>
    {art.back.map((part, index) => <path key={index} d={part.path} fill={ink(part.ink)} opacity={part.opacity} />)}
    <path d={art.tail} transform={`translate(${art.tailX} 0)`} fill={ink('body')} />
    <path d={art.body} fill={`url(#${id}-fill)`} stroke="#65849b30" strokeWidth=".65" />
    <g clipPath={`url(#${id}-clip)`}>{art.marks.map((part, index) => <path key={index} d={part.path} fill={ink(part.ink)} opacity={part.opacity} />)}</g>
    {art.fins.map((part, index) => <path key={index} d={part.path} fill={ink(part.ink)} opacity={part.opacity} />)}
    <circle cx={art.eye.x} cy={art.eye.y} r={art.eye.r} fill="#fffef9" /><circle cx={art.eye.x + art.eye.r * .24} cy={art.eye.y} r={art.eye.r * .51} fill="#45576a" />
    <circle cx={art.eye.x + art.eye.r * .07} cy={art.eye.y - art.eye.r * .22} r={art.eye.r * .16} fill="#fffef9" />
    <path d={`M${art.eye.x + 2} ${art.eye.y + 5}Q${art.eye.x + 3.7} ${art.eye.y + 6} ${art.eye.x + 5} ${art.eye.y + 4.8}`} stroke="#5b778b80" strokeWidth=".7" fill="none" strokeLinecap="round" />
  </svg>;
}

export default function FishingScreen({ onBack, language }: { onBack: () => void; language: AppLanguage }) {
  const t = (en: string, zh: string) => tr(language, en, zh);
  const userId = getCurrentUserId();
  const [companion] = useCompanion();
  const companionChoice = COMPANION_CHOICES.find(choice => choice.kind === companion)!;
  const reduceMotion = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<FishingEngine | null>(null);
  const snapshotRef = useRef(initialSnapshot);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [difficulty, setDifficulty] = useState<FishingDifficulty>('flow');
  const [panel, setPanel] = useState<'journal' | 'settings' | null>(null);
  const panelRef = useRef<HTMLDialogElement>(null);
  const resumeAfterPanel = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [catchNotice, setCatchNotice] = useState<{ fish: FishSpecies; newFind: boolean; milestone: boolean; stamp: number } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [grip, setGrip] = useState({ left: 0, right: 0 });
  const sources = useRef(new Map<string, { side: Side; level: number }>());
  const [saved, setSaved] = useState(() => readFishCollection(userId));
  const [saveError, setSaveError] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [selectedFish, setSelectedFish] = useState<FishSpecies | null>(null);
  const { status: controllerStatus, subscribe } = useGameController();
  const serialLatch = useRef({ left: false, right: false });
  const needsNeutral = useRef(false);
  const alive = useRef(true);
  const sound = useRef<AudioContext | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const onCatch = useRef<(fish: FishSpecies) => void>(() => {});

  const updateGripState = () => {
    let left = 0, right = 0;
    for (const source of sources.current.values()) {
      if (source.side === 'left') left = Math.max(left, source.level); else right = Math.max(right, source.level);
    }
    setGrip(previous => previous.left === left && previous.right === right ? previous : { left, right });
    engine.current?.setPressure(Math.max(left, right));
  };
  const setSource = (id: string, side: Side, level: number) => {
    if (level > 0) sources.current.set(id, { side, level }); else sources.current.delete(id);
    updateGripState();
  };
  const clearInputs = () => {
    sources.current.clear(); serialLatch.current = { left: false, right: false };
    setGrip({ left: 0, right: 0 }); engine.current?.setPressure(0);
  };
  const pause = (value: boolean, keepPanelResume = false) => {
    if (value && !keepPanelResume) resumeAfterPanel.current = false;
    // Pause first: clearing a held input on focus loss must not start a cast.
    if (value) engine.current?.setPaused(true);
    clearInputs(); needsNeutral.current = true;
    if (!value) engine.current?.setPaused(false);
  };
  onCatch.current = fish => {
    if (!alive.current) return;
    let newFind = false;
    try { const collection = keepFish(fish.id, userId); newFind = collection.counts[fish.id] === 1; setSaved({ collection, available: true }); setSaveError(false); }
    catch { setSaveError(true); }
    setSelectedFish(fish);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setCatchNotice({ fish, newFind, milestone: snapshotRef.current.caught > 0 && snapshotRef.current.caught % 5 === 0, stamp: Date.now() });
    noticeTimer.current = setTimeout(() => { if (alive.current) setCatchNotice(null); }, 2800);
    const audio = sound.current;
    if (audio?.state === 'running' && soundOn) {
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const osc = audio.createOscillator(), gain = audio.createGain();
        const start = audio.currentTime + index * .11;
        osc.type = 'sine'; osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.045, start + .025); gain.gain.exponentialRampToValueAtTime(.001, start + .3);
        osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + .32);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      });
    }
  };

  useEffect(() => {
    alive.current = true;
    try {
      engine.current = new FishingEngine(canvas.current!, value => {
        if (value.casts > snapshotRef.current.casts) void recordActivity('fishing_cast', { fish: value.lastCatch?.id ?? null, casts: value.casts, caught: value.caught, points: value.points }, userId);
        snapshotRef.current = value; setSnapshot(value);
      }, fish => onCatch.current(fish), !!reduceMotion);
    } catch { setCanvasError(true); }
    const refresh = () => setSaved(readFishCollection(userId));
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === `puffsqueeze_fishing_collection_v1_${userId}`) refresh(); };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (panelRef.current?.open) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if ((event.target as HTMLElement | null)?.closest('input,textarea,select,[contenteditable="true"]')) return;
      event.preventDefault();
      if (event.type === 'keydown' && (event.repeat || snapshotRef.current.paused)) return;
      const side = event.key === 'ArrowLeft' ? 'left' : 'right';
      setSource(`key:${side}`, side, event.type === 'keydown' ? .8 : 0);
    };
    const hide = () => { if (document.hidden) pause(true); };
    const blur = () => pause(true);
    window.addEventListener('keydown', key); window.addEventListener('keyup', key);
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', hide);
    window.addEventListener(FISHING_STORAGE_EVENT, refresh); window.addEventListener('storage', onStorage);
    return () => {
      alive.current = false; engine.current?.dispose(); engine.current = null;
      void sound.current?.close(); sound.current = null;
      sources.current.clear();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      window.removeEventListener('keydown', key); window.removeEventListener('keyup', key);
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hide);
      window.removeEventListener(FISHING_STORAGE_EVENT, refresh); window.removeEventListener('storage', onStorage);
    };
  }, [userId]);
  useEffect(() => {
    let wasConnected = false;
    needsNeutral.current = true;
    return subscribe({
      onFrame: value => {
        if (!alive.current) return;
        if (needsNeutral.current) {
          if (value.left <= .1 && value.right <= .1) needsNeutral.current = false;
          else return;
        }
        if (snapshotRef.current.paused) return;
        for (const side of ['left', 'right'] as const) {
          const held = serialLatch.current[side] ? value[side] > .1 : value[side] >= .18;
          serialLatch.current[side] = held;
          if (held) sources.current.set(`controller:${side}`, { side, level: value[side] });
          else sources.current.delete(`controller:${side}`);
        }
        updateGripState();
      },
      onStatus: status => {
        if (status === 'live') wasConnected = true;
        else if (wasConnected) pause(true);
      },
    });
  }, [subscribe, userId]);
  useEffect(() => { engine.current?.setDifficulty(difficulty); }, [difficulty]);
  useEffect(() => { engine.current?.setReducedMotion(!!reduceMotion); }, [reduceMotion]);
  useEffect(() => { if (snapshot.phase !== 'ready') setHasPlayed(true); }, [snapshot.phase]);
  useEffect(() => {
    if (panel && panelRef.current && !panelRef.current.open) panelRef.current.showModal();
  }, [panel]);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  const openPanel = (value: 'journal' | 'settings') => {
    resumeAfterPanel.current = !snapshotRef.current.paused;
    pause(true, true); setPanel(value);
  };
  const closePanel = () => {
    setPanel(null);
    const resume = resumeAfterPanel.current;
    resumeAfterPanel.current = false;
    if (resume && !document.hidden && document.hasFocus()) pause(false);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === stageRef.current) await document.exitFullscreen();
      else if (stageRef.current?.requestFullscreen) await stageRef.current.requestFullscreen();
      else throw new Error('fullscreen');
      setFullscreenError(false);
    } catch { setFullscreenError(true); }
  };

  const toggleSound = async () => {
    if (soundOn) { setSoundOn(false); return; }
    try {
      if (!sound.current || sound.current.state === 'closed') sound.current = new AudioContext();
      await sound.current.resume(); if (alive.current) { setSoundOn(true); setSoundError(false); }
    } catch { if (alive.current) setSoundError(true); }
  };
  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>, side: Side) => {
    if (event.button !== 0 || snapshotRef.current.paused) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    setSource(`pointer:${event.pointerId}`, side, 1);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLButtonElement>, side: Side) => {
    setSource(`pointer:${event.pointerId}`, side, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const hooked = snapshot.hooked;
  const lastCatch = snapshot.lastCatch;
  const headline = snapshot.paused ? t('A little pause by the water.', '在水边，歇一小会儿。')
    : hooked ? t(`A ${hooked.en.toLowerCase()} is coming up!`, `${hooked.zh}跟着鱼钩上来啦！`)
    : snapshot.phase === 'lowering' ? snapshot.depth >= 1 ? t('At the bottom. Release to reel in.', '鱼钩到底了，松开即可收钩。') : t('Keep holding to lower the hook.', '继续按住，鱼钩向下。')
    : snapshot.phase === 'reeling' ? t('Coming back through the fish.', '收钩中，看看会遇见哪条鱼。')
    : lastCatch ? t(`You met a ${lastCatch.en.toLowerCase()}.`, `遇见了${lastCatch.zh}。`)
    : snapshot.casts ? t('A quiet cast. There is always another.', '这一竿很安静，下次再遇见。') : t('A small cove, a little time together.', '一小片水湾，和你一起慢慢待着。');
  const instruction = snapshot.needsRelease ? t('Release both sides before the next cast.', '先松开两侧，再开始下一竿。')
    : snapshot.phase === 'lowering' ? t('Release both sides whenever you want to reel in.', '想收钩时，松开所有握住的按键。')
    : snapshot.phase === 'reeling' ? t('One fish per cast. Let the hook return first.', '每竿带回一条小鱼，等鱼钩回来再下钩。')
    : t('Hold either side to lower · Release both to reel', '握住任一侧下钩 · 全部松开收钩');
  const statusLabel = controllerStatus === 'live' ? t('Controller connected', '手柄已连接')
    : controllerStatus === 'off' ? t('Connect on the games page', '请在游戏列表连接手柄')
    : t('Release both sides or check the connection', '请松开两侧或检查连接');
  const discovered = FISH_CATALOG.filter(fish => (saved.collection.counts[fish.id] ?? 0) > 0).length;

  const goal = Math.max(5, Math.ceil(snapshot.caught / 5) * 5);
  const phaseLabel = hooked ? t('HOOKED!', '上钩啦！') : snapshot.phase === 'lowering' ? t('LOWERING', '下钩中') : snapshot.phase === 'reeling' ? t('REELING IN', '收钩中') : t('READY TO CAST', '准备下钩');

  return <div className="fishing-screen" ref={stageRef}>
    <header className="fishing-header">
      <button type="button" className="fishing-back" onClick={onBack} aria-label={t('Back to games', '返回游戏')}>{icon('arrow_back')}</button>
      <h1>{t('Quiet Cove', '慢慢钓鱼')}<span>{t('A little fishing escape', '水边的一小段时光')}</span></h1>
    </header>
    <main className="fishing-main">
      <section className="fishing-arena" aria-label={t('Fishing game', '钓鱼游戏')}>
        <canvas ref={canvas} role="img" aria-label={t('A blue cove with six swimming fish. Hold either grip to lower, release both to reel.', '水湾里约有六条小鱼。握住任一侧下钩，全部松开收钩。')}>{t('Your browser needs Canvas support to play.', '浏览器需要支持 Canvas 才能运行游戏。')}</canvas>
        <div className="fishing-companion" aria-hidden="true"><HealingAnimal kind={companion} isJiggling={!!hooked} /></div>

        <div className="fishing-hud" aria-label={t('This fishing session', '本次钓鱼收获')}>
          <div className="fishing-score">{icon('water')}<strong>{snapshot.caught}</strong><span>{t('fish', '条小鱼')}</span></div>
          <div className="fishing-score fishing-score-points">{icon('stars')}<strong>{snapshot.points}</strong><span>{t('points', '点数')}</span></div>
          <div className="fishing-session-goal" aria-label={t('Session milestone: ' + snapshot.caught + ' of ' + goal + ' fish', '本次收获进度：' + snapshot.caught + '/' + goal + ' 条')}>
            <span>{snapshot.caught}/{goal}</span><div><i style={{ width: Math.min(100, snapshot.caught / goal * 100) + '%' }} /></div>
          </div>
        </div>
        <nav className="fishing-game-tools" aria-label={t('Game menu', '游戏菜单')}>
          <button type="button" className="fishing-journal-tool" onClick={() => openPanel('journal')} aria-label={t('Open fish journal', '打开小鱼图鉴')}>{icon('menu_book')}<span>{discovered}/{FISH_CATALOG.length}</span></button>
          <button type="button" onClick={() => void toggleSound()} aria-pressed={soundOn} aria-label={soundOn ? t('Mute catch sounds', '关闭收获音效') : t('Enable catch sounds', '开启收获音效')}>{icon(soundOn ? 'volume_up' : 'volume_off')}</button>
          <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? t('Exit fullscreen', '退出全屏') : t('Play fullscreen', '全屏游玩')}>{icon(fullscreen ? 'fullscreen_exit' : 'fullscreen')}</button>
          <button type="button" className={controllerStatus === 'live' ? 'is-connected' : ''} onClick={() => openPanel('settings')} aria-label={t('Game settings and grips', '游戏设置与手柄')}>{icon('tune')}</button>
          <button type="button" onClick={() => pause(!snapshot.paused)} aria-label={snapshot.paused ? t('Resume fishing', '继续钓鱼') : t('Pause fishing', '暂停钓鱼')}>{icon(snapshot.paused ? 'play_arrow' : 'pause')}</button>
        </nav>

        {!hasPlayed && !snapshot.paused && <div className="fishing-opening"><span>{t('QUIET COVE', '慢慢钓鱼')}</span><h2>{t('Let the water carry a little of today.', '把一点时光，交给水面。')}</h2><p>{t('Hold either side to begin.', '握住任一侧，开始这一竿。')}</p></div>}
        <div className="fishing-companion-caption">{t('With ' + companionChoice.en, '和' + companionChoice.zh + '一起')}</div>
        <div className={'fishing-hook-state' + (hooked ? ' is-hooked' : '')} aria-hidden="true">{hooked ? icon('phishing') : icon(snapshot.phase === 'lowering' ? 'south' : snapshot.phase === 'reeling' ? 'north' : 'more_horiz')}<span>{phaseLabel}</span></div>
        <div className="fishing-depth" aria-label={t('Hook depth', '鱼钩深度')}><span>{t('DEPTH', '深度')}</span><div><i style={{ height: Math.round(snapshot.depth * 100) + '%' }} /></div><small>{Math.round(snapshot.depth * 100)}%</small></div>

        {catchNotice && !snapshot.paused && <div className={'fishing-catch-toast' + (catchNotice.newFind ? ' is-new' : '')} key={catchNotice.stamp} role="status">
          <FishIcon fish={catchNotice.fish} /><div><span>{catchNotice.milestone ? t('FIVE MORE LITTLE MOMENTS', '又收获了五个小小瞬间') : catchNotice.newFind ? t('NEW DISCOVERY', '图鉴新发现') : t('NICE CATCH', '收获一条小鱼')}</span><strong>{t(catchNotice.fish.en, catchNotice.fish.zh)}</strong></div><b>+{catchNotice.fish.points}</b>
        </div>}

        <div className={'fishing-in-game-hint' + (snapshot.phase !== 'ready' ? ' is-active' : '')}>
          <strong role="status">{headline}</strong><span>{instruction}</span>
        </div>
        <div className="fishing-controls" aria-label={t('Hold and release controls', '握住与松开操作')}>
          {(['left', 'right'] as const).map(side => <button key={side} type="button" className={'fishing-grip ' + (grip[side] > 0 ? 'is-held' : '')} aria-pressed={grip[side] > 0} disabled={snapshot.paused || canvasError} onPointerDown={event => pointerDown(event, side)} onPointerUp={event => pointerUp(event, side)} onPointerCancel={event => pointerUp(event, side)} onLostPointerCapture={event => setSource('pointer:' + event.pointerId, side, 0)} onContextMenu={event => event.preventDefault()} onKeyDown={event => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); setSource('button:' + side, side, .8); }
          }} onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setSource('button:' + side, side, 0); } }} onBlur={() => setSource('button:' + side, side, 0)}>
            <span className="fishing-grip-ring" style={{ '--grip-level': grip[side] } as CSSProperties}><span>{side === 'left' ? '←' : '→'}</span></span><strong>{grip[side] > 0 ? t('Holding', '握住中') : t('Hold', '握住')}</strong>
          </button>)}
        </div>
        {(!saved.available || saveError) && <button type="button" className="fishing-save-alert" onClick={() => openPanel('journal')}>{icon('info')}{t('Journal saving is unavailable', '图鉴暂时无法保存')}</button>}
        {fullscreenError && <p className="fishing-window-note" role="status">{t('Fullscreen is unavailable. You can keep playing here.', '全屏暂不可用，可以继续在窗口里玩。')}</p>}

        {snapshot.paused && <div className="fishing-pause"><span>{icon('pause_circle')}</span><h3>{t('The cove can wait.', '水湾会等你。')}</h3><p>{t('Release your grips, then continue when you are ready.', '松开手柄，准备好后再继续。')}</p><button type="button" onClick={() => pause(false)}>{icon('play_arrow')}{t('Continue fishing', '继续钓鱼')}</button><div className="fishing-pause-links"><button type="button" onClick={() => openPanel('journal')}>{t('Fish journal', '小鱼图鉴')}</button><button type="button" onClick={() => openPanel('settings')}>{t('Settings', '设置')}</button></div></div>}
        {canvasError && <div className="fishing-pause"><h3>{t('Canvas is unavailable.', '暂时无法打开游戏画布。')}</h3><p>{t('Try reopening this page in a browser with Canvas support.', '请使用支持 Canvas 的浏览器重新打开页面。')}</p></div>}
      </section>
    </main>

    <dialog ref={panelRef} className="fishing-dialog" aria-labelledby="fishing-panel-title" onClose={closePanel}>
      <div className="fishing-dialog-heading"><div><span>{panel === 'journal' ? t('LITTLE FINDS', '水边的小小发现') : t('MAKE YOURSELF AT HOME', '按自己的节奏来')}</span><h2 id="fishing-panel-title">{panel === 'journal' ? t('Your fish journal', '我的小鱼图鉴') : t('Game settings', '游戏设置')}</h2></div><button type="button" onClick={() => panelRef.current?.close()} aria-label={t('Close panel', '关闭面板')}>{icon('close')}</button></div>
      {panel === 'journal' ? <section className="fishing-collection">
        <div className="fishing-journal-count"><span>{t('Discoveries', '已发现')} <b>{discovered}/{FISH_CATALOG.length}</b></span><span>{t('All-time catches', '累计收获')} <b>{saved.collection.total}</b></span></div>
        <div className="fishing-fish-grid">{FISH_CATALOG.map(fish => {
          const count = saved.collection.counts[fish.id] ?? 0;
          return <button type="button" key={fish.id} className={count ? 'is-discovered' : ''} aria-pressed={selectedFish?.id === fish.id} onClick={() => setSelectedFish(fish)} aria-label={t(fish.en + ', ' + count + ' collected', fish.zh + '，已收集 ' + count + ' 条')}><FishIcon fish={fish} quiet={!count} /><strong>{count ? t(fish.en, fish.zh) : t('Not met yet', '还没遇见')}</strong><span>{count ? '× ' + count : t(['Shallows', 'Midwater', 'Deep water'][fish.depth], ['浅水', '中层', '深水'][fish.depth])}</span></button>;
        })}</div>
        {selectedFish && <div className="fishing-fish-detail"><FishIcon fish={selectedFish} /><div><strong>{t(selectedFish.en, selectedFish.zh)}</strong><p>{t(FISH_TRAITS[selectedFish.id].en, FISH_TRAITS[selectedFish.id].zh)}</p></div></div>}
        <p className="fishing-local-note">{icon('lock')}{t('Account journal · Syncs when connected', '账号图鉴 · 联网后同步')}</p>
        {(!saved.available || saveError) && <p className="fishing-warning" role="status">{t('Your journal could not be saved. Session catches still count here; existing browser data has not been overwritten.', '图鉴暂时无法保存。本次收获仍会在页面计数，已有浏览器数据未被覆盖。')}</p>}
      </section> : <div className="fishing-settings">
        <section><h3>{t('Difficulty', '难度')}</h3><div className="fishing-difficulty" role="group" aria-label={t('Difficulty', '难度')}>{difficulties.map(item => <button type="button" key={item.id} disabled={snapshot.phase !== 'ready'} aria-pressed={difficulty === item.id} onClick={() => setDifficulty(item.id)}>{t(item.en, item.zh)}</button>)}</div><p>{t('Change difficulty between casts. Fish move faster at higher levels.', '两竿之间可以切换难度，难度越高，小鱼游得越快。')}</p></section>
        <section><h3>{t('How to play', '怎么玩')}</h3><p>{t('Hold GPIO12 / GPIO13, ← / →, or a screen button to lower the hook. Release both sides to reel in and catch a fish. At full depth, the hook waits until you let go.', '长按 GPIO12／GPIO13、←／→ 或屏幕按钮下钩；全部松开后收钩，回收途中可带回一条小鱼。到底后保持，松开后收回。')}</p><div className="fishing-trip-stats"><span>{t('Casts', '本次抛竿')} <b>{snapshot.casts}</b></span><span>{t('Points', '本次点数')} <b>{snapshot.points}</b></span></div></section>
        <section className="fishing-hardware"><div className="fishing-setting-label"><h3>{t('Game controller', '游戏手柄')}</h3><span className={controllerStatus === 'live' ? 'is-live' : ''}>{statusLabel}</span></div><p>{t('Connect once on the games page. Hold GPIO12 or GPIO13 to lower the hook; release both to reel. Switching games keeps the connection.', '在游戏列表连接一次即可。长按 GPIO12 或 GPIO13 下钩，全部松开收钩；切换游戏时保持连接。')}</p>
          {controllerStatus !== 'live' && <button type="button" onClick={onBack}>{t('Back to controller connection', '返回游戏列表连接')}</button>}
        </section>
        <section className="fishing-sound-setting"><h3>{t('Catch sounds', '收获音效')}</h3><button type="button" aria-pressed={soundOn} onClick={() => void toggleSound()}>{icon(soundOn ? 'volume_up' : 'volume_off')}{soundOn ? t('On', '已开启') : t('Off', '已关闭')}</button></section>
        {soundError && <p className="fishing-warning" role="status">{t('Sound is unavailable; you can keep playing quietly.', '音效暂时不可用，可以继续安静地玩。')}</p>}
        <details className="fishing-credits"><summary>{t('Open-source credits', '开源致谢')}</summary><p>{t('Adapted from Fishing Game by jm-wltr, with a new fishing loop and PuffSqueeze artwork.', '基于 jm-wltr 的 Fishing Game 改编，重新设计钓鱼流程并使用 PuffSqueeze 动物形象。')} <a href="https://github.com/jm-wltr/fishing-game" target="_blank" rel="noreferrer">GitHub</a> · <a href="/games/fishing/LICENSE" target="_blank" rel="noreferrer">Apache-2.0</a> · <a href="/games/fishing/NOTICE.md" target="_blank" rel="noreferrer">{t('Changes', '修改说明')}</a></p></details>
      </div>}
    </dialog>
  </div>;
}
