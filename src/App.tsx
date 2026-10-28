import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import AISpaceScreen from './screens/AISpaceScreen';
import ConnectScreen from './screens/ConnectScreen';
import GameScreen from './screens/GameScreen';
import PuffZenScreen from './screens/PuffZenScreen';
import AviatorScreen from './screens/AviatorScreen';
import FishingScreen from './screens/FishingScreen';
import MindfulCareScreen from './screens/MindfulCareScreen';
import StatsScreen from './screens/StatsScreen';
import StressIndexScreen from './screens/StressIndexScreen';
import StressQuestionnaireScreen from './screens/StressQuestionnaireScreen';
import TreeholePoetryScreen from './screens/TreeholePoetryScreen';
import BottomNav from './components/BottomNav';
import FloatingCompanion from './components/FloatingCompanion';
import AccountSyncStatus from './components/AccountSyncStatus';
import { startAccountSync, recordActivity } from './services/accountSync';
import { Screen } from './types';
import { clearCurrentUserId, hasCurrentUserId, getCurrentUserId } from './services/session';
import { AppLanguage } from './i18n';
import { GameControllerProvider } from './services/gameController';

const SCREEN_KEY = 'puffsqueeze_current_screen';
const LANG_KEY = 'puffsqueeze_language';

function isValidScreen(value: string | null): value is Screen {
  return value === 'auth'
    || value === 'home'
    || value === 'ai-space'
    || value === 'connect'
    || value === 'game'
    || value === 'puff-zen'
    || value === 'aviator'
    || value === 'fishing'
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
  const userId = currentScreen === 'auth' ? 0 : getCurrentUserId();
  const [readyUser, setReadyUser] = useState(0);
  const [syncRevision, setSyncRevision] = useState(0);
  useEffect(() => {
    if (!userId) { setReadyUser(0); return; }
    let alive = true;
    const sync = startAccountSync(userId);
    void sync.ready.finally(() => { if (alive) setReadyUser(userId); });
    return () => { alive = false; sync.stop(); };
  }, [userId, syncRevision]);
  useEffect(() => {
    const expired = () => { clearCurrentUserId(); setCurrentScreen('auth'); };
    const storage = (event: StorageEvent) => {
      if (event.key === 'puffsqueeze_user_id' || event.key === null || event.key === `puffsqueeze_care_token_${getCurrentUserId()}`) {
        setReadyUser(0); setSyncRevision(value => value + 1); setCurrentScreen(hasCurrentUserId() ? 'home' : 'auth');
      }
    };
    window.addEventListener('puffsqueeze:auth-expired', expired); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('puffsqueeze:auth-expired', expired); window.removeEventListener('storage', storage); };
  }, []);
  useEffect(() => {
    if (!userId || readyUser !== userId) return;
    const started = Date.now();
    recordActivity('page_enter', { screen: currentScreen }, userId);
    let ended = false;
    const finish = () => { if (!ended) { ended = true; recordActivity('page_leave', { screen: currentScreen, duration_sec: Math.round((Date.now() - started) / 1000) }, userId); } };
    window.addEventListener('pagehide', finish);
    return () => { finish(); window.removeEventListener('pagehide', finish); };
  }, [currentScreen, userId, readyUser]);

  useEffect(() => {
    // Recover if a removed screen remains in memory during a development hot update.
    if (!isValidScreen(currentScreen)) {
      setCurrentScreen(hasCurrentUserId() ? 'game' : 'auth');
      return;
    }
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

  const hasBottomNav = currentScreen !== 'auth'
    && currentScreen !== 'mindful-care'
    && currentScreen !== 'puff-zen'
    && currentScreen !== 'aviator'
    && currentScreen !== 'fishing'
    && currentScreen !== 'stress-questionnaire'
    && currentScreen !== 'treehole-poetry';

  if (userId > 0 && readyUser !== userId) return <div className="min-h-screen grid place-items-center bg-background text-primary text-sm" role="status">{language === 'zh' ? '正在读取你的记录……' : 'Loading your saved records…'}</div>;

  return (
    <GameControllerProvider key={userId} userId={userId}>
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Global Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none atmosphere-bg" />
      {userId > 0 && <AccountSyncStatus language={language} />}
      
      <AnimatePresence mode="wait">
        <motion.main
          key={currentScreen}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="flex-grow"
        >
          {currentScreen === 'auth' && <AuthScreen onLogin={handleLogin} language={language} />}
          {currentScreen === 'home' && <HomeScreen onNavigate={setCurrentScreen} onLogout={handleLogout} language={language} />}
          {currentScreen === 'game' && <GameScreen onNavigate={setCurrentScreen} language={language} />}
          {currentScreen === 'puff-zen' && <PuffZenScreen onBack={() => setCurrentScreen('game')} language={language} />}
          {currentScreen === 'aviator' && <AviatorScreen onBack={() => setCurrentScreen('game')} language={language} />}
          {currentScreen === 'fishing' && <FishingScreen onBack={() => setCurrentScreen('game')} language={language} />}
          {currentScreen === 'mindful-care' && <MindfulCareScreen onBack={() => setCurrentScreen('home')} language={language} />}
          {currentScreen === 'ai-space' && <AISpaceScreen language={language} />}
          {currentScreen === 'connect' && <ConnectScreen language={language} />}
          {currentScreen === 'stats' && <StatsScreen onBack={() => setCurrentScreen('home')} language={language} />}
          {currentScreen === 'stress-index' && <StressIndexScreen onBack={() => setCurrentScreen('home')} language={language} />}
          {currentScreen === 'stress-questionnaire' && <StressQuestionnaireScreen onBack={() => setCurrentScreen('game')} onNavigate={setCurrentScreen} language={language} />}
          {currentScreen === 'treehole-poetry' && <TreeholePoetryScreen onBack={() => setCurrentScreen('game')} language={language} />}
        </motion.main>
      </AnimatePresence>

      {currentScreen !== 'auth' && currentScreen !== 'home' && (
        <FloatingCompanion language={language} bottomSpace={currentScreen === 'fishing' ? 165 : hasBottomNav ? 104 : 20} />
      )}

      <button
        type="button"
        onClick={() => setLanguage((prev) => (prev === 'en' ? 'zh' : 'en'))}
        className="fixed top-4 right-20 z-[130] px-3 py-2 rounded-full bg-[#f7fbff]/90 backdrop-blur border border-primary/15 text-primary text-[11px] font-semibold shadow-sm"
      >
        {language === 'en' ? 'English' : '中文'}
      </button>

      {hasBottomNav && (
        <BottomNav 
          activeScreen={currentScreen} 
          onNavigate={setCurrentScreen}
          language={language}
        />
      )}
    </div>
    </GameControllerProvider>
  );
}
