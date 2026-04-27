import { motion } from 'motion/react';

export default function PuffZenScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen w-screen bg-black flex flex-col relative z-20">
      <header className="h-14 shrink-0 bg-black/70 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <span className="text-white font-bold tracking-wide">Puff Zen</span>
        </div>
        <motion.a
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          href="/games/puff-zen/index.html"
          target="_blank"
          rel="noreferrer"
          className="text-xs px-3 py-1.5 rounded-full border border-white/30 text-white/90"
        >
          Open New Tab
        </motion.a>
      </header>

      <main className="flex-1 bg-black">
        <iframe
          title="Puff Zen Game"
          src="/games/puff-zen/index.html"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
        />
      </main>
    </div>
  );
}

