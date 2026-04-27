import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart,
  Bar
} from 'recharts';
import { DashboardData, getDashboard } from '../services/backendService';
import { getCurrentUserId } from '../services/session';

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const userId = getCurrentUserId();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDashboard(userId);
        setDashboard(data);
        setError('');
      } catch (e: any) {
        setError(e?.message || 'Failed to load stats');
      }
    };
    load();
  }, [userId]);

  const weeklyData = dashboard?.weekly ?? [];
  const todaySqueezes = dashboard?.today_squeezes ?? 0;
  const weeklyAverage = dashboard?.weekly_average_squeezes ?? 0;

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
            <span className="material-symbols-outlined text-primary">touch_app</span>
            <h1 className="text-xl font-bold text-primary font-headline tracking-tight uppercase tracking-wider">Squeeze Pulse</h1>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 shadow-inner">
            <img className="w-full h-full object-cover" src="https://picsum.photos/seed/user1/100/100" alt="User" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-12">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-2">Analysis</h2>
          <h3 className="text-4xl font-serif italic text-on-surface tracking-tight">Daily Counts</h3>
        </section>

        {/* Today's Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/40 shadow-xl mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <span className="material-symbols-outlined text-[120px]">touch_app</span>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60">Today's Activity</span>
              <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-600 font-bold text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Tracking
              </div>
            </div>
            
            <div className="flex items-baseline gap-4 mb-4">
              <span className="text-8xl font-headline font-black text-on-surface tracking-tighter">{todaySqueezes}</span>
              <span className="text-on-surface-variant font-bold text-xl uppercase tracking-widest">Squeezes</span>
            </div>
            
            <p className="text-on-surface-variant/80 font-medium leading-relaxed max-w-sm">
              Real-time count from database. This value refreshes from your latest squeeze events.
            </p>
          </div>
        </motion.div>

        {/* Weekly Trend Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/30 shadow-lg mb-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant/60">Weekly Statistics</h4>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-md bg-primary/40" />
              <span className="text-[10px] font-bold text-on-surface-variant/40">Hits per day</span>
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
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
                  cursor={{ fill: 'rgba(var(--primary), 0.05)', radius: 10 }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255,255,255,0.9)', 
                    backdropFilter: 'blur(10px)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="var(--primary)" 
                  radius={[8, 8, 8, 8]}
                  fillOpacity={0.6}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

        {/* Summary Metric */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between bg-primary p-8 rounded-[2.5rem] shadow-2xl shadow-primary/20 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-1 block">Weekly Average</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-headline font-black">{weeklyAverage}</span>
              <span className="text-[10px] px-2 py-1 bg-white/20 rounded-lg font-black uppercase tracking-widest">Live</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-5xl relative z-10 opacity-40">equalizer</span>
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        </motion.div>
      </main>
    </div>
  );
}
