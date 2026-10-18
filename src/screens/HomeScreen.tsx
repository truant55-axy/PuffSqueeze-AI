import AppIcon from '../components/AppIcon';
import PasswordSettings from '../components/PasswordSettings';
import { motion, useAnimation } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Screen } from '../types';
import { DashboardData, getDashboard, getLatestSqueeze, getProfile, recordSqueezeEvent, updateProfile } from '../services/backendService';
import { getCurrentUserId } from '../services/session';
import { AppLanguage, tr } from '../i18n';
import HealingAnimal from '../components/HealingAnimal';
import CompanionMoodPicker from '../components/CompanionMoodPicker';
import { COMPANION_CHOICES } from '../services/companionService';
import { useCompanion } from '../hooks/useCompanion';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  language: AppLanguage;
}

export default function HomeScreen({ onNavigate, onLogout, language }: HomeScreenProps) {
  const userId = getCurrentUserId();
  const [companion, setCompanion] = useCompanion();
  const [isCompanionPickerOpen, setIsCompanionPickerOpen] = useState(false);
  const [squeezeCount, setSqueezeCount] = useState(0);
  const [sessionSqueezes, setSessionSqueezes] = useState(0);
  const [isJiggling, setIsJiggling] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [gender, setGender] = useState('');
  const [signature, setSignature] = useState('');
  const controls = useAnimation();
  const AI_THRESHOLD = 50;
  const GAME_THRESHOLD = 80;
  const lastTotalRef = useRef<number | null>(null);
  const lastM5ReceivedAtRef = useRef<string | null>(null);

  const triggerCompanionReaction = async () => {
    setIsJiggling(true);
    await controls.start({
      scale: [1, 1.25, 0.85, 1.1, 1],
      rotate: [0, 5, -5, 3, 0],
      transition: { duration: 0.3, ease: 'easeOut' },
    });
    setIsJiggling(false);
  };

  const handleSqueeze = async () => {
    const newCount = squeezeCount + 1;
    setSqueezeCount(newCount);
    setSessionSqueezes((prev) => prev + 1);
    await triggerCompanionReaction();

    try {
      const strikeValue = Math.round(30 + Math.random() * 70);
      const latest = await recordSqueezeEvent(userId, strikeValue);
      setDashboard(latest);
      lastTotalRef.current = latest.total_squeezes;
      setError('');
    } catch (e: any) {
      setError(e?.message || tr(language, 'Failed to sync squeeze data', '同步挤压数据失败'));
    }

    if (newCount === AI_THRESHOLD) {
      setTimeout(() => onNavigate('ai-space'), 300);
    } else if (newCount >= GAME_THRESHOLD) {
      setTimeout(() => {
        onNavigate('game');
        setSqueezeCount(0);
      }, 300);
    }
  };

  // Reset count if no activity for 8 seconds (increased for higher thresholds)
  useEffect(() => {
    if (squeezeCount === 0) return;
    const timer = setTimeout(() => setSqueezeCount(0), 8000);
    return () => clearTimeout(timer);
  }, [squeezeCount]);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const data = await getDashboard(userId);
        if (!active) return;

        setDashboard(data);
        setError('');

        const previousTotal = lastTotalRef.current;
        if (previousTotal !== null && data.total_squeezes > previousTotal) {
          const delta = data.total_squeezes - previousTotal;
          setSqueezeCount((prev) => prev + delta);
          setSessionSqueezes((prev) => prev + delta);
          void triggerCompanionReaction();
        }
        lastTotalRef.current = data.total_squeezes;
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || tr(language, 'Failed to load dashboard', '加载仪表盘失败'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId]);

  useEffect(() => {
    let active = true;

    const pollLatestSqueeze = async () => {
      try {
        const latest = await getLatestSqueeze();
        if (!active || !latest) return;
        if (latest.user_id !== userId) return;

        if (lastM5ReceivedAtRef.current !== latest.received_at) {
          lastM5ReceivedAtRef.current = latest.received_at;
          setSqueezeCount((prev) => prev + 1);
          setSessionSqueezes((prev) => prev + 1);
          void triggerCompanionReaction();

          try {
            const synced = await recordSqueezeEvent(userId, latest.strike_value);
            if (active) {
              setDashboard(synced);
              lastTotalRef.current = synced.total_squeezes;
            }
          } catch {
            // Keep UI reaction even if dashboard sync fails.
          }
        }
      } catch {
        // Ignore temporary poll errors to avoid noisy UI.
      }
    };

    const timer = setInterval(() => {
      void pollLatestSqueeze();
    }, 800);
    void pollLatestSqueeze();

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId]);

  const stressValue = Math.max(0, Math.min(100, Math.round(dashboard?.current_stress ?? 0)));
  const totalSqueezes = sessionSqueezes;
  const stressStatus = dashboard?.stress_status ?? tr(language, 'No Data', '暂无数据');

  const openProfile = async () => {
    setIsProfileOpen(true);
    setProfileLoading(true);
    setProfileError('');
    try {
      const profile = await getProfile(userId);
      setDisplayName(profile.display_name || '');
      setAgeInput(profile.age !== null ? String(profile.age) : '');
      setGender(profile.gender || '');
      setSignature(profile.signature || '');
    } catch (e: any) {
      setProfileError(e?.message || tr(language, 'Failed to load profile', '加载资料失败'));
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileError('');
    try {
      const parsedAge = ageInput.trim() === '' ? null : Number(ageInput);
      await updateProfile(userId, {
        display_name: displayName.trim(),
        age: parsedAge,
        gender: gender.trim(),
        signature: signature.trim(),
      });
      setIsProfileOpen(false);
    } catch (e: any) {
      setProfileError(e?.message || tr(language, 'Failed to save profile', '保存资料失败'));
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 relative z-10">
      <header className="fixed top-0 w-full z-50 bg-[#f7fbff]/85 backdrop-blur-2xl border-b border-[#d8e5f0]/70">
        <div className="flex items-center justify-between px-5 sm:px-8 py-3.5 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-semibold text-primary font-headline tracking-tight">PuffSqueeze</h1>
          </div>
          <button
            type="button"
            onClick={() => void openProfile()}
            className="w-10 h-10 rounded-full border border-primary/15 bg-primary-container/70 text-primary hover:bg-primary-container transition-colors flex items-center justify-center"
            aria-label="Open profile"
          >
            <AppIcon className="app-icon text-xl" aria-hidden="true">person</AppIcon>
          </button>
        </div>
      </header>

      <main className="pt-24 sm:pt-28 px-5 sm:px-6 max-w-2xl mx-auto space-y-7 sm:space-y-8">
        <section className="px-1 pt-2 sm:pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary/80 mb-2">
            {tr(language, 'A gentle moment for you', '给自己留一点温柔时间')}
          </p>
          <h2 className="font-serif text-[28px] sm:text-3xl text-on-surface leading-tight">
            {tr(language, 'Take a breath. You are here.', '慢慢来，你已经在好好照顾自己。')}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
            {tr(language, 'A soft squeeze is enough. Follow your own pace.', '轻轻按下两侧按键，跟着自己的节奏慢慢放松。')}
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('stress-index')}
            className="glass-card rounded-[1.6rem] p-4 sm:p-5 relative overflow-hidden group flex flex-col justify-between cursor-pointer editorial-shadow"
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" 
            />
            
            <div className="relative z-10">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant mb-2 block">{tr(language, 'Your feeling', '此刻的心情')}</span>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl sm:text-4xl font-headline font-semibold text-primary">{stressValue}</span>
                <span className="text-primary/70 font-medium text-sm">%</span>
              </div>
              <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden p-0.5 border border-white/20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stressValue}%` }}
                  transition={{ duration: 2, ease: [0.34, 1.56, 0.64, 1] }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium mt-3 leading-tight">
              {tr(language, 'Today feels', '今天的状态')} <span className="text-primary font-semibold">{stressStatus}</span>
            </p>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('stats')}
            transition={{ delay: 0.1 }}
            className="bg-[#f5f9fd]/80 backdrop-blur-lg rounded-[1.6rem] p-4 sm:p-5 border border-white/80 shadow-[0_12px_32px_rgba(53,72,91,0.06)] flex flex-col justify-between cursor-pointer"
          >
            <div className="relative z-10">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant mb-2 block">{tr(language, 'Gentle presses', '轻轻按压')}</span>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl sm:text-4xl font-headline font-semibold text-on-surface tracking-tight">{totalSqueezes.toLocaleString()}</span>
                <span className="text-on-surface-variant font-medium text-xs">{tr(language, 'times', '次')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 overflow-hidden">
              <div className="flex -space-x-3 shrink-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-6 h-6 rounded-full border-2 border-white shadow-sm ${i === 1 ? 'bg-secondary-container' : 'bg-primary-container'}`} />
                ))}
              </div>
              <div className="h-1 flex-grow bg-outline-variant/10 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ x: [-50, 50] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="h-full w-1/2 bg-primary/20"
                />
              </div>
            </div>
          </motion.section>
        </div>


        {/* Always-present living companion */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          className="relative glass-card rounded-[2rem] p-6 sm:p-9 flex flex-col items-center overflow-hidden min-h-[410px] justify-center editorial-shadow"
        >
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute inset-0 bg-gradient-to-b from-[#e1eff9]/60 via-[#f2f7fc]/45 to-[#e8edf8]/55 pointer-events-none" 
          />
          
          <motion.button 
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => void handleSqueeze()}
            aria-label={tr(language, 'Try a gentle squeeze', '轻轻按一下试试')}
            className="absolute top-5 right-5 bg-white/75 backdrop-blur-md text-primary px-4 py-2.5 rounded-full text-[11px] font-semibold flex items-center gap-2 hover:bg-white transition-all shadow-sm z-10 border border-primary/10"
          >
            <AppIcon className="app-icon text-sm">touch_app</AppIcon>
            <span>{tr(language, 'Press me', '轻按试试')}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsCompanionPickerOpen((open) => !open)}
            aria-expanded={isCompanionPickerOpen}
            className="absolute top-5 left-5 bg-white/75 backdrop-blur-md text-primary px-3 py-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 hover:bg-white transition-all shadow-sm z-20 border border-primary/10"
          >
            <span className="h-6 w-6" aria-hidden="true"><HealingAnimal kind={companion} /></span>
            <span>{tr(language, 'My friend', '换伙伴')}</span>
          </motion.button>

          {isCompanionPickerOpen && (
            <div className="absolute left-4 right-4 top-[4.5rem] z-30 rounded-3xl border border-white/80 bg-[#fbfdff]/95 p-4 shadow-xl backdrop-blur-xl sm:left-6 sm:right-auto sm:w-[360px]">
              <div className="mb-3">
                <p className="text-sm font-bold text-on-surface">{tr(language, 'Who would you like beside you?', '今天想让谁陪在身边？')}</p>
                <p className="mt-1 text-xs text-on-surface-variant">{tr(language, 'Your companion stays here and gently reacts when you press.', '伙伴会一直陪在这里，也会回应你的按压。')}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COMPANION_CHOICES.map((choice) => (
                  <button key={choice.kind} type="button" onClick={() => {
                    setCompanion(choice.kind);
                    setIsCompanionPickerOpen(false);
                  }} className={`rounded-2xl border px-3 py-3 text-left transition-all ${companion === choice.kind ? 'border-primary bg-primary/10 shadow-sm' : 'border-primary/10 bg-white/80 hover:bg-primary/5'}`}>
                    <span className="block h-12 w-12 mx-auto" aria-hidden="true"><HealingAnimal kind={choice.kind} /></span>
                    <span className="mt-1 block text-[11px] font-semibold text-on-surface">{tr(language, choice.en, choice.zh)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {squeezeCount > 0 && (
            <motion.div
              key={squeezeCount}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="relative z-10 mb-3 w-full max-w-[220px] px-2 bg-white/85 backdrop-blur-md py-1.5 rounded-2xl text-[10px] font-black text-primary border border-primary/20 uppercase tracking-[0.2em] shadow-lg flex flex-col items-center gap-0.5"
            >
              <div className="flex items-center gap-1.5 max-w-full">
                <AppIcon className="app-icon text-[10px] text-secondary">favorite</AppIcon>
                <span>{tr(language, `${squeezeCount} gentle presses`, `轻轻按压 ${squeezeCount} 次`)}</span>
              </div>
              <div className="text-[8px] opacity-70 text-center leading-tight break-words">
                {tr(language, 'Thank you for taking a moment for yourself.', '谢谢你愿意留一点时间给自己。')}
              </div>
            </motion.div>
          )}

          <motion.div 
            className="relative w-44 h-52 sm:w-48 sm:h-56 mb-4 cursor-pointer select-none flex items-center justify-center transition-all"
            draggable="false"
            animate={controls}
            onClick={handleSqueeze}
            whileHover={{ scale: 1.05 }}
          >
            {/* Progress Feedback */}
            {squeezeCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: [0.2, 0.4, 0.2],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="absolute inset-0 bg-primary/10 rounded-full blur-3xl pointer-events-none"
              />
            )}

            <HealingAnimal kind={companion} isJiggling={isJiggling} />
            
            <motion.div 
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-primary/90 text-on-primary px-4 py-2 rounded-full text-[10px] font-semibold tracking-wide shadow-lg">
                {tr(language, 'Say hello with a soft press', '轻轻按一下，和我打个招呼')}
              </div>
            </motion.div>
          </motion.div>

            <div className="bg-white/75 backdrop-blur px-4 py-2.5 rounded-full flex items-center gap-2 shadow-sm border border-white/80">
            <span className="w-2 h-2 rounded-full bg-secondary/70" />
            <span className="text-xs font-medium text-on-surface-variant">{tr(language, 'Your companion is here · press at your pace', '伙伴一直陪着你 · 按自己的节奏来')}</span>
          </div>
          <div className="relative z-10 mt-4 w-full max-w-sm"><CompanionMoodPicker kind={companion} language={language} /></div>
        </motion.section>

        {/* Action List */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15
              }
            }
          }}
          className="grid grid-cols-1 gap-6"
        >
          {[
            { id: 'mindful-care', icon: null, title: tr(language, 'A little mindful care', '给自己一点正念时间'), desc: tr(language, 'Small, gentle practices for the moment you are in.', '用简单温柔的小练习，陪伴此刻的自己。'), color: 'text-secondary bg-secondary-container/60' },
            { id: 'connect', icon: 'forum', title: tr(language, 'Share a quiet moment', '分享此刻的心情'), desc: tr(language, 'A kind space to leave a thought or read someone else’s.', '留下一句话，或读读别人的小小心情。'), color: 'text-tertiary bg-tertiary-container/70' }
          ].map((item, i) => (
            <motion.button 
              key={i}
              variants={{
                hidden: { opacity: 0, x: -30, scale: 0.95 },
                visible: { opacity: 1, x: 0, scale: 1 }
              }}
              whileHover={{ 
                x: 4,
                scale: 1.01,
                backgroundColor: "rgba(255, 255, 255, 0.82)",
                boxShadow: "0 16px 34px rgba(57,72,61,0.08)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(item.id as Screen)}
              className="w-full bg-white/55 backdrop-blur-md p-5 sm:p-6 rounded-[1.65rem] border border-white/75 shadow-sm flex items-center gap-4 sm:gap-6 text-left transition-all"
            >
              {item.icon && <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.color}`}>
                <AppIcon className="app-icon text-2xl sm:text-3xl">{item.icon}</AppIcon>
              </div>}
              <div className="flex-grow">
                <h4 className="font-serif text-xl sm:text-2xl text-on-surface mb-1">{item.title}</h4>
                <p className="text-xs sm:text-sm text-on-surface-variant font-medium leading-relaxed">{item.desc}</p>
              </div>
              <AppIcon className="app-icon text-on-surface-variant">chevron_right</AppIcon>
            </motion.button>
          ))}
        </motion.div>
        {loading && <p className="text-xs text-on-surface-variant">{tr(language, 'Loading live metrics...', '正在加载实时数据...')}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </main>

      {/* Floating Action Button */}
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onNavigate('ai-space')}
        aria-label={tr(language, 'Open AI companion', '打开 AI 陪伴')}
        className="fixed bottom-24 right-5 sm:right-8 w-14 h-14 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 flex items-center justify-center z-40 border-4 border-[#f2f7fc]/80 backdrop-blur-md"
      >
        <AppIcon className="app-icon text-2xl">psychology</AppIcon>
      </motion.button>

      {isProfileOpen && (
        <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-white/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-on-surface">{tr(language, 'Edit Profile', '编辑资料')}</h3>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-black/5"
              >
                <AppIcon className="app-icon text-lg">close</AppIcon>
              </button>
            </div>

            {profileLoading ? (
              <p className="text-sm text-on-surface-variant">{tr(language, 'Loading profile...', '正在加载资料...')}</p>
            ) : (
                <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant">{tr(language, 'Name', '姓名')}</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant">{tr(language, 'Age', '年龄')}</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    type="number"
                    min={1}
                    max={120}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant">{tr(language, 'Gender', '性别')}</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    placeholder={tr(language, 'e.g. Male / Female / Non-binary', '例如：男 / 女 / 其他')}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant">{tr(language, 'Signature', '个性签名')}</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm min-h-[84px]"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    maxLength={255}
                  />
                </div>
                {profileError && <p className="text-xs text-red-600">{profileError}</p>}
                <PasswordSettings language={language} />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 rounded-full bg-primary text-white py-2.5 text-sm font-bold disabled:opacity-60"
                    onClick={() => void saveProfile()}
                    disabled={profileSaving}
                  >
                    {profileSaving ? tr(language, 'Saving...', '保存中...') : tr(language, 'Save', '保存')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-300 text-red-600 px-4 py-2.5 text-sm font-bold"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout();
                    }}
                  >
                    {tr(language, 'Logout', '退出登录')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
