import { motion, useAnimation } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Screen } from '../types';
import { DashboardData, getDashboard, getProfile, recordSqueezeEvent, updateProfile } from '../services/backendService';
import { getCurrentUserId } from '../services/session';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

export default function HomeScreen({ onNavigate, onLogout }: HomeScreenProps) {
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
  const userId = getCurrentUserId();
  const lastTotalRef = useRef<number | null>(null);

  const triggerBirdReaction = async () => {
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
    await triggerBirdReaction();

    try {
      const strikeValue = Math.round(30 + Math.random() * 70);
      const latest = await recordSqueezeEvent(userId, strikeValue);
      setDashboard(latest);
      lastTotalRef.current = latest.total_squeezes;
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to sync squeeze data');
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
          void triggerBirdReaction();
        }
        lastTotalRef.current = data.total_squeezes;
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Failed to load dashboard');
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

  const stressValue = Math.max(0, Math.min(100, Math.round(dashboard?.current_stress ?? 0)));
  const totalSqueezes = sessionSqueezes;
  const stressStatus = dashboard?.stress_status ?? 'No Data';

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
      setProfileError(e?.message || 'Failed to load profile');
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
      setProfileError(e?.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 relative z-10">
      <header className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-2xl border-b border-white/10">
        <div className="flex items-center justify-between px-8 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <motion.span 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="material-symbols-outlined text-primary text-3xl"
            >
              waves
            </motion.span>
            <h1 className="text-2xl font-bold text-primary font-headline tracking-tight">PuffSqueeze AI</h1>
          </div>
          <button
            type="button"
            onClick={() => void openProfile()}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 shadow-inner hover:scale-105 transition-transform"
            aria-label="Open profile"
          >
            <div className="w-full h-full">
              <img className="w-full h-full object-cover" src="https://picsum.photos/seed/user1/100/100" alt="User" referrerPolicy="no-referrer" />
            </div>
          </button>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-10">
        {/* Side-by-side Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('stress-index')}
            className="glass-card rounded-[2rem] p-6 relative overflow-hidden group flex flex-col justify-between cursor-pointer"
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" 
            />
            
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-2 block">Stress Index</span>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-headline font-black text-primary">{stressValue}</span>
                <span className="text-primary/60 font-bold text-sm">%</span>
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
            <p className="text-[10px] text-on-surface-variant font-medium mt-4 leading-tight">
              Level is <span className="text-primary font-bold">{stressStatus}</span>
            </p>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('stats')}
            transition={{ delay: 0.1 }}
            className="bg-white/40 backdrop-blur-lg rounded-[2rem] p-6 border border-white/20 shadow-sm flex flex-col justify-between cursor-pointer"
          >
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-2 block">Squeeze Pulse</span>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-headline font-black text-on-surface tracking-tighter">{totalSqueezes.toLocaleString()}</span>
                <span className="text-on-surface-variant font-bold text-xs">Hits</span>
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


        {/* Sanctuary Core Character - Placeholder for 3D Bode Bird */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          className="relative glass-card rounded-[2.5rem] p-12 flex flex-col items-center overflow-hidden min-h-[480px] justify-center"
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
            className="absolute inset-0 bg-gradient-to-b from-primary/5 to-secondary/5 pointer-events-none" 
          />
          
          <motion.button 
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-8 right-8 bg-white/50 backdrop-blur-md text-primary px-6 py-3 rounded-full text-xs font-black flex items-center gap-2 hover:bg-white transition-all shadow-sm z-10 border border-white/20"
          >
            <span className="material-symbols-outlined text-sm">pan_tool</span>
            <span>[Simulate Hit]</span>
          </motion.button>

          <motion.div 
            className="relative w-64 h-72 mb-8 cursor-pointer select-none flex items-center justify-center transition-all"
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

            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-full max-w-[220px] px-2 flex flex-col items-center pointer-events-none z-20">
              {squeezeCount > 0 && (
                <motion.div
                  key={squeezeCount}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="w-full bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[10px] font-black text-primary border border-primary/20 uppercase tracking-[0.2em] shadow-lg flex flex-col items-center gap-0.5"
                >
                  <div className="flex items-center gap-1.5 max-w-full">
                    <span className="material-symbols-outlined text-[10px] animate-pulse text-secondary">flash_on</span>
                    <span>Squeeze {squeezeCount}</span>
                  </div>
                  <div className="text-[8px] opacity-60 text-center leading-tight break-words">
                    {squeezeCount < AI_THRESHOLD 
                      ? `${AI_THRESHOLD - squeezeCount} more to AI Space` 
                      : `${GAME_THRESHOLD - squeezeCount} more to Game Mode`}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Squishy Bird (XJTLU Liverbird) SVG */}
            <svg viewBox="0 0 200 250" className="w-full h-full drop-shadow-[0_40px_60px_rgba(var(--primary),0.2)] overflow-visible relative z-10">
              
              {/* Feet */}
              <motion.g 
                animate={{ 
                  y: isJiggling ? [0, 5, 0] : [0, 2, 0],
                  scale: isJiggling ? [1, 1.2, 1] : 1
                }} 
                transition={{ duration: isJiggling ? 0.2 : 4, repeat: isJiggling ? 0 : Infinity }}
              >
                <rect x="58" y="195" width="40" height="26" rx="13" fill="#fbbf24" />
                <rect x="102" y="195" width="40" height="26" rx="13" fill="#fbbf24" />
              </motion.g>

              {/* Main Body Scale/Squish */}
              <motion.g 
                animate={{ 
                  scaleY: isJiggling ? [1, 0.7, 1.3, 1] : [1, 0.98, 1],
                  scaleX: isJiggling ? [1, 1.3, 0.7, 1] : [1, 1.02, 1],
                  y: isJiggling ? [0, 10, -5, 0] : [0, 6, 0]
                }} 
                transition={{ 
                  duration: isJiggling ? 0.4 : 4, 
                  repeat: isJiggling ? 0 : Infinity,
                  ease: "easeInOut"
                }}
                style={{ transformOrigin: "100px 200px" }}
              >
                {/* Wing left */}
                <motion.path 
                  d="M30 145 C 10 150, -5 170, 5 190 C 15 200, 35 180, 45 165 Z" 
                  fill="#1d4ed8" 
                  animate={{ rotate: [0, 5, 0] }}
                  style={{ transformOrigin: "30px 145px" }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                
                {/* Wing right */}
                <motion.path 
                  d="M170 145 C 190 150, 205 170, 195 190 C 185 200, 165 180, 155 165 Z" 
                  fill="#1d4ed8" 
                  animate={{ rotate: [0, -5, 0] }}
                  style={{ transformOrigin: "170px 145px" }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Left hand / white globe */}
                <circle cx="10" cy="188" r="14" fill="#ffffff" />
                {/* Right hand / white globe */}
                <circle cx="190" cy="188" r="14" fill="#ffffff" />

                {/* White Body Base */}
                <path d="M30 110 C 30 20, 170 20, 170 110 L170 155 C 170 200, 140 215, 100 215 C 60 215, 30 200, 30 155 Z" fill="#ffffff" />

                {/* Tuft (hair/feather curl on top) */}
                <path d="M100 28 C 95 -15, 135 -10, 120 15 C 113 22, 105 25, 103 28 Z" fill="#f8fafc" />

                {/* Blue Shirt Overlay */}
                <path d="M30 155 C 30 200, 60 215, 100 215 C 140 215, 170 200, 170 155 L170 135 C 140 120, 60 120, 30 135 Z" fill="#1d4ed8" />
                
                {/* Shirt Text */}
                <text x="100" y="180" textAnchor="middle" fill="#ffffff" fontSize="32" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="3">XJTLU</text>

                {/* Face Group */}
                <g>
                  {/* Eyes (Blinking) */}
                  <motion.ellipse 
                    cx="74" cy="98" rx="6" ry="14" fill="#1e293b" 
                    animate={{ scaleY: [1, 0.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 3 }}
                    style={{ transformOrigin: "74px 98px" }}
                  />
                  <motion.ellipse 
                    cx="126" cy="98" rx="6" ry="14" fill="#1e293b" 
                    animate={{ scaleY: [1, 0.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 3 }}
                    style={{ transformOrigin: "126px 98px" }}
                  />

                  {/* Cheeks (Blush) */}
                  <ellipse cx="46" cy="104" rx="12" ry="8" fill="#f9a8d4" />
                  <ellipse cx="154" cy="104" rx="12" ry="8" fill="#f9a8d4" />

                  {/* Beak */}
                  <ellipse cx="100" cy="110" rx="18" ry="22" fill="#eab308" />
                </g>
              </motion.g>
            </svg>
            
            <motion.div 
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-primary/90 text-on-primary px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                Squeeze Me!
              </div>
            </motion.div>
          </motion.div>

          <div className="bg-surface-container-lowest/80 backdrop-blur px-6 py-2 rounded-full flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Live: Bode Bird Core</span>
          </div>
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
            { id: 'mindful-care', icon: 'eco', title: 'Mindful Care', desc: 'Daily care routines to maintain bird happiness.', color: 'text-secondary bg-secondary-container/20' },
            { id: 'connect', icon: 'forum', title: 'Community', desc: 'Connect with other Sanctuary keepers globally.', color: 'text-tertiary bg-tertiary-container/20' }
          ].map((item, i) => (
            <motion.button 
              key={i}
              variants={{
                hidden: { opacity: 0, x: -30, scale: 0.95 },
                visible: { opacity: 1, x: 0, scale: 1 }
              }}
              whileHover={{ 
                x: 15, 
                scale: 1.02,
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.05)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(item.id as Screen)}
              className="w-full bg-white/30 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-sm flex items-center gap-8 text-left transition-all"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${item.color} shadow-inner`}>
                <span className="material-symbols-outlined text-3xl">{item.icon}</span>
              </div>
              <div className="flex-grow">
                <h4 className="font-serif italic text-2xl text-on-surface mb-1">{item.title}</h4>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">{item.desc}</p>
              </div>
              <span className="material-symbols-outlined text-outline-variant/40">chevron_right</span>
            </motion.button>
          ))}
        </motion.div>
        {loading && <p className="text-xs text-on-surface-variant">Loading live metrics...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </main>

      {/* Floating Action Button */}
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onNavigate('ai-space')}
        className="fixed bottom-28 right-8 w-20 h-20 rounded-full bg-primary text-on-primary shadow-2xl shadow-primary/40 flex items-center justify-center z-40 border-4 border-white/20 backdrop-blur-md"
      >
        <span className="material-symbols-outlined text-4xl">add</span>
      </motion.button>

      {isProfileOpen && (
        <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-on-surface">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-black/5"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {profileLoading ? (
              <p className="text-sm text-on-surface-variant">Loading profile...</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant">Name</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant">Age</label>
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
                  <label className="text-xs font-bold text-on-surface-variant">Gender</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    placeholder="e.g. Male / Female / Non-binary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant">Signature</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm min-h-[84px]"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    maxLength={255}
                  />
                </div>
                {profileError && <p className="text-xs text-red-600">{profileError}</p>}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 rounded-full bg-primary text-white py-2.5 text-sm font-bold disabled:opacity-60"
                    onClick={() => void saveProfile()}
                    disabled={profileSaving}
                  >
                    {profileSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-300 text-red-600 px-4 py-2.5 text-sm font-bold"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout();
                    }}
                  >
                    Logout
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
