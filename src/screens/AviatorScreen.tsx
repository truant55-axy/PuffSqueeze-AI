import AppIcon from '../components/AppIcon';
import { useEffect, useRef } from 'react';
import { AppLanguage, tr } from '../i18n';
import { recordActivity } from '../services/accountSync';

export default function AviatorScreen({ onBack, language }: { onBack: () => void; language: AppLanguage }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const initialLanguage = useRef(language);

  useEffect(() => {
    const result = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'puffsqueeze:aviator-result') return;
      const { distance, collected, level } = event.data;
      if ([distance, collected, level].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e9)) void recordActivity('aviator_run', { distance, collected, level });
    };
    window.addEventListener('message', result);
    const forward = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      frame.current?.contentWindow?.postMessage({
        type: 'puffsqueeze:aviator-input', key: event.key,
        down: event.type === 'keydown', repeat: event.repeat,
      }, window.location.origin);
    };
    const suspend = () => {
      // Focusing the embedded game is still part of this page, not leaving it.
      if (!document.hidden && document.hasFocus()) return;
      frame.current?.contentWindow?.postMessage({ type: 'puffsqueeze:aviator-suspend' }, window.location.origin);
    };
    window.addEventListener('keydown', forward);
    window.addEventListener('keyup', forward);
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', suspend);
    return () => {
      window.removeEventListener('message', result);
      window.removeEventListener('keydown', forward);
      window.removeEventListener('keyup', forward);
      window.removeEventListener('blur', suspend);
      document.removeEventListener('visibilitychange', suspend);
    };
  }, []);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'puffsqueeze:aviator-language', language }, window.location.origin);
  }, [language]);

  return (
    <div className="h-dvh min-h-0 w-full flex flex-col relative z-20 bg-[#eaf5fc]">
      <header className="h-16 shrink-0 flex items-center gap-3 px-4 sm:px-6 bg-[#f7fbff]/95 border-b border-[#d8e5f0] pr-32">
        <button type="button" onClick={onBack} aria-label={tr(language, 'Back to games', '返回游戏')}
          className="w-9 h-9 shrink-0 rounded-full bg-white text-primary border border-primary/10 flex items-center justify-center hover:bg-primary/5">
          <AppIcon className="app-icon text-lg" aria-hidden="true">arrow_back</AppIcon>
        </button>
        <div className="min-w-0">
          <h1 className="font-semibold text-primary text-sm sm:text-base truncate">The Aviator · {tr(language, 'Sea flight', '海上飞行')}</h1>
          <p className="text-[11px] text-on-surface-variant">{tr(language, 'Solo · ← Rise · → Descend', '单人 · ← 上升 · → 下降')}</p>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <iframe ref={frame} title={tr(language, 'The Aviator sea flight game', 'The Aviator 海上飞行游戏')}
          src={`/games/aviator/index.html?lang=${initialLanguage.current}`}
          onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'puffsqueeze:aviator-language', language }, window.location.origin)}
          className="w-full h-full block border-0" allow="fullscreen" />
      </main>
    </div>
  );
}
