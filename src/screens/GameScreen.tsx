import AppIcon from '../components/AppIcon';
import { motion } from 'motion/react';
import ProfileAvatarMenu from '../components/ProfileAvatarMenu';
import { getCurrentUserId } from '../services/session';
import { Screen } from '../types';
import { AppLanguage, tr } from '../i18n';

export default function GameScreen({ onNavigate, language }: { onNavigate: (screen: Screen) => void; language: AppLanguage }) {
  const userId = getCurrentUserId();

  return (
    <div className="h-screen flex flex-col overflow-hidden relative z-10">
      <header className="bg-[#f7fbff]/80 backdrop-blur-2xl border-b border-[#d8e5f0]/70 shrink-0">
        <div className="flex items-center justify-between px-8 py-2 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-primary font-headline tracking-tight">PuffSqueeze</h1>
          </div>
          <ProfileAvatarMenu userId={userId} sizeClassName="w-8 h-8" language={language} />
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-hidden px-6 md:px-8 max-w-7xl mx-auto w-full pt-6 pb-6">
        <section className="mb-8 shrink-0">
          <h2 className="text-3xl sm:text-4xl font-serif text-on-surface tracking-tight">{tr(language, 'Little moments of calm', '给心情一点轻松时光')}</h2>
          <p className="mt-2 text-sm text-on-surface-variant">{tr(language, 'Choose something gentle to do, at your own pace.', '挑一个轻松的小活动，按自己的节奏开始。')}</p>
        </section>

        <section className="flex-1 overflow-y-auto pb-20 flex items-start">
          <div className="grid w-full grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 items-center">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('fishing')}
            className="w-full aspect-[4/3] min-h-[190px] relative overflow-hidden bg-[#edf6fb] rounded-[1.8rem] border border-white/80 flex flex-col items-center justify-center gap-4 group shadow-[0_14px_36px_rgba(57,92,120,0.08)]"
          >
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-[#b8dbe8]/55 rounded-t-[40%]" />
            <div className="relative w-20 h-20 rounded-3xl bg-white/70 flex items-center justify-center group-hover:-translate-y-1 transition-transform">
              <AppIcon className="app-icon text-4xl text-[#83a8c0]">phishing</AppIcon>
            </div>
            <div className="relative text-center px-2">
              <p className="font-bold text-on-surface text-sm">{tr(language, 'Quiet Cove', '慢慢钓鱼')}</p>
              <p className="text-xs text-primary/80 mt-1">{tr(language, 'A little fishing break', '和动物伙伴在水边待一会儿')}</p>
              <span className="block mt-2 text-[11px] font-medium text-primary/70">{tr(language, 'Hold to lower · Release to reel', '握住下钩 · 松开收钩')}</span>
            </div>
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('aviator')}
            className="w-full aspect-[4/3] min-h-[190px] relative overflow-hidden bg-[#e8f5fc] rounded-[1.8rem] border border-white/80 flex flex-col items-center justify-center gap-4 group shadow-[0_14px_36px_rgba(57,92,120,0.08)]"
          >
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-[#b7dedf]/50 rounded-t-[50%]" />
            <div className="relative w-20 h-20 rounded-3xl bg-white/70 flex items-center justify-center group-hover:-translate-y-1 transition-transform">
              <AppIcon className="app-icon text-4xl text-[#d38272]">flight</AppIcon>
            </div>
            <div className="relative text-center px-2">
              <p className="font-bold text-on-surface text-sm">The Aviator</p>
              <p className="text-xs text-primary/80 mt-1">{tr(language, 'A flight over the sea', '海上飞行')}</p>
              <span className="block mt-2 text-[11px] font-medium text-primary/70">{tr(language, '← Rise · → Descend', '← 上升 · → 下降')}</span>
            </div>
          </motion.button>



          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('puff-zen')}
            className="w-full aspect-[4/3] min-h-[190px] bg-white/65 backdrop-blur-xl rounded-[1.8rem] border border-white/80 flex flex-col items-center justify-center gap-4 cursor-pointer group shadow-[0_14px_36px_rgba(57,72,61,0.07)]"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all shadow-inner">
              <AppIcon className="app-icon text-4xl text-primary group-hover:text-primary group-hover:scale-110 transition-all">bubble_chart</AppIcon>
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
            className="w-full aspect-[4/3] min-h-[190px] bg-white/65 backdrop-blur-xl rounded-[1.8rem] border border-white/80 flex flex-col items-center justify-center gap-4 cursor-pointer group shadow-[0_14px_36px_rgba(57,72,61,0.07)]"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all shadow-inner">
              <AppIcon className="app-icon text-4xl text-primary group-hover:text-primary group-hover:scale-110 transition-all">touch_app</AppIcon>
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface text-sm">{tr(language, 'Mood check-in', '心情小问答')}</p>
              <span className="text-[9px] font-black text-secondary/60 uppercase tracking-[0.2em]">{tr(language, 'Reserved', '预留')}</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('treehole-poetry')}
            className="w-full aspect-[4/3] min-h-[190px] bg-white/65 backdrop-blur-xl rounded-[1.8rem] border border-white/80 flex flex-col items-center justify-center gap-4 cursor-pointer group shadow-[0_14px_36px_rgba(57,72,61,0.07)]"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all shadow-inner">
              <AppIcon className="app-icon text-4xl text-primary group-hover:text-primary group-hover:scale-110 transition-all">auto_stories</AppIcon>
            </div>
            <div className="text-center">
              <p className="font-bold text-on-surface text-sm">{tr(language, 'A note to the quiet tree', '写给树洞的一句话')}</p>
              <span className="text-[9px] font-black text-cyan-700/80 uppercase tracking-[0.2em]">
                {tr(language, 'Write a little note', '写下此刻心情')}
              </span>
            </div>
          </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
