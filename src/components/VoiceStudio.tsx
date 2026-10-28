import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Sparkles, Download, Trash2, BookmarkPlus, Check, LoaderCircle, AudioLines } from 'lucide-react';
import { tr, type AppLanguage } from '../i18n';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { synthesizeVoice, VoiceServiceError, type VoiceClip, type VoiceId } from '../services/voiceStudio';
import { getCurrentUserId } from '../services/session';
import { accountRecordId, saveAccountItem } from '../services/accountSync';

const LIMIT = 600;
const voices: { id: VoiceId; en: string; zh: string }[] = [
  { id: 'ana', en: 'Doll voice · English', zh: '玩偶同款 · 英文' },
  { id: 'xiaoxiao', en: 'Gentle voice · Chinese', zh: '温柔女声 · 中文' },
];

function readClips(key: string): VoiceClip[] {
  try {
    const clips: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(clips)) return [];
    return clips.filter((clip): clip is VoiceClip => clip && typeof clip.id === 'string'
      && typeof clip.text === 'string' && clip.text.length <= LIMIT && typeof clip.createdAt === 'string'
      && ['ana', 'xiaoxiao'].includes(clip.voice) && typeof clip.audio === 'string'
      && /^data:audio\/mpeg;base64,[A-Za-z0-9+/=]+$/.test(clip.audio) && clip.audio.length < 1400000).slice(0, 3);
  } catch { return []; }
}

export default function VoiceStudio({ language }: { language: AppLanguage }) {
  const userId = getCurrentUserId();
  const storageKey = `puffsqueeze_voice_studio_${userId}`;
  const recording = useVoiceRecording();
  const [voice, setVoice] = useState<VoiceId>(language === 'zh' ? 'xiaoxiao' : 'ana');
  const [recordLanguage, setRecordLanguage] = useState(language === 'zh' ? 'zh-CN' : 'en-US');
  const [generated, setGenerated] = useState<VoiceClip | null>(null);
  const [clips, setClips] = useState(() => readClips(storageKey));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  const originalPlayer = useRef<HTMLAudioElement | null>(null);
  const resultPlayer = useRef<HTMLAudioElement | null>(null);
  const active = recording.phase !== 'idle';
  const saved = generated && clips.some(clip => clip.id === generated.id);
  const text = recording.transcript.trim();
  const currentResult = generated?.text === text && generated.voice === voice;
  const t = (en: string, zh: string) => tr(language, en, zh);

  useEffect(() => () => { requestRef.current?.abort(); }, []);

  const notice = ({
    secure_context: t('Open this page on HTTPS or localhost to use the microphone.', '请用 HTTPS 或 localhost 打开网页，才能使用麦克风。'),
    recorder_unsupported: t('This browser cannot record audio. Try Chrome or Edge.', '此浏览器不支持录音，请使用 Chrome 或 Edge。'),
    mic_denied: t('Microphone access was denied. Allow it in the address bar, then try again.', '麦克风权限未开启，请在地址栏允许使用后重试。'),
    transcription_unavailable: t('Transcription is unavailable. Listen to the original and fill in your words below, or record again.', '暂时无法识别，请重录，或试听原声后在下方填写文字。'),
    no_transcript: t('No words were recognized. Record again or type what you said below.', '没有识别到文字，可以重新录音或在下方填写你说的话。'),
    recording_failed: t('Recording failed. Check your microphone and try again.', '录音未成功，请检查麦克风后重试。'),
  } as Record<string, string>)[recording.notice];

  const pauseOtherAudio = (playing: HTMLAudioElement) => {
    if (recording.phase === 'recording') { playing.pause(); return; }
    document.querySelectorAll<HTMLAudioElement>('[data-voice-studio-audio]').forEach(audio => { if (audio !== playing) audio.pause(); });
  };

  const generate = async () => {
    if (!text || active || busy) return;
    originalPlayer.current?.pause(); resultPlayer.current?.pause();
    const controller = new AbortController(); requestRef.current = controller;
    const deadline = setTimeout(() => controller.abort(), 45000);
    setBusy(true); setError('');
    try {
      const audio = await synthesizeVoice(text, voice, controller.signal);
      if (controller.signal.aborted) return;
      setGenerated({ id: accountRecordId(), text, voice, audio, createdAt: new Date().toISOString() });
    } catch (err) {
      if (controller.signal.aborted) setError(t('Generation stopped. You can try again.', '转换已停止，可以重试。'));
      else if (err instanceof VoiceServiceError && err.code === 'voice_not_configured') {
        setError(t('The voice service is not configured on this server yet.', '当前服务器还未配置语音合成服务。'));
      } else if (err instanceof VoiceServiceError && err.code === 'voice_busy') {
        setError(t('Please wait a few seconds before generating again.', '请等几秒后再转换。'));
      } else setError(t('AI voice generation failed. Check the connection and try again.', 'AI 语音生成失败，请检查网络后重试。'));
    } finally {
      clearTimeout(deadline);
      if (requestRef.current === controller) { requestRef.current = null; setBusy(false); }
    }
  };

  const persist = (next: VoiceClip[]) => {
    // Keep the account document small enough for local storage and account sync.
    if (JSON.stringify(next).length > 1800000) { setError(t('Your voice collection is full. Delete a clip first.', '语音收藏已满，请先删除一段。')); return; }
    try { saveAccountItem(storageKey, JSON.stringify(next), userId); setClips(next); setError(''); }
    catch { setError(t('Could not save. Download the audio to keep a copy.', '暂时无法保存，可以先下载音频。')); }
  };

  const button = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

  return <section aria-labelledby="voice-studio-title" className="glass-card rounded-[2rem] p-5 sm:p-7 editorial-shadow border border-white/80 space-y-5">
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container/70 text-primary"><AudioLines size={23} /></span>
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-secondary mb-1">{t('Your words, a little softer', '让你的话，多一点温柔')}</p>
        <h3 id="voice-studio-title" className="font-serif text-2xl text-on-surface">{t('AI voice studio', 'AI 声音工坊')}</h3>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed">{t('Record a thought. Hear it back in a gentle AI voice.', '录下想说的话，再用温柔的 AI 声音听一遍。')}</p>
      </div>
    </div>

    <div className="rounded-3xl bg-white/65 border border-primary/10 p-4 sm:p-5">
      <div className="flex justify-between items-center gap-3 mb-4">
        <span className="text-xs font-semibold text-on-surface">{t('01 · Record your words', '01 · 录下你想说的话')}</span>
        <label className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <span className="sr-only">{t('Spoken language', '录音语言')}</span>
          <select aria-label={t('Spoken language', '录音语言')} value={recordLanguage} disabled={active || busy} onChange={e => { setRecordLanguage(e.target.value); setVoice(e.target.value === 'zh-CN' ? 'xiaoxiao' : 'ana'); }} className="rounded-lg bg-white border border-primary/15 px-2 py-1.5 text-on-surface">
            <option value="en-US">English</option><option value="zh-CN">中文</option>
          </select>
        </label>
      </div>
      <div className="flex justify-center items-center gap-[5px] h-12 mb-4 text-primary/50" aria-hidden="true">
        {[10, 18, 13, 26, 20, 32, 16, 38, 25, 44, 28, 36, 18, 30, 22, 34, 14, 24, 12, 18, 10].map((height, i) =>
          <span key={i} className={`w-[4px] sm:w-[5px] rounded-full bg-current ${recording.phase === 'recording' ? 'motion-safe:animate-pulse text-rose-400' : ''}`} style={{ height, animationDelay: `${i * 75}ms` }} />)}
      </div>
      <div className="flex flex-wrap justify-center items-center gap-3">
        {recording.phase === 'recording' ? <button type="button" onClick={recording.finish} className={`${button} bg-rose-600 text-white hover:bg-rose-700`}><Square size={15} fill="currentColor" />{t('Stop recording', '结束录音')}</button>
          : (recording.phase === 'requesting' || recording.phase === 'finishing') ? <button type="button" onClick={recording.finish} className={`${button} bg-primary/10 text-primary`}><LoaderCircle size={15} className="animate-spin" />{recording.phase === 'finishing' ? t('Transcribing… · Cancel', '正在识别… · 取消') : t('Cancel microphone request', '取消麦克风请求')}</button>
          : <button type="button" disabled={busy} onClick={() => {
            document.querySelectorAll<HTMLAudioElement>('[data-voice-studio-audio]').forEach(audio => audio.pause());
            setGenerated(null); setError(''); void recording.start(recordLanguage);
          }} className={`${button} bg-primary text-on-primary hover:opacity-90`}>
            <Mic size={16} />
            {recording.originalUrl ? t('Record again', '重新录音') : t('Start recording', '开始录音')}
          </button>}
        <span className="text-xs text-on-surface-variant tabular-nums" role="timer" aria-label={t('Recording duration', '录音时长')}>00:{String(recording.seconds).padStart(2, '0')} / 00:30</span>
      </div>
      {recording.originalUrl && <div className="mt-4">
        <p className="text-[11px] text-on-surface-variant mb-2">{t('Your original recording', '你的原声')}</p>
        <audio ref={originalPlayer} data-voice-studio-audio controls src={recording.originalUrl} onPlay={e => pauseOtherAudio(e.currentTarget)} className="w-full h-10" aria-label={t('Original recording', '原声录音')} />
      </div>}
      {notice && <p className="text-xs text-amber-800 mt-3 leading-relaxed" role="status">{notice}</p>}
    </div>

    <div className="space-y-3">
      <label htmlFor="voice-transcript" className="text-xs font-semibold text-on-surface block">{t('02 · Check your words & choose a voice', '02 · 确认文字，选择音色')}</label>
      <textarea id="voice-transcript" value={recording.transcript} maxLength={LIMIT} disabled={active || busy} onChange={e => recording.setTranscript(e.target.value)} rows={3}
        placeholder={t('Your words will appear here. You can also type or correct them.', '录音识别的文字会显示在这里，也可以直接输入或修改。')}
        className="w-full resize-y rounded-2xl border border-primary/15 bg-white/75 p-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-2 focus:outline-primary disabled:opacity-70" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('AI voice', 'AI 音色')}>
          {voices.map(choice => <button key={choice.id} type="button" aria-pressed={voice === choice.id} disabled={active || busy} onClick={() => setVoice(choice.id)} className={`rounded-full px-3 py-2 text-xs border transition-colors disabled:opacity-50 ${voice === choice.id ? 'bg-primary/10 border-primary/40 text-primary font-semibold' : 'bg-white/60 border-primary/10 text-on-surface-variant hover:bg-white'}`}>{tr(language, choice.en, choice.zh)}</button>)}
        </div>
        <span className="text-[10px] text-on-surface-variant">{recording.transcript.length}/{LIMIT}</span>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" disabled={!text || active || busy} onClick={() => void generate()} className={`${button} bg-primary text-on-primary hover:opacity-90`}>
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy ? t('Creating your voice…', '正在生成语音…') : t('Convert to AI voice', '转换为 AI 声音')}
        </button>
        {busy ? <button type="button" onClick={() => requestRef.current?.abort()} className={`${button} text-on-surface-variant bg-white/60`}>{t('Cancel', '取消')}</button>
          : (text || recording.originalUrl || generated) && <button type="button" disabled={active} onClick={() => { recording.clear(); setGenerated(null); setError(''); }} className={`${button} text-on-surface-variant hover:bg-white/70`}><Trash2 size={14} />{t('Clear', '清空')}</button>}
      </div>
      <p className="text-[10px] leading-relaxed text-on-surface-variant">{t('Recordings are sent through this app’s server to Gemini for transcription, then the recording and transcript are saved to your account’s cloud database. Conversion sends only your confirmed text to the online voice service.', '录音会通过本应用服务器发送给 Gemini 进行识别，随后录音和识别文字会保存到你的账号云数据库；点击转换时，仅将确认后的文字发送给在线语音合成服务。')}</p>
    </div>

    {error && <p className="text-xs text-red-700 leading-relaxed" role="alert">{error}</p>}
    {generated && <div className="rounded-3xl border border-primary/15 bg-primary-container/35 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary" role="status">{t('Your AI voice is ready', 'AI 语音已生成')}{!currentResult && <span className="font-normal text-on-surface-variant ml-2">{t('Previous version', '上一版内容')}</span>}</p>
      <p className="text-xs text-on-surface-variant break-words leading-relaxed">{generated.text}</p>
      <audio key={generated.id} ref={resultPlayer} data-voice-studio-audio controls src={generated.audio} onPlay={e => pauseOtherAudio(e.currentTarget)} className="w-full h-10" aria-label={t('Generated AI voice', '生成的 AI 语音')} />
      <div className="flex flex-wrap gap-2">
        <a className={`${button} bg-white/70 text-primary`} href={generated.audio} download={`PuffSqueeze-voice-${generated.id.slice(0, 8)}.mp3`}><Download size={14} />{t('Download MP3', '下载 MP3')}</a>
        <button type="button" disabled={!!saved} onClick={() => persist([generated, ...clips].slice(0, 3))} className={`${button} text-primary hover:bg-white/60`}>
          {saved ? <Check size={14} /> : <BookmarkPlus size={14} />}{saved ? t('Saved', '已保存') : t('Save to my voices', '保存到我的语音')}
        </button>
      </div>
    </div>}

    {clips.length > 0 && <details className="group">
      <summary className="cursor-pointer text-xs font-semibold text-on-surface py-1">{t('My voices', '我的语音')} · {clips.length}/3</summary>
      <p className="mt-2 text-[10px] text-on-surface-variant">{t('Saved to your account. Up to 3 clips; saving a fourth replaces the oldest.', '保存到当前账号，最多 3 段；保存第 4 段时替换最早的一段。')}</p>
      <div className="space-y-3 mt-3">
        {clips.map(clip => <div key={clip.id} className="rounded-2xl bg-white/70 border border-primary/10 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-xs text-on-surface break-words leading-relaxed">{clip.text}</p><p className="mt-1 text-[10px] text-on-surface-variant">{tr(language, voices.find(v => v.id === clip.voice)!.en, voices.find(v => v.id === clip.voice)!.zh)}</p></div>
            <button type="button" onClick={() => persist(clips.filter(item => item.id !== clip.id))} aria-label={t('Delete saved voice', '删除已保存的语音')} className="p-2 text-on-surface-variant hover:text-red-700"><Trash2 size={15} /></button>
          </div>
          <audio data-voice-studio-audio controls preload="none" src={clip.audio} onPlay={e => pauseOtherAudio(e.currentTarget)} className="w-full h-10" aria-label={t('Saved AI voice', '已保存的 AI 语音')} />
          <a href={clip.audio} download={`PuffSqueeze-voice-${clip.id.slice(0, 8)}.mp3`} className="inline-flex items-center gap-1 text-[11px] text-primary py-1"><Download size={12} />{t('Download', '下载')}</a>
        </div>)}
      </div>
    </details>}
  </section>;
}
