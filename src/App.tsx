import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import AISpaceScreen from './screens/AISpaceScreen';
import ConnectScreen from './screens/ConnectScreen';
import GameScreen from './screens/GameScreen';
import PuffZenScreen from './screens/PuffZenScreen';
import MindfulCareScreen from './screens/MindfulCareScreen';
import StatsScreen from './screens/StatsScreen';
import StressIndexScreen from './screens/StressIndexScreen';
import StressQuestionnaireScreen from './screens/StressQuestionnaireScreen';
import TreeholePoetryScreen from './screens/TreeholePoetryScreen';
import BottomNav from './components/BottomNav';
import { Screen } from './types';
import { clearCurrentUserId, hasCurrentUserId } from './services/session';
import { AppLanguage } from './i18n';

const SCREEN_KEY = 'puffsqueeze_current_screen';
const LANG_KEY = 'puffsqueeze_language';

function isValidScreen(value: string | null): value is Screen {
  return value === 'auth'
    || value === 'home'
    || value === 'ai-space'
    || value === 'connect'
    || value === 'game'
    || value === 'puff-zen'
    || value === 'mindful-care'
    || value === 'vitals-check'
    || value === 'stats'
    || value === 'stress-index'
    || value === 'stress-questionnaire'
    || value === 'treehole-poetry';
}

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'zh' ? 'zh' : 'en';
  });
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem(SCREEN_KEY);
    const loggedIn = hasCurrentUserId();
    if (loggedIn && isValidScreen(saved) && saved !== 'auth') {
      return saved;
    }
    return loggedIn ? 'home' : 'auth';
  });

  useEffect(() => {
    localStorage.setItem(SCREEN_KEY, currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
  }, [language]);

  const handleLogin = () => {
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    clearCurrentUserId();
    localStorage.removeItem(SCREEN_KEY);
    setCurrentScreen('auth');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Global Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none atmosphere-bg" />
      
      <AnimatePresence mode="wait">
        <motion.main
          key={currentScreen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="flex-grow"
        >
          {currentScreen === 'auth' && <AuthScreen onLogin={handleLogin} language={language} />}
          {currentScreen === 'home' && <HomeScreen onNavigate={setCurrentScreen} onLogout={handleLogout} language={language} />}
          {currentScreen === 'game' && <GameScreen onNavigate={setCurrentScreen} language={language} />}
          {currentScreen === 'puff-zen' && <PuffZenScreen onBack={() => setCurrentScreen('game')} language={language} />}
          {currentScreen === 'mindful-care' && <MindfulCareScreen onBack={() => setCurrentScreen('home')} language={language} />}
          {currentScreen === 'ai-space' && <AISpaceScreen language={language} />}
          {currentScreen === 'connect' && <ConnectScreen language={language} />}
          {currentScreen === 'stats' && <StatsScreen onBack={() => setCurrentScreen('home')} language={language} />}
          {currentScreen === 'stress-index' && <StressIndexScreen onBack={() => setCurrentScreen('home')} language={language} />}
          {currentScreen === 'stress-questionnaire' && <StressQuestionnaireScreen onBack={() => setCurrentScreen('game')} onNavigate={setCurrentScreen} language={language} />}
          {currentScreen === 'treehole-poetry' && <TreeholePoetryScreen onBack={() => setCurrentScreen('game')} language={language} />}
        </motion.main>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setLanguage((prev) => (prev === 'en' ? 'zh' : 'en'))}
        className="fixed top-4 right-4 z-[130] px-4 py-2 rounded-full bg-white/85 backdrop-blur border border-primary/20 text-primary text-xs font-black"
      >
        {language === 'en' ? 'English' : '中文'}
      </button>

      {currentScreen !== 'auth' && 
       currentScreen !== 'mindful-care' &&
       currentScreen !== 'puff-zen' &&
       currentScreen !== 'stress-questionnaire' &&
       currentScreen !== 'treehole-poetry' && (
        <BottomNav 
          activeScreen={currentScreen} 
          onNavigate={setCurrentScreen}
          language={language}
        />
      )}
    </div>
  );
}
