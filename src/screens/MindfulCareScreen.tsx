import { motion } from 'motion/react';
import { useState } from 'react';

export default function MindfulCareScreen({ onBack }: { onBack: () => void }) {
  const [happiness, setHappiness] = useState(85);

  const routines = [
    { id: 1, title: 'Gentle Stroke', icon: 'back_hand', desc: 'Soothe the bird with soft touches.', energy: '+5' },
    { id: 2, title: 'Deep Breathing', icon: 'air', desc: 'Sync your breath with the bird.', energy: '+15' },
    { id: 3, title: 'Feeding Time', icon: 'eco', desc: 'Provide organic digital seeds.', energy: '+10' },
  ];

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
              onClick={() => setHappiness(prev => Math.min(100, prev + parseInt(item.energy)))}
              className="w-full bg-white/30 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-sm flex items-center gap-8 text-left transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <span className="material-symbols-outlined text-3xl">{item.icon}</span>
              </div>
              <div className="flex-grow">
                <h4 className="font-headline font-bold text-lg text-on-surface mb-1">{item.title}</h4>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">{item.desc}</p>
              </div>
              <div className="text-primary font-black text-sm">{item.energy}</div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
