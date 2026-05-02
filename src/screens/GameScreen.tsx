import { motion } from 'motion/react';
import ProfileAvatarMenu from '../components/ProfileAvatarMenu';
import { getCurrentUserId } from '../services/session';
import { Screen } from '../types';
import { AppLanguage, tr } from '../i18n';

export default function GameScreen({ onNavigate, language }: { onNavigate: (screen: Screen) => void; language: AppLanguage }) {
  const userId = getCurrentUserId();

  return (
    <div className="h-screen flex flex-col overflow-hidden relative z-10">
      <header className="bg-white/10 backdrop-blur-2xl border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between px-8 py-2 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">waves</span>
            <h1 className="text-xl font-bold text-primary font-headline tracking-tight">PuffSqueeze AI</h1>
          </div>
          <ProfileAvatarMenu userId={userId} sizeClassName="w-8 h-8" language={language} />
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-hidden px-6 md:px-8 max-w-7xl mx-auto w-full pt-6 pb-6">
        <section className="mb-8 shrink-0">
          <h2 className="text-4xl font-serif italic text-on-surface tracking-tight">{tr(language, 'Game Center', '游戏中心')}</h2>
        </section>

        <section className="flex-1 overflow-hidden flex items-center -mt-8">
          <div className="grid w-full grid-cols-3 gap-6 items-center">
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('puff-zen')}
            className="w-full aspect-square bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/30 flex flex-col items-center justify-center gap-4 cursor-pointer group shadow-xl shadow-black/5"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all shadow-inner">
              <span className="material-symbols-outlined text-4xl text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all">bubble_chart</span>
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface text-sm">Puff Zen</p>
              <span className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em]">{tr(language, 'Play Now', '开始游戏')}</span>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('stress-questionnaire')}
            className="w-full aspect-square bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/30 flex flex-col items-center justify-center gap-4 cursor-pointer group shadow-xl shadow-black/5"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all shadow-inner">
              <span className="material-symbols-outlined text-4xl text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all">touch_app</span>
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface text-sm">Stress Questionnaire</p>
              <span className="text-[9px] font-black text-secondary/60 uppercase tracking-[0.2em]">{tr(language, 'Reserved', '预留')}</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('treehole-poetry')}
            className="w-full aspect-square bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/30 flex flex-col items-center justify-center gap-4 cursor-pointer group shadow-xl shadow-black/5"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all shadow-inner">
              <span className="material-symbols-outlined text-4xl text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all">auto_stories</span>
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface text-sm">Tree-hole Poetry</p>
              <span className="text-[9px] font-black text-cyan-700/80 uppercase tracking-[0.2em]">
                {tr(language, 'Write Now', 'Write Now')}
              </span>
            </div>
          </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
