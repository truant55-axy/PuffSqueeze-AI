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
import BottomNav from './components/BottomNav';
import { Screen } from './types';
import { clearCurrentUserId, hasCurrentUserId } from './services/session';

const SCREEN_KEY = 'puffsqueeze_current_screen';

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
    || value === 'stress-index';
}

export default function App() {
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
          {currentScreen === 'auth' && <AuthScreen onLogin={handleLogin} />}
          {currentScreen === 'home' && <HomeScreen onNavigate={setCurrentScreen} onLogout={handleLogout} />}
          {currentScreen === 'game' && <GameScreen onNavigate={setCurrentScreen} />}
          {currentScreen === 'puff-zen' && <PuffZenScreen onBack={() => setCurrentScreen('game')} />}
          {currentScreen === 'mindful-care' && <MindfulCareScreen onBack={() => setCurrentScreen('home')} />}
          {currentScreen === 'ai-space' && <AISpaceScreen />}
          {currentScreen === 'connect' && <ConnectScreen />}
          {currentScreen === 'stats' && <StatsScreen onBack={() => setCurrentScreen('home')} />}
          {currentScreen === 'stress-index' && <StressIndexScreen onBack={() => setCurrentScreen('home')} />}
        </motion.main>
      </AnimatePresence>

      {currentScreen !== 'auth' && 
       currentScreen !== 'mindful-care' &&
       currentScreen !== 'puff-zen' && (
        <BottomNav 
          activeScreen={currentScreen} 
          onNavigate={setCurrentScreen} 
        />
      )}
    </div>
  );
}
