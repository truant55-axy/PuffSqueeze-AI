import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { tr, type AppLanguage } from '../i18n';

const steps = [{ en: 'Inhale', zh: '吸气', seconds: 4, scale: 1.18 }, { en: 'Hold', zh: '停留', seconds: 2, scale: 1.18 }, { en: 'Exhale', zh: '呼气', seconds: 6, scale: .9 }, { en: 'Hold', zh: '停留', seconds: 2, scale: .9 }];
export default function CareBreathing({ language, onClose, onComplete }: { language: AppLanguage; onClose: () => void; onComplete: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hint, setHint] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const complete = useRef(onComplete); complete.current = onComplete;
  useEffect(() => {
    done.current = false;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; panel.current?.focus();
    const music = new Audio('/audio/pianowhitesound.mp3?v=3'); music.loop = true; music.volume = .5; audio.current = music;
    music.onplaying = () => setPlaying(true); music.onpause = () => setPlaying(false);
    music.onerror = () => setHint('error');
    void music.play().catch(() => setHint('tap'));
    const start = performance.now();
    const timer = window.setInterval(() => {
      const seconds = Math.min(42, Math.floor((performance.now() - start) / 1000)); setElapsed(seconds);
      if (seconds >= 42 && !done.current) { done.current = true; complete.current(); }
    }, 250);
    return () => { clearInterval(timer); music.onplaying = null; music.onpause = null; music.onerror = null; music.pause(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  const cycleElapsed = Math.min(elapsed, 41) % 14;
  let cursor = 0;
  const step = steps.find(s => { cursor += s.seconds; return cycleElapsed < cursor; }) || steps[3];
  const remain = cursor - cycleElapsed;
  return <div className="fixed inset-0 z-[140] bg-[#eaf4fa]/95 backdrop-blur-xl flex items-center justify-center p-6">
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="care-breath-title" className="text-center outline-none w-full max-w-md" onKeyDown={e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') { const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button'); if (!buttons?.length) return; const first = buttons[0], last = buttons[buttons.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}>
      <p className="text-xs uppercase tracking-[.2em] text-primary mb-3">{tr(language, 'A moment for both of you', '一起慢下来')}</p>
      <h2 id="care-breath-title" className="text-3xl font-bold">{tr(language, 'Deep Breathing', '深呼吸')}</h2>
      <p className="text-sm text-on-surface-variant mt-3 mb-14">{tr(language, 'Three gentle cycles · growth +15 XP', '完成三轮轻柔呼吸 · 成长 +15 XP')}</p>
      <motion.div animate={{ scale: step.scale }} transition={{ duration: step.seconds, ease: 'easeInOut' }} className="w-52 h-52 mx-auto rounded-full border border-primary/30 bg-white/60 shadow-[0_0_0_18px_rgba(109,155,194,.08),0_0_0_38px_rgba(109,155,194,.04)] flex flex-col items-center justify-center">
        <p className="text-3xl font-serif text-primary">{language === 'zh' ? step.zh : step.en}</p><p className="text-xl mt-2">{remain}s</p>
      </motion.div>
      <p className="text-sm text-on-surface-variant mt-14 mb-5">{tr(language, 'Cycle', '第')} {Math.min(3, Math.floor(elapsed / 14) + 1)} / 3</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button className="care-button" onClick={() => { const a = audio.current; if (!a) return; if (playing) a.pause(); else void a.play().catch(() => setHint('tap')); }}>{playing ? tr(language, 'Pause Music', '暂停音乐') : tr(language, 'Play Music', '播放音乐')}</button>
        <button className="care-button" onClick={() => { if (audio.current) { audio.current.muted = !muted; setMuted(!muted); } }}>{muted ? tr(language, 'Unmute', '取消静音') : tr(language, 'Mute', '静音')}</button>
        <button className="care-button" onClick={onClose}>{tr(language, 'Exit', '退出')}</button>
      </div>
      {hint && <p className="text-xs mt-4 text-on-surface-variant">{hint === 'error' ? tr(language, 'Music could not load; the breathing guide still works.', '音乐暂时无法加载，呼吸引导可继续使用。') : tr(language, 'Tap Play Music to start the audio.', '点击播放音乐开始播放。')}</p>}
    </div>
  </div>;
}
