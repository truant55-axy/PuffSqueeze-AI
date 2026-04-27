import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { DashboardData, getAiSuggestion, getDashboard } from '../services/backendService';
import { getCurrentUserId } from '../services/session';

export default function StressIndexScreen({ onBack }: { onBack: () => void }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [suggestion, setSuggestion] = useState('Loading AI suggestion...');
  const [error, setError] = useState('');
  const userId = getCurrentUserId();

  useEffect(() => {
    const load = async () => {
      try {
        const [stats, aiText] = await Promise.all([
          getDashboard(userId),
          getAiSuggestion(userId),
        ]);
        setDashboard(stats);
        setSuggestion(aiText);
        setError('');
      } catch (e: any) {
        setError(e?.message || 'Failed to load stress data');
        setSuggestion('Temporarily unavailable. Please try again.');
      }
    };
    load();
  }, [userId]);

  const stressData = dashboard?.weekly ?? [];
  const stressValue = Math.max(0, Math.min(100, Math.round(dashboard?.current_stress ?? 0)));
  const stressStatus = dashboard?.stress_status ?? 'No Data';

  return (
    <div className="min-h-screen pb-24 relative z-10 bg-background/30 font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-3xl border-b border-white/10">
        <div className="flex items-center justify-between px-8 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors mr-1"
            >
              <span className="material-symbols-outlined text-on-surface">arrow_back_ios_new</span>
            </button>
            <span className="material-symbols-outlined text-primary">analytics</span>
            <h1 className="text-xl font-bold text-primary font-headline tracking-tight uppercase tracking-wider">Stress Index</h1>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 shadow-inner">
            <img className="w-full h-full object-cover" src="https://picsum.photos/seed/user1/100/100" alt="User" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-12">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-2">Mental Health</h2>
          <h3 className="text-4xl font-serif italic text-on-surface tracking-tight">Anxiety Levels</h3>
        </section>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/50 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/40 shadow-xl mb-8 relative overflow-hidden text-center"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60 block mb-4">Today's Index</span>
          <div className="flex justify-center items-baseline gap-2 mb-4">
            <span className="text-8xl font-headline font-black text-primary tracking-tighter">{stressValue}</span>
            <span className="text-primary font-bold text-2xl">%</span>
          </div>
          <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-black text-xs uppercase tracking-widest border border-primary/20">
            {stressStatus}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/30 shadow-lg mb-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant/60">Weekly Stress Relief</h4>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              <span className="text-[10px] font-bold text-on-surface-variant/40">Intensity</span>
            </div>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stressData}>
                <defs>
                  <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, opacity: 0.4 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="stress"
                  stroke="var(--primary)"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorStress)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-on-surface p-8 rounded-[2.5rem] shadow-2xl text-surface relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <h3 className="font-serif italic text-2xl text-primary">AI Suggestion</h3>
            </div>
            <p className="text-xs opacity-80 leading-relaxed font-medium">{suggestion}</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        </motion.div>
      </main>
    </div>
  );
}

