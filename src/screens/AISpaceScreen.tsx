import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getChatResponse } from '../services/geminiService';
import { Message } from '../types';
import { getAiReport, getDashboard } from '../services/backendService';
import { getCurrentUserId } from '../services/session';
import ProfileAvatarMenu from '../components/ProfileAvatarMenu';

export default function AISpaceScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome back to your Sanctuary. I've been reflecting on your morning activity in the 'Home' space. You've spent 20 minutes in focused meditation but your heart rate variability was slightly lower than usual. How are you feeling in this moment?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');
  const [metrics, setMetrics] = useState<{ todaySqueezes: number; currentStress: number; weeklyAverage: number }>({
    todaySqueezes: 0,
    currentStress: 0,
    weeklyAverage: 0,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = getCurrentUserId();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const d = await getDashboard(userId);
        setMetrics({
          todaySqueezes: d.today_squeezes,
          currentStress: d.current_stress,
          weeklyAverage: d.weekly_average_squeezes,
        });
      } catch {
        // keep graceful fallback values
      }
    };
    loadMetrics();
  }, [userId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }]
      }));

      const strikeLevel =
        metrics.currentStress >= 75 ? 'high' : metrics.currentStress >= 50 ? 'medium' : 'low';

      const response = await getChatResponse(input, history, {
        userId,
        strikeLevel,
        deviceData: {
          today_squeezes: metrics.todaySqueezes,
          current_stress: metrics.currentStress,
          weekly_average_squeezes: metrics.weeklyAverage,
        },
      });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || "I'm having trouble connecting right now. Please check your connection or API key.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReport = async () => {
    setIsReportOpen(true);
    setIsReportLoading(true);
    setReportError('');
    try {
      const report = await getAiReport(userId);
      setReportText(report);
    } catch (error: any) {
      setReportText('');
      setReportError(error?.message || 'Failed to generate report');
    } finally {
      setIsReportLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative z-10">
      <header className="bg-white/10 backdrop-blur-2xl border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between px-8 py-2 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">waves</span>
            <h1 className="text-xl font-bold text-primary font-headline tracking-tight">PuffSqueeze AI</h1>
          </div>
          <ProfileAvatarMenu userId={userId} sizeClassName="w-8 h-8" />
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-hidden px-4 md:px-8 max-w-4xl mx-auto w-full pt-6">
        <section className="mb-8 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="max-w-xl">
              <h2 className="text-4xl font-serif italic text-on-surface tracking-tight">AI Companion</h2>
              <p className="text-on-surface-variant text-sm font-medium leading-relaxed mt-1">Your digital garden for reflection.</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void handleOpenReport()}
              className="group relative px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-black rounded-full shadow-xl shadow-primary/20 flex items-center gap-2 text-xs shrink-0"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
              <span>Report</span>
            </motion.button>
          </div>
        </section>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-6" ref={scrollRef}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.6, 
                  ease: [0.22, 1, 0.36, 1], // Custom calm cubic-bezier
                  scale: { type: "spring", stiffness: 100, damping: 15 }
                }}
                whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                className={`flex flex-col ${msg.role === 'assistant' ? 'items-start' : 'items-end'} gap-2 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'ml-auto' : ''}`}
              >
                <div className="flex items-center gap-2 mb-0.5 px-3">
                  {msg.role === 'assistant' && (
                    <motion.span 
                      initial={{ rotate: -10 }}
                      animate={{ rotate: 0 }}
                      className="material-symbols-outlined text-primary text-xs" 
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      psychology
                    </motion.span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                    {msg.role === 'assistant' ? 'Healing AI' : 'You'}
                  </span>
                </div>
                <motion.div 
                  layout
                  className={`p-5 rounded-[2rem] leading-relaxed shadow-sm text-[15px] transition-all duration-300 border border-white/20 ${
                    msg.role === 'assistant' 
                      ? 'rounded-tl-none bg-white/60 backdrop-blur-md text-on-surface hover:bg-white/80' 
                      : 'rounded-tr-none bg-primary text-on-primary shadow-lg shadow-primary/10 hover:bg-primary/90'
                  }`}
                >
                  {msg.content}
                </motion.div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex items-center gap-2 px-6"
              >
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Input Area - Now part of the flex flow to prevent overlap */}
        <div className="shrink-0 pt-4 pb-32">
          <div className="max-w-2xl mx-auto bg-white/40 backdrop-blur-2xl p-2 rounded-full shadow-2xl border border-white/30 flex items-center gap-3">
            <button className="w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white/50 transition-all">
              <span className="material-symbols-outlined text-2xl">add_circle</span>
            </button>
            <input 
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/40 font-body text-base font-medium" 
              placeholder="Share what's on your mind..." 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={isLoading}
              className={`w-12 h-12 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/20 ${isLoading ? 'opacity-50' : ''}`}
            >
              <span className="material-symbols-outlined text-2xl">send</span>
            </motion.button>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isReportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-w-2xl max-h-[82vh] overflow-hidden rounded-3xl bg-white/95 border border-white/50 shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">insights</span>
                  <h3 className="text-lg font-black text-on-surface">AI Companion Report</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-black/5 text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[65vh]">
                {isReportLoading && (
                  <p className="text-sm text-on-surface-variant">Generating your latest report...</p>
                )}
                {!isReportLoading && reportError && (
                  <p className="text-sm text-red-600">{reportError}</p>
                )}
                {!isReportLoading && !reportError && (
                  <div className="whitespace-pre-wrap text-sm leading-7 text-on-surface">{reportText}</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
