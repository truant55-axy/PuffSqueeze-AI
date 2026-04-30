import { motion } from 'motion/react';
import { Screen } from '../types';
import { AppLanguage, tr } from '../i18n';

interface BottomNavProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  language: AppLanguage;
}

export default function BottomNav({ activeScreen, onNavigate, language }: BottomNavProps) {
  const navItems: { id: Screen; label: string; icon: string }[] = [
    { id: 'home', label: tr(language, 'Home', '主页'), icon: 'home_max' },
    { id: 'game', label: tr(language, 'Game', '游戏'), icon: 'sports_esports' },
    { id: 'ai-space', label: tr(language, 'AI Companion', 'AI陪伴'), icon: 'psychology' },
    { id: 'connect', label: tr(language, 'Connect', '动态'), icon: 'groups' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-4 pt-2 bg-background/90 backdrop-blur-lg rounded-t-[2rem] shadow-[0_-12px_40px_rgba(49,51,46,0.04)] z-50 border-t border-outline-variant/10">
      {navItems.map((item) => {
        const isActive = activeScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center transition-all duration-500 font-body text-xs font-semibold relative px-6 py-2 rounded-full ${
              isActive 
                ? 'text-primary bg-primary-container/30 scale-105' 
                : 'text-outline hover:text-primary'
            }`}
          >
            <span 
              className={`material-symbols-outlined mb-1 transition-all duration-500 ${isActive ? 'fill-1' : ''}`}
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-primary-container/20 rounded-full -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
