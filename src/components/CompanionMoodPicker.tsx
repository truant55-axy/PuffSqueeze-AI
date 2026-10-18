import { useId } from 'react';
import { useCompanionMood } from '../hooks/useCompanionMood';
import { COMPANION_MOODS, type CompanionMood } from '../services/companionMoodService';
import { tr, type AppLanguage } from '../i18n';
import { COMPANION_CHOICES, type CompanionKind } from '../services/companionService';

function MoodIcon({ mood }: { mood: CompanionMood }) {
  return <svg viewBox="0 0 32 24" className="h-5 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    {mood === 'calm' ? <><ellipse cx="10" cy="11" rx="1.5" ry="2" fill="currentColor" stroke="none" /><ellipse cx="22" cy="11" rx="1.5" ry="2" fill="currentColor" stroke="none" /></>
      : mood === 'happy' ? <><path d="M6 12Q10 5 14 12M18 12Q22 5 26 12" /></>
      : mood === 'tired' ? <><path d="M7 10h6m6 0h6M9 12v1m12-1v1" /></>
      : <path d="M6 11Q10 14 14 9M18 9Q22 14 26 11" />}
    {mood === 'sleepy' ? <ellipse cx="16" cy="18" rx="1.9" ry="2.7" stroke="#8d6c66" /> : <path d="m14 16 2 2 2-2" stroke="#c9a349" />}
  </svg>;
}

export default function CompanionMoodPicker({ language, kind }: { language: AppLanguage; kind: CompanionKind }) {
  const [mood, setMood] = useCompanionMood(kind);
  const labelId = useId();
  const companion = COMPANION_CHOICES.find(choice => choice.kind === kind)!;
  const selected = COMPANION_MOODS.find(choice => choice.value === mood)!;
  return <div className="w-full rounded-2xl border border-[#dce7f0] bg-white/65 p-3 sm:p-4">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1.5">
      <span id={labelId} className="text-xs font-semibold text-on-surface">{tr(language, companion.en + ' · expression', companion.zh + ' · 心情')}</span>
      <span className="text-[10px] text-on-surface-variant">{tr(language, 'Choose an expression', '自己决定此刻的表情')}</span>
    </div>
    <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby={labelId}>
      {COMPANION_MOODS.map(choice => <button key={choice.value} type="button" aria-pressed={mood === choice.value} onClick={() => setMood(choice.value)}
        className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${mood === choice.value ? 'border-[#8baec9] bg-[#e8f2fa] text-[#476c89]' : 'border-[#e2eaf1] bg-white/80 text-on-surface-variant hover:bg-[#f2f7fc]'}`}>
        <MoodIcon mood={choice.value} /><span>{tr(language, choice.en, choice.zh)}</span>
      </button>)}
    </div>
    <p className="mt-2.5 text-[10px] leading-relaxed text-on-surface-variant" aria-live="polite">{tr(language, selected.detailEn, selected.detailZh)}</p>
  </div>;
}
