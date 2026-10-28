import { saveAccountItem } from '../services/accountSync';
import AppIcon from '../components/AppIcon';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import HealingAnimal from '../components/HealingAnimal';
import CompanionMoodPicker from '../components/CompanionMoodPicker';
import CareBreathing from '../components/CareBreathing';
import { useCompanion } from '../hooks/useCompanion';
import { useCarePets } from '../hooks/useCarePets';
import { COMPANION_CHOICES } from '../services/companionService';
import { CARE_REWARDS, CareError, createCareInvite, growthProgress, growthStage, GROWTH_STAGES, joinCareHome, manageCareHome, type CareAction, type CarePet, type FoodKind } from '../services/careService';
import { login, logUsage } from '../services/backendService';
import { getCurrentUserId, setCurrentUserId } from '../services/session';
import { tr, type AppLanguage } from '../i18n';
import { playConfiguredVoice } from '../services/voiceStudio';
import './mindfulCare.css';

const actions: { key: CareAction; icon: string; en: string; zh: string }[] = [
  { key: 'feed', icon: 'restaurant', en: 'Feed', zh: '喂食' }, { key: 'pet', icon: 'back_hand', en: 'Gentle Stroke', zh: '轻抚' },
  { key: 'wash', icon: 'water_drop', en: 'Clean', zh: '清洁' }, { key: 'play', icon: 'sports_esports', en: 'Play', zh: '玩耍' },
  { key: 'rest', icon: 'bedtime', en: 'Rest', zh: '休息' }, { key: 'breathe', icon: 'air', en: 'Deep Breathing', zh: '深呼吸' },
];
const foods: { key: FoodKind; icon: string; en: string; zh: string }[] = [
  { key: 'seeds', icon: 'grass', en: 'Energy seeds', zh: '能量种子' }, { key: 'berry', icon: 'nutrition', en: 'Berries', zh: '莓果' }, { key: 'biscuit', icon: 'bakery_dining', en: 'Biscuit', zh: '饼干' },
];
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function readPlans(key: string): Record<string, string> { try { const raw = JSON.parse(localStorage.getItem(key) || '{}'); return raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : {}; } catch { return {}; } }

export default function MindfulCareScreen({ onBack, language }: { onBack: () => void; language: AppLanguage }) {
  const [companion, chooseCompanion] = useCompanion();
  const care = useCarePets();
  const userId = getCurrentUserId();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [food, setFood] = useState<FoodKind>('seeds');
  const [selectedAction, setSelectedAction] = useState(0);
  const [reaction, setReaction] = useState<CareAction | null>(null);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [leveledUp, setLeveledUp] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [breathingPet, setBreathingPet] = useState<CarePet | null>(null);
  const [invite, setInvite] = useState<{ petId: string; code: string } | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [socialBusy, setSocialBusy] = useState(false);
  const [petName, setPetName] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [planDate, setPlanDate] = useState(today);
  const plannerKey = `puffsqueeze_daily_plans_${userId}`;
  const [plans, setPlans] = useState(() => readPlans(plannerKey));
  const [planText, setPlanText] = useState(() => readPlans(plannerKey)[today()] || '');
  const [showLegacy, setShowLegacy] = useState(false);
  const legacyPlans = readPlans('puffsqueeze_daily_plans');
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const actionLock = useRef(false);
  const remoteMemory = useRef<{ petId: string; eventId?: string; xp: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const pet = care.pets.find(p => p.id === roomId) || care.pets.find(p => p.owner_id === userId && p.kind === companion) || care.pets[0];
  const progress = growthProgress(pet.xp);
  const choice = COMPANION_CHOICES.find(c => c.kind === pet.kind)!;
  const name = pet.name || (language === 'zh' ? choice.zh : choice.en);
  const online = !pet.id.startsWith('local-');
  const owner = pet.owner_id === userId;
  const disabled = care.busy || cooldown || care.mode === 'loading' || socialBusy;
  useEffect(() => () => { timeouts.current.forEach(clearTimeout); }, []);
  useEffect(() => { setPetName(pet.name); setNotice(''); setFailure(''); setInvite(null); }, [pet.id]);
  const messageForError = (e: unknown) => {
    const code = e instanceof CareError ? e.code : 'CARE_SERVER';
    const errors: Record<string, [string, string]> = {
      CARE_LOGIN: ['Sign in again to open your online home and invite friends.', '重新登录后可进入在线空间、邀请好友。'],
      CARE_PAUSE: ['A little pause — try again in a few seconds.', '让伙伴缓一缓，几秒后再互动吧。'],
      CARE_CODE: ['This invitation is invalid or expired. Ask your friend for a new code.', '邀请码无效或已过期，请好友生成新邀请码。'],
      CARE_FULL: ['This home already has six caregivers.', '这个空间已有六位照顾者。'],
      CARE_MEMBER: ['Your membership changed. Refresh your homes.', '空间成员状态已改变，请刷新空间。'],
      CARE_OWNER: ['Only the home owner can manage this setting.', '这项设置由空间主人管理。'],
      CARE_CREDENTIALS: ['Could not sign in. Check your email, password and backend connection.', '登录失败，请检查邮箱、密码及后端连接。'],
      CARE_SERVER: ['Could not confirm the sync. Reconnect to see the saved progress.', '暂时无法确认同步结果，请重新连接查看保存的进度。'],
    };
    return tr(language, ...(errors[code] || errors.CARE_SERVER));
  };
  const schedule = (fn: () => void, ms: number) => { timeouts.current.push(setTimeout(fn, ms)); };
  useEffect(() => {
    const event = pet.events[0];
    const previous = remoteMemory.current;
    remoteMemory.current = { petId: pet.id, eventId: event?.id, xp: pet.xp };
    if (!previous || previous.petId !== pet.id || !event || previous.eventId === event.id || event.user_id === userId) return;
    setReaction(event.action);
    setNotice(tr(language, `${event.name} cared for ${name}. Growing together!`, `${event.name} 刚刚照顾了${name}，一起慢慢长大！`));
    schedule(() => setReaction(null), 1800);
    if (growthStage(pet.xp) > growthStage(previous.xp)) { setLeveledUp(true); schedule(() => setLeveledUp(false), 4500); }
  }, [pet.id, pet.events[0]?.id, pet.xp]);
  const commitAction = async (action: CareAction, target: CarePet) => {
    if (actionLock.current) return;
    actionLock.current = true; setFailure('');
    try {
      const next = await care.action(target, action, food);
      setReaction(action); setCooldown(true);
      const responses: Record<CareAction, [string, string]> = { feed: ['Energy replenished. Thanks for the care.', '能量已补充，谢谢你的照顾。'], pet: ['Your gentle touch makes this home feel warm.', '轻轻摸摸，空间也变得暖暖的。'], wash: ['Clean and refreshed.', '清洁完成，状态焕新。'], play: ['A good moment to unwind together.', '一起活动一下，放松片刻。'], rest: ['Resting and restoring energy.', '休息片刻，恢复精力。'], breathe: ['We found a calmer rhythm together.', '我们一起找到了更平静的节奏。'] };
      const spokenResponse = tr(language, ...responses[action]);
      setNotice(`${spokenResponse} +${CARE_REWARDS[action]} XP`);
      void playConfiguredVoice(spokenResponse, 'interaction').catch(() => undefined);
      if (growthStage(next.xp) > growthStage(target.xp)) { setLeveledUp(true); schedule(() => setLeveledUp(false), 4500); }
      schedule(() => setReaction(null), 1800); schedule(() => setCooldown(false), 5200);
      if (target.id.startsWith('local-')) void logUsage({ user_id: userId, action_type: `mindful_${action === 'feed' ? 'feeding_time' : action === 'pet' ? 'gentle_stroke' : action === 'breathe' ? 'deep_breathing' : action}`, action_detail: { score_gain: CARE_REWARDS[action], kind: target.kind, local_care: true, ...(action === 'breathe' ? { completed_cycles: 3 } : {}) } }).catch(() => undefined);
    } catch (e) { setFailure(messageForError(e)); } finally { actionLock.current = false; }
  };
  const act = async (action: CareAction, target = pet) => { if (actionLock.current || care.busy || cooldown) return; if (action === 'breathe') { setBreathingPet(target); return; } await commitAction(action, target); };
  useEffect(() => {
    const auto = localStorage.getItem('puffsqueeze_mindfulcare_autostart');
    if (care.mode === 'loading') return;
    if (auto === 'breathing') { localStorage.removeItem('puffsqueeze_mindfulcare_autostart'); setBreathingPet(pet); }
    else if (auto === 'feeding') { localStorage.removeItem('puffsqueeze_mindfulcare_autostart'); setSelectedAction(0); }
  }, [care.mode, pet.id]);
  const social = async (run: () => Promise<void>) => { if (socialBusy || care.busy) return; setSocialBusy(true); setFailure(''); try { await run(); } catch (e) { setFailure(messageForError(e)); } finally { setSocialBusy(false); } };
  const savePlan = () => { const text = planText.trim(); if (!text || !planDate) return; const next = { ...plans, [planDate]: text }; saveAccountItem(plannerKey, JSON.stringify(next), userId); setPlans(next); setNotice(tr(language, 'Plan saved. One small step at a time.', '计划已保存，一小步一小步慢慢来。')); };
  const syncLogin = async () => { await social(async () => { let user; try { user = await login(email.trim(), password); } catch { throw new CareError('Sign in failed', 'CARE_CREDENTIALS'); } if (user.id !== userId) { setFailure(tr(language, 'Use the account you are currently signed into. Switch accounts from Home.', '请使用当前登录的账号；更换账号请从 Home 退出后登录。')); return; } setCurrentUserId(user.id, user.care_token); setPassword(''); setShowLogin(false); await care.refresh(); }); };

  return <div className="care-page min-h-screen pb-32 relative z-10">
    <header className="fixed top-0 w-full z-50 bg-[#f2f7fc]/85 backdrop-blur-xl border-b border-white/70"><div className="flex items-center gap-3 px-5 py-4 max-w-6xl mx-auto"><button onClick={onBack} aria-label={tr(language, 'Back to Home', '返回首页')} className="w-10 h-10 rounded-full bg-white/80 text-primary flex items-center justify-center"><AppIcon className="app-icon">arrow_back</AppIcon></button><h1 className="font-headline text-lg sm:text-xl font-bold text-primary">{tr(language, 'Mindful Care', '正念陪伴')}</h1></div></header>
    <main inert={Boolean(breathingPet)} className="max-w-6xl mx-auto px-4 sm:px-7 pt-28 space-y-6">
      <div className="flex flex-wrap justify-between gap-4 items-end"><div><p className="text-primary text-[10px] sm:text-xs tracking-[.22em] uppercase mb-2">{tr(language, 'COMPANION SPACE', '伙伴空间')}</p><h2 className="care-page-title">{tr(language, 'A moment of calm, at your pace.', '给自己一段放松的时间。')}</h2><p className="text-sm text-on-surface-variant mt-2">{tr(language, 'Care for your companion, track your progress and take a break.', '照顾伙伴，记录成长，也给自己留一点休息的空间。')}</p></div><span className="care-pill"><span className={`w-1.5 h-1.5 rounded-full ${care.mode === 'online' && !care.error ? 'bg-[#8faea2]' : 'bg-primary/50'}`} />{care.mode === 'loading' ? tr(language, 'Connecting…', '连接中…') : online ? care.error ? tr(language, 'Reconnecting', '等待重连') : tr(language, 'Online home', '在线空间') : tr(language, 'On this device', '此设备空间')}</span></div>
      {(care.error || care.mode === 'local') && <div className="care-sync-note"><div><p className="font-semibold text-sm">{care.error === 'CARE_LOGIN' ? tr(language, 'Open your shared home', '开启好友共养空间') : tr(language, 'Companion connection', '伙伴连接状态')}</p><p className="text-xs mt-1 leading-relaxed">{online ? tr(language, 'Waiting for the server. Shared care resumes when connected.', '正在等待服务器连接，连接恢复后可继续共同照顾。') : tr(language, 'Device progress is saved separately. Sign in again for online growth and friend invitations.', '此设备进度单独保存。重新登录后进入在线成长存档，并可邀请好友。')}</p></div><button className="care-button shrink-0" onClick={() => care.error === 'CARE_LOGIN' ? setShowLogin(v => !v) : void care.refresh()}>{care.error === 'CARE_LOGIN' ? tr(language, 'Sign in to sync', '登录同步') : tr(language, 'Reconnect', '重新连接')}</button></div>}
      {showLogin && <form className="care-panel p-5 flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); void syncLogin(); }}><label className="grow text-xs">{tr(language, 'Current account email', '当前账号邮箱')}<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="care-input mt-1" /></label><label className="grow text-xs">{tr(language, 'Password', '密码')}<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="care-input mt-1" /></label><button disabled={socialBusy} className="care-button self-end">{tr(language, 'Connect online home', '连接在线空间')}</button></form>}
      <section aria-label={tr(language, 'Choose your companion', '选择伙伴')} className="care-companion-strip">{COMPANION_CHOICES.map(c => { const p = care.pets.find(p => p.owner_id === userId && p.kind === c.kind); const active = owner && c.kind === pet.kind; return <button key={c.kind} disabled={care.busy || socialBusy || Boolean(breathingPet)} aria-pressed={active} onClick={() => { chooseCompanion(c.kind); setRoomId(null); }} className={`care-choice ${active ? 'is-active' : ''}`}><div className="h-14 w-14 mx-auto"><HealingAnimal kind={c.kind} growthStage={growthStage(p?.xp || 0)} /></div><span className="block text-[11px] mt-1 font-semibold whitespace-nowrap">{language === 'zh' ? c.zh : c.en}</span><span className="block text-[9px] text-on-surface-variant mt-1">Lv. {1 + Math.floor((p?.xp || 0) / 40)}</span></button>; })}</section>
      <div className="care-workspace grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
        <section className="care-device"><div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3"><div className="flex items-center gap-2"><AppIcon className="app-icon text-primary text-lg">cottage</AppIcon><span className="text-xs font-semibold">{owner ? tr(language, 'My companion space', '我的伙伴空间') : tr(language, 'Shared companion space', '好友的伙伴空间')}</span></div><span className="text-[10px] font-bold text-primary uppercase tracking-wider">{language === 'zh' ? progress.stage.zh : progress.stage.en}</span></div>
          <div className={`care-scene ${reaction === 'rest' ? 'is-resting' : ''}`}><div className="care-window" aria-hidden="true"><div className="care-cloud" /><span className="care-window-star">✧</span><i /><b /></div><div className="care-plant" aria-hidden="true"><span /><i /><b /></div><div className="care-rug" aria-hidden="true" /><span className="care-scene-star" aria-hidden="true">✦</span><motion.button className="care-scene-pet" aria-label={tr(language, `Gently stroke ${name}`, `轻抚${name}`)} disabled={disabled} onClick={() => void act('pet')} animate={reduceMotion ? {} : reaction === 'play' ? { rotate: [0, -2, 2, -1, 0], y: [0, -7, 0, -3, 0] } : { rotate: 0, y: 0 }} transition={{ duration: 1.1 }}><HealingAnimal kind={pet.kind} growthStage={progress.index} mood={owner ? undefined : 'calm'} isJiggling={reaction === 'feed' || reaction === 'pet' || reaction === 'wash'} /></motion.button><AnimatePresence>{reaction && <motion.div key={`${pet.id}-${reaction}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: .8, y: -5 }} exit={{ opacity: 0 }} className="care-reaction" aria-hidden="true"><AppIcon className="app-icon">{reaction === 'wash' ? 'water_drop' : reaction === 'rest' ? 'bedtime' : reaction === 'feed' ? foods.find(f => f.key === food)?.icon : 'favorite'}</AppIcon></motion.div>}</AnimatePresence><div className="care-scene-caption"><span className="font-bold">{name}</span><span className="text-on-surface-variant text-[10px]">{tr(language, 'Tap to interact', '点击伙伴进行互动')}</span></div>{leveledUp && <div className="care-level-toast" role="status"><AppIcon className="app-icon">auto_awesome</AppIcon>{tr(language, 'New stage unlocked', '已解锁新的成长阶段')}</div>}</div>
          {owner && <div className="px-4 sm:px-5 pt-4"><CompanionMoodPicker kind={pet.kind} language={language} /></div>}
          <div className="px-4 sm:px-5 py-4 space-y-4"><div className="flex items-center justify-between text-xs"><span className="font-bold">{tr(language, 'Nutrition', '补充能量')}</span><span className="text-on-surface-variant">{tr(language, 'Each feed +10 XP', '每次喂食 +10 XP')}</span></div><div className="grid grid-cols-3 gap-2">{foods.map(f => <button className={`care-food ${food === f.key ? 'is-active' : ''}`} key={f.key} aria-pressed={food === f.key} onClick={() => setFood(f.key)}><AppIcon className="app-icon" aria-hidden="true">{f.icon}</AppIcon><span>{language === 'zh' ? f.zh : f.en}</span></button>)}</div><div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{actions.map((a, i) => <button key={a.key} className={`care-tool ${selectedAction === i ? 'is-active' : ''}`} disabled={disabled} onClick={() => { setSelectedAction(i); void act(a.key); }} aria-label={`${language === 'zh' ? a.zh : a.en} +${CARE_REWARDS[a.key]} XP`}><AppIcon className="app-icon">{a.icon}</AppIcon><span>{language === 'zh' ? a.zh : a.en}</span><small>+{CARE_REWARDS[a.key]}</small></button>)}</div>{cooldown && <p className="text-center text-[10px] text-on-surface-variant">{tr(language, 'Taking a short pause…', '稍作停留，感受这次陪伴。')}</p>}</div>
        </section>
        <aside className="space-y-4"><section className="care-panel p-6"><div className="flex items-start justify-between"><div><p className="text-xs text-primary font-semibold">{tr(language, 'Growing with your care', '在你的陪伴中成长')}</p><h3 className="text-xl font-bold mt-2">{name}</h3></div><span className="care-pill">Lv. {progress.level}</span></div><div className="flex justify-between text-[11px] mt-5 mb-2"><span>{language === 'zh' ? progress.stage.zh : progress.stage.en}</span><span>{pet.xp} / {progress.stage.nextAt ?? '∞'} XP</span></div><div className="care-meter"><motion.div animate={{ width: `${progress.percent}%` }} /></div><p className="text-[11px] mt-2 text-on-surface-variant">{progress.remaining ? tr(language, `${progress.remaining} XP to the next form`, `再积累 ${progress.remaining} XP 解锁下一个形象`) : tr(language, 'Mature form unlocked. Your shared progress continues.', '已解锁成熟形态，陪伴与成长仍会继续积累。')}</p><div className="space-y-4 mt-6">{([{ key: 'happiness', en: 'Happiness', zh: '幸福值', icon: 'favorite' }, { key: 'fullness', en: 'Fullness', zh: '饱食度', icon: 'restaurant' }, { key: 'cleanliness', en: 'Cleanliness', zh: '清洁度', icon: 'water_drop' }, { key: 'energy', en: 'Energy', zh: '活力', icon: 'bedtime' }] as const).map(s => <div key={s.key}><div className="flex justify-between items-center text-[11px] mb-1.5"><span className="flex items-center gap-2"><AppIcon className="app-icon text-base text-primary">{s.icon}</AppIcon>{language === 'zh' ? s.zh : s.en}</span><span>{Math.round(pet[s.key])}%</span></div><div className={`care-meter ${s.key}`} role="progressbar" aria-label={language === 'zh' ? s.zh : s.en} aria-valuenow={Math.round(pet[s.key])} aria-valuemin={0} aria-valuemax={100}><motion.div animate={{ width: `${pet[s.key]}%` }} /></div></div>)}</div><p className="text-[10px] text-on-surface-variant leading-relaxed mt-5">{tr(language, 'A gentle pace: no lost growth, no punishment for taking a break.', '按自己的节奏来，离开休息不会扣除成长经验。')}</p></section>
          <section className="care-panel p-5"><div className="flex items-center gap-2 mb-3"><AppIcon className="app-icon text-primary">history</AppIcon><h3 className="font-semibold text-sm">{tr(language, 'Care history', '互动记录')}</h3></div><div className="space-y-3 max-h-44 overflow-y-auto">{pet.events.length === 0 ? <p className="text-xs text-on-surface-variant leading-relaxed">{tr(language, 'Your care activity will appear here.', '互动记录会保存在这里。')}</p> : pet.events.slice(0, 6).map(event => <div key={event.id} className="flex gap-2.5 items-center"><AppIcon className="app-icon rounded-xl bg-primary/8 text-primary p-2 text-base">{actions.find(a => a.key === event.action)?.icon || 'favorite'}</AppIcon><div className="min-w-0 grow"><p className="text-xs truncate">{event.user_id === userId ? tr(language, 'You', '你') : event.name} · {language === 'zh' ? actions.find(a => a.key === event.action)?.zh : actions.find(a => a.key === event.action)?.en}</p><p className="text-[9px] text-on-surface-variant mt-1">{new Date(event.created_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div><span className="text-[10px] text-primary">+{event.xp_gain} XP</span></div>)}</div></section>
        </aside>
      </div>
      <div className="min-h-6" role="status" aria-live="polite">{failure ? <p className="care-sync-note text-sm">{failure}</p> : notice ? <p className="text-center text-sm text-primary font-semibold">{notice}</p> : null}</div>
      <section className="care-panel p-5 sm:p-7"><div className="flex justify-between items-center gap-3"><div><p className="text-[10px] tracking-[.18em] uppercase text-primary">{tr(language, 'GROWTH', '成长阶段')}</p><h3 className="text-lg font-headline font-semibold mt-1">{tr(language, 'See how your companion develops.', '看见每个阶段的变化。')}</h3></div><AppIcon className="app-icon text-primary">auto_awesome</AppIcon></div><div className="grid grid-cols-3 gap-2 sm:gap-5 mt-5">{GROWTH_STAGES.map((s, i) => <div className={`care-growth-card ${i === progress.index ? 'is-current' : ''}`} key={s.en}><div className="care-growth-art"><HealingAnimal kind={pet.kind} growthStage={i as 0 | 1 | 2} mood={owner ? undefined : 'calm'} /></div><p className="font-semibold text-[11px] sm:text-sm mt-2">{language === 'zh' ? s.zh : s.en}</p><p className="care-growth-detail">{language === 'zh' ? s.detailZh : s.detailEn}</p><p className="text-[10px] text-on-surface-variant mt-1">{s.minimum} XP · {pet.xp >= s.minimum ? tr(language, 'Unlocked', '已解锁') : tr(language, 'Preview', '成长预览')}</p></div>)}</div></section>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="care-panel p-5 sm:p-7" id="care-friends"><div className="flex items-center gap-2"><AppIcon className="app-icon text-primary">group</AppIcon><h3 className="text-lg font-bold">{tr(language, 'Shared care', '和好友共同照顾')}</h3></div><p className="text-xs leading-relaxed text-on-surface-variant mt-2">{tr(language, 'Invite up to five friends. Everyone cares for the same companion and shares its growth.', '最多邀请五位好友，一起照顾同一只伙伴，共享成长进度。')}</p>
          <div className="mt-4 flex flex-wrap gap-2">{pet.members.map(member => <span key={member.id} className="care-pill"><AppIcon className="app-icon text-sm">{member.id === pet.owner_id ? 'cottage' : 'person'}</AppIcon>{member.id === userId ? tr(language, 'You', '你') : member.name}{owner && member.id !== userId && <button disabled={socialBusy} aria-label={tr(language, `Remove ${member.name}`, `移除${member.name}`)} onClick={() => void social(async () => { const next = await manageCareHome(pet, 'remove', { member_id: member.id }); if (next) care.replace(next); setInvite(null); })} className="text-primary ml-1">×</button>}</span>)}</div>
          {online && owner && <div className="mt-4 flex flex-wrap gap-2"><button className="care-button" disabled={socialBusy} onClick={() => void social(async () => setInvite({ petId: pet.id, code: await createCareInvite(pet) }))}>{tr(language, 'Create invitation', '生成邀请码')}</button><button className="care-button secondary" disabled={socialBusy} onClick={() => void social(async () => { await manageCareHome(pet, 'revoke'); setInvite(null); setNotice(tr(language, 'Invitations revoked. Existing members stay.', '旧邀请码已失效，现有成员保留。')); })}>{tr(language, 'Revoke invitations', '停用邀请码')}</button></div>}
          {invite?.petId === pet.id && <div className="mt-3 rounded-2xl bg-[#eaf2f9] p-4"><p className="text-[10px] text-on-surface-variant">{tr(language, 'Give this code to your friends · expires in 7 days', '将邀请码发给好友 · 七天有效')}</p><p className="font-mono font-bold tracking-[.18em] text-primary text-lg my-2 select-all">{invite.code}</p><button className="text-xs text-primary underline" onClick={() => void navigator.clipboard.writeText(invite.code).then(() => setNotice(tr(language, 'Invitation copied.', '邀请码已复制。'))).catch(() => setNotice(tr(language, 'Select the code and copy it manually.', '选中邀请码即可手动复制。')))}>{tr(language, 'Copy code', '复制邀请码')}</button></div>}
          {online ? <form className="flex gap-2 mt-5" onSubmit={e => { e.preventDefault(); void social(async () => { const joined = await joinCareHome(joinCode); care.replace(joined); setRoomId(joined.id); setJoinCode(''); }); }}><label className="grow min-w-0"><span className="text-xs font-semibold">{tr(language, 'Join a friend’s home', '加入好友的空间')}</span><input required maxLength={16} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder={tr(language, '12-character invitation code', '输入十二位邀请码')} className="care-input mt-2 font-mono" /></label><button className="care-button self-end" disabled={socialBusy || !joinCode.trim()}>{tr(language, 'Join', '加入')}</button></form> : <p className="mt-4 text-xs text-primary">{tr(language, 'Sign in to your online home above to invite or join friends.', '在页面上方登录在线空间后，即可邀请或加入好友。')}</p>}
          {care.pets.some(p => p.owner_id !== userId) && <div className="mt-5 space-y-2"><p className="text-xs font-semibold">{tr(language, 'Friend homes', '好友空间')}</p>{care.pets.filter(p => p.owner_id !== userId).map(p => <button key={p.id} className={`care-friend-home ${pet.id === p.id ? 'is-active' : ''}`} disabled={care.busy || socialBusy} onClick={() => setRoomId(p.id)}><AppIcon className="app-icon text-primary">cottage</AppIcon><span className="grow text-left text-xs">{p.name || (language === 'zh' ? COMPANION_CHOICES.find(c => c.kind === p.kind)?.zh : COMPANION_CHOICES.find(c => c.kind === p.kind)?.en)} · {p.members.find(m => m.id === p.owner_id)?.name}</span><span className="text-[10px] text-primary">Lv. {growthProgress(p.xp).level}</span></button>)}</div>}
          {!owner && online && <button className="text-xs text-on-surface-variant underline mt-4" disabled={socialBusy} onClick={() => void social(async () => { await manageCareHome(pet, 'leave'); setRoomId(null); await care.refresh(); })}>{tr(language, 'Leave this friend’s home', '退出这个好友空间')}</button>}
          {owner && <form className="mt-5 flex gap-2" onSubmit={e => { e.preventDefault(); if (!petName.trim()) return; if (!online) { care.replace({ ...pet, name: petName.trim() }); setNotice(tr(language, 'Companion name saved.', '伙伴名字已保存。')); return; } void social(async () => { const next = await manageCareHome(pet, 'rename', { name: petName.trim() }); if (next) care.replace(next); setNotice(tr(language, 'Companion name saved.', '伙伴名字已保存。')); }); }}><label className="grow min-w-0"><span className="text-xs font-semibold">{tr(language, 'Companion name', '伙伴名字')}</span><input maxLength={30} value={petName} onChange={e => setPetName(e.target.value)} placeholder={name} className="care-input mt-2" /></label><button className="care-button secondary self-end" disabled={socialBusy || !petName.trim()}>{tr(language, 'Save', '保存')}</button></form>}
        </section>
        <section className="care-panel p-5 sm:p-7"><div className="flex items-center gap-2"><AppIcon className="app-icon text-primary">edit_note</AppIcon><h3 className="text-lg font-bold">{tr(language, 'Daily Planner', '每日计划便签')}</h3></div><p className="text-xs text-on-surface-variant mt-2">{tr(language, 'Make a little space for yourself, too.', '照顾伙伴，也别忘了照顾自己。')}</p><form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); savePlan(); }}><label className="block text-xs">{tr(language, 'Date', '日期')}<input type="date" required value={planDate} onChange={e => { setPlanDate(e.target.value); setPlanText(plans[e.target.value] || ''); }} className="care-input mt-2" /></label><label className="block text-xs">{tr(language, 'Plan Note', '计划内容')}<textarea maxLength={3000} value={planText} onChange={e => setPlanText(e.target.value)} placeholder={tr(language, 'One thing to do, one thing you finished, or a little kindness…', '写下一件想做的事、已完成的事，或者一份小小的温柔…')} className="care-input min-h-28 mt-2 resize-y" /></label><button className="care-button w-full" disabled={!planText.trim()}>{tr(language, 'Save Plan', '保存计划')}</button></form><div className="mt-4 max-h-36 overflow-auto space-y-2">{Object.entries(plans).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7).map(([date, text]) => <button key={date} onClick={() => { setPlanDate(date); setPlanText(text); }} className="text-left w-full border-b border-primary/10 pb-2"><span className="text-[10px] text-primary font-semibold">{date}</span><p className="text-xs mt-1 text-on-surface-variant whitespace-pre-wrap">{text}</p></button>)}</div>{Object.keys(legacyPlans).length > 0 && <div className="mt-4"><button className="text-xs underline text-on-surface-variant" onClick={() => setShowLegacy(v => !v)}>{tr(language, 'View previous device notes', '查看设备中原来的便签')}</button>{showLegacy && <div className="text-xs mt-3 max-h-28 overflow-auto space-y-2">{Object.entries(legacyPlans).sort(([a], [b]) => b.localeCompare(a)).map(([date, text]) => <p key={date}>{date}: {text}</p>)}</div>}</div>}</section>
      </div>
    </main>
    {breathingPet && <CareBreathing language={language} onClose={() => setBreathingPet(null)} onComplete={() => { const target = breathingPet; setBreathingPet(null); void commitAction('breathe', target); }} />}
  </div>;
}
