import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { logUsage } from '../services/backendService';
import { getCurrentUserId } from '../services/session';

export default function MindfulCareScreen({ onBack }: { onBack: () => void }) {
  const [happiness, setHappiness] = useState(85);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [activeRoutine, setActiveRoutine] = useState<'breathing' | 'feeding' | null>(null);
  const [breathStepIndex, setBreathStepIndex] = useState(0);
  const [breathRemain, setBreathRemain] = useState(4);
  const [breathCyclesDone, setBreathCyclesDone] = useState(0);
  const [feedingProgress, setFeedingProgress] = useState(0);
  const [cleaningProgress, setCleaningProgress] = useState(0);
  const [seedsFed, setSeedsFed] = useState(0);
  const [feedingCelebrating, setFeedingCelebrating] = useState(false);
  const [petMessage, setPetMessage] = useState('Tap a care action to interact with your bird.');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [planText, setPlanText] = useState('');
  const [dailyPlans, setDailyPlans] = useState<Record<string, string>>({});
  const [breathingMuted, setBreathingMuted] = useState(false);
  const [breathingPlaying, setBreathingPlaying] = useState(false);
  const [audioHint, setAudioHint] = useState('');
  const breathingAudioRef = useRef<HTMLAudioElement | null>(null);
  const userId = getCurrentUserId();

  const routines = useMemo(
    () => [
      {
        id: 1,
        key: 'mindful_gentle_stroke',
        title: 'Gentle Stroke',
        icon: 'back_hand',
        desc: 'Soothe the bird with soft touches.',
        energy: 5,
        doneText: 'Gentle Stroke completed. Your bird calmed down.',
      },
      {
        id: 2,
        key: 'mindful_deep_breathing',
        title: 'Deep Breathing',
        icon: 'air',
        desc: 'Sync your breath with the bird.',
        energy: 15,
        doneText: 'Deep Breathing completed. Rhythm is now steady.',
      },
      {
        id: 3,
        key: 'mindful_feeding_time',
        title: 'Feeding Time',
        icon: 'eco',
        desc: 'Provide organic digital seeds.',
        energy: 10,
        doneText: 'Feeding Time completed. Energy reserves restored.',
      },
    ],
    []
  );

  const handleRoutine = async (routine: (typeof routines)[number]) => {
    if (busyId !== null || completed[routine.id]) return;
    if (routine.id === 2) {
      setBreathStepIndex(0);
      setBreathRemain(4);
      setBreathCyclesDone(0);
      setActiveRoutine('breathing');
      if (!breathingAudioRef.current) {
        const audio = new Audio('/audio/pianowhitesound.mp3?v=3');
        audio.loop = true;
        audio.volume = 0.5;
        audio.onplaying = () => {
          setBreathingPlaying(true);
          setAudioHint('Music playing');
        };
        audio.onpause = () => setBreathingPlaying(false);
        audio.onerror = () => {
          setBreathingPlaying(false);
          setAudioHint('Audio load failed');
        };
        breathingAudioRef.current = audio;
      }
      breathingAudioRef.current.muted = false;
      setBreathingMuted(false);
      const playPromise = breathingAudioRef.current.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          setAudioHint('Tap Play Music to start audio');
        });
      }
      return;
    }
    if (routine.id === 3) {
      setFeedingProgress(0);
      setCleaningProgress(0);
      setSeedsFed(0);
      setFeedingCelebrating(false);
      setPetMessage('Tap a care action to interact with your bird.');
      setPlannerOpen(false);
      setActiveRoutine('feeding');
      return;
    }

    await completeRoutine(routine);
  };

  const completeRoutine = async (routine: (typeof routines)[number], detail: Record<string, unknown> = {}) => {
    if (busyId !== null || completed[routine.id]) return;
    setBusyId(routine.id);
    setMessage('');
    try {
      await logUsage({
        user_id: userId,
        action_type: routine.key,
        action_detail: {
          score_gain: routine.energy,
          routine_title: routine.title,
          client_time: new Date().toISOString(),
          ...detail,
        },
      });
      setHappiness((prev) => Math.min(100, prev + routine.energy));
      setCompleted((prev) => ({ ...prev, [routine.id]: true }));
      setMessage(routine.doneText);
    } catch (e: any) {
      setMessage(e?.message || 'Action failed, please try again.');
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (activeRoutine !== 'breathing') return;
    const steps = [
      { label: 'Inhale', seconds: 4 },
      { label: 'Hold', seconds: 2 },
      { label: 'Exhale', seconds: 6 },
      { label: 'Hold', seconds: 2 },
    ];

    const timer = setInterval(() => {
      setBreathRemain((prev) => {
        if (prev > 1) return prev - 1;
        const nextStep = (breathStepIndex + 1) % steps.length;
        if (nextStep === 0) {
          setBreathCyclesDone((c) => {
            const next = c + 1;
            if (next >= 3) {
              const routine = routines.find((r) => r.id === 2);
              if (routine) {
                void completeRoutine(routine, { completed_cycles: 3 });
              }
              setActiveRoutine(null);
            }
            return next;
          });
        }
        setBreathStepIndex(nextStep);
        return steps[nextStep].seconds;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRoutine, breathStepIndex, routines]);

  useEffect(() => {
    if (activeRoutine !== 'breathing') {
      const audio = breathingAudioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      return;
    }

    if (!breathingAudioRef.current) {
      const audio = new Audio('/audio/pianowhitesound.mp3?v=3');
      audio.loop = true;
      audio.volume = 0.5;
      audio.onplaying = () => {
        setBreathingPlaying(true);
        setAudioHint('Music playing');
      };
      audio.onpause = () => setBreathingPlaying(false);
      audio.onerror = () => {
        setBreathingPlaying(false);
        setAudioHint('Audio load failed');
      };
      breathingAudioRef.current = audio;
    }

    const playPromise = breathingAudioRef.current.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // autoplay may be blocked before user interaction
      });
    }

    return () => {
      const audio = breathingAudioRef.current;
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      setBreathingMuted(false);
      setBreathingPlaying(false);
      setAudioHint('');
    };
  }, [activeRoutine]);

  const currentBreathStep = useMemo(() => {
    const steps = [
      { label: 'Inhale', seconds: 4, scale: 1.2 },
      { label: 'Hold', seconds: 2, scale: 1.2 },
      { label: 'Exhale', seconds: 6, scale: 0.9 },
      { label: 'Hold', seconds: 2, scale: 0.9 },
    ];
    return steps[breathStepIndex];
  }, [breathStepIndex]);

  const feedBird = () => {
    if (feedingCelebrating) return;
    setSeedsFed((s) => s + 1);
    setPetMessage('Yummy. I like this snack.');
    setFeedingProgress((prev) => {
      const next = Math.min(100, prev + 20);
      if (next >= 100) {
        setFeedingCelebrating(true);
      }
      return next;
    });
  };

  const cleanBird = () => {
    if (feedingCelebrating) return;
    setPetMessage('I like taking shower.');
    setCleaningProgress((prev) => Math.min(100, prev + 25));
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('puffsqueeze_daily_plans');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setDailyPlans(parsed as Record<string, string>);
        }
      }
    } catch {
      // ignore parse failures
    }
  }, []);

  const savePlan = () => {
    const text = planText.trim();
    if (!planDate || text === '') return;
    setDailyPlans((prev) => {
      const next = { ...prev, [planDate]: text };
      localStorage.setItem('puffsqueeze_daily_plans', JSON.stringify(next));
      return next;
    });
    setPlanText('');
    setPetMessage('Plan saved. Keep going one step at a time.');
  };

  useEffect(() => {
    if (!feedingCelebrating) return;
    const routine = routines.find((r) => r.id === 3);
    if (routine) {
      void completeRoutine(routine, { seeds_fed: seedsFed });
    }
    const timer = setTimeout(() => {
      setActiveRoutine(null);
      setFeedingCelebrating(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, [feedingCelebrating, routines, seedsFed]);

  return (
    <div className="min-h-screen pb-24 relative z-10">
      <header className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-2xl border-b border-white/10">
        <div className="flex items-center gap-4 px-8 py-4 w-full max-w-7xl mx-auto">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-all">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold text-primary font-headline tracking-tight">Mindful Care</h1>
        </div>
      </header>

      <main className="pt-28 px-6 max-w-2xl mx-auto space-y-10">
        {/* Happiness Status */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-[2.5rem] p-10 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-primary/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${happiness}%` }}
              className="h-full bg-primary"
            />
          </div>
          <h2 className="text-3xl font-serif italic text-on-surface mb-2">Bird Happiness</h2>
          <div className="text-6xl font-headline font-black text-primary mb-4">{happiness}%</div>
          <p className="text-on-surface-variant font-medium">Your companion is feeling peaceful today.</p>
          {message && <p className="text-sm text-primary font-semibold mt-3">{message}</p>}
        </motion.section>

        {/* Interaction Routines */}
        <div className="space-y-6">
          <h3 className="text-xl font-serif italic text-on-surface px-4">Daily Routines</h3>
          {routines.map((item, i) => (
            <motion.button 
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ x: 10, backgroundColor: "rgba(255, 255, 255, 0.6)" }}
              onClick={() => void handleRoutine(item)}
              disabled={busyId !== null || Boolean(completed[item.id])}
              className="w-full bg-white/30 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-sm flex items-center gap-8 text-left transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <span className="material-symbols-outlined text-3xl">{item.icon}</span>
              </div>
              <div className="flex-grow">
                <h4 className="font-headline font-bold text-lg text-on-surface mb-1">{item.title}</h4>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                  {completed[item.id] ? 'Completed today.' : item.desc}
                </p>
              </div>
              <div className="text-primary font-black text-sm">
                {completed[item.id] ? 'Done' : `+${item.energy}`}
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      {activeRoutine === 'breathing' && (
        <div className="fixed inset-0 z-[90] bg-[#eaf4fa] flex flex-col items-center justify-center px-6">
          <h3 className="text-3xl font-black text-primary mb-2">Deep Breathing</h3>
          <p className="text-on-surface-variant mb-8">Follow the guide. Complete 3 cycles.</p>
          <motion.div
            animate={{ scale: currentBreathStep.scale }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="w-52 h-52 rounded-full bg-primary/20 border-4 border-primary/40 flex items-center justify-center mb-8"
          >
            <div className="text-center">
              <p className="text-2xl font-black text-primary">{currentBreathStep.label}</p>
              <p className="text-xl font-bold text-on-surface mt-2">{breathRemain}s</p>
            </div>
          </motion.div>
          <p className="text-sm font-semibold text-on-surface-variant mb-8">Cycle {Math.min(3, breathCyclesDone + 1)} / 3</p>
          {audioHint && <p className="text-xs text-primary mb-3">{audioHint}</p>}
          <button
            type="button"
            onClick={() => {
              const audio = breathingAudioRef.current;
              if (!audio) return;
              if (breathingPlaying) {
                audio.pause();
                setAudioHint('Music paused');
                return;
              }
              void audio.play().catch(() => {
                setAudioHint('Play blocked, tap again');
              });
            }}
            className="mb-3 px-6 py-3 rounded-full bg-primary text-white font-bold"
          >
            {breathingPlaying ? 'Pause Music' : 'Play Music'}
          </button>
          <button
            type="button"
            onClick={() => {
              const audio = breathingAudioRef.current;
              if (!audio) return;
              const nextMuted = !breathingMuted;
              audio.muted = nextMuted;
              setBreathingMuted(nextMuted);
              if (!nextMuted) {
                void audio.play().catch(() => undefined);
              }
            }}
            className="mb-4 px-6 py-3 rounded-full bg-white border border-primary/20 text-primary font-bold"
          >
            {breathingMuted ? 'Unmute Music' : 'Mute Music'}
          </button>
          <button
            type="button"
            onClick={() => setActiveRoutine(null)}
            className="px-6 py-3 rounded-full border border-primary/30 text-primary font-bold"
          >
            Exit
          </button>
        </div>
      )}

      {activeRoutine === 'feeding' && (
        <div className="fixed inset-0 z-[90] bg-[#f6fbf3] flex flex-col items-center justify-center px-6">
          <h3 className="text-3xl font-black text-primary mb-2">Feeding Time</h3>
          <p className="text-on-surface-variant mb-4 text-center">
            {feedingCelebrating ? 'Yummy. Your bird is happy.' : petMessage}
          </p>
          <div className="w-full max-w-sm h-3 rounded-full bg-primary/15 overflow-hidden mb-2">
            <motion.div className="h-full bg-primary" animate={{ width: `${feedingProgress}%` }} />
          </div>
          <p className="text-xs text-on-surface-variant mb-2">Feeding {feedingProgress}%</p>
          <div className="w-full max-w-sm h-3 rounded-full bg-sky-100 overflow-hidden mb-2">
            <motion.div className="h-full bg-sky-500" animate={{ width: `${cleaningProgress}%` }} />
          </div>
          <p className="text-xs text-on-surface-variant mb-6">Cleaning {cleaningProgress}%</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setPetMessage('I am waiting for your care actions.')}
            disabled={false}
            className="w-56 h-56 rounded-full bg-white shadow-xl border border-primary/20 flex flex-col items-center justify-center"
          >
            <motion.div
              animate={
                feedingCelebrating
                  ? { y: [0, -10, 0, -8, 0], rotate: [0, 6, 0, -6, 0], scale: [1, 1.06, 1] }
                  : { y: [0, -2, 0] }
              }
              transition={{ duration: feedingCelebrating ? 0.9 : 1.6, repeat: feedingCelebrating ? 1 : Infinity }}
              className="w-36 h-40"
            >
              <svg viewBox="0 0 200 250" className="w-full h-full">
                <rect x="58" y="195" width="40" height="26" rx="13" fill="#fbbf24" />
                <rect x="102" y="195" width="40" height="26" rx="13" fill="#fbbf24" />
                <path d="M30 145 C 10 150, -5 170, 5 190 C 15 200, 35 180, 45 165 Z" fill="#1d4ed8" />
                <path d="M170 145 C 190 150, 205 170, 195 190 C 185 200, 165 180, 155 165 Z" fill="#1d4ed8" />
                <circle cx="10" cy="188" r="14" fill="#ffffff" />
                <circle cx="190" cy="188" r="14" fill="#ffffff" />
                <path d="M30 110 C 30 20, 170 20, 170 110 L170 155 C 170 200, 140 215, 100 215 C 60 215, 30 200, 30 155 Z" fill="#ffffff" />
                <path d="M30 155 C 30 200, 60 215, 100 215 C 140 215, 170 200, 170 155 L170 135 C 140 120, 60 120, 30 135 Z" fill="#1d4ed8" />
                <text x="100" y="180" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="2">XJTLU</text>
                <ellipse cx="74" cy="98" rx="6" ry="14" fill="#1e293b" />
                <ellipse cx="126" cy="98" rx="6" ry="14" fill="#1e293b" />
                <ellipse cx="46" cy="104" rx="12" ry="8" fill="#f9a8d4" />
                <ellipse cx="154" cy="104" rx="12" ry="8" fill="#f9a8d4" />
                <ellipse cx="100" cy="110" rx="18" ry="22" fill="#eab308" />
              </svg>
            </motion.div>
            <span className="text-sm font-bold text-primary mt-2">
              {feedingCelebrating ? 'Happy Bird' : 'Your Bird'}
            </span>
          </motion.button>
          <p className="text-sm text-on-surface-variant mt-4">Seeds fed: {seedsFed}</p>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={feedBird}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold"
            >
              Feeding
            </button>
            <button
              type="button"
              onClick={cleanBird}
              className="px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-bold"
            >
              Cleaning
            </button>
            <button
              type="button"
              onClick={() => setPlannerOpen((v) => !v)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold"
            >
              Plan Note
            </button>
          </div>

          {plannerOpen && (
            <div className="mt-4 w-full max-w-md bg-white/90 border border-primary/15 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-black text-primary">Daily Planner</p>
              <input
                type="date"
                value={planDate}
                onChange={(e) => {
                  const d = e.target.value;
                  setPlanDate(d);
                  setPlanText(dailyPlans[d] || '');
                }}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder="Write what you plan to do or what you finished today."
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm min-h-[88px]"
              />
              <button
                type="button"
                onClick={savePlan}
                className="w-full rounded-lg bg-primary text-white py-2 text-sm font-bold"
              >
                Save Plan
              </button>
              <div className="text-xs text-on-surface-variant max-h-28 overflow-auto">
                {Object.keys(dailyPlans).length === 0 && <p>No saved plans yet.</p>}
                {Object.entries(dailyPlans)
                  .sort(([a], [b]) => (a < b ? 1 : -1))
                  .slice(0, 7)
                  .map(([date, content]) => (
                    <p key={date} className="mb-1">
                      {date}: {content}
                    </p>
                  ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setActiveRoutine(null)}
            className="mt-8 px-6 py-3 rounded-full border border-primary/30 text-primary font-bold"
          >
            Exit
          </button>
        </div>
      )}
    </div>
  );
}
