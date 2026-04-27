import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { login, register } from '../services/backendService';
import { setCurrentUserId } from '../services/session';

interface AuthScreenProps {
  onLogin: () => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const submit = async () => {
    if (!email.trim() || !password.trim() || (isRegisterMode && !displayName.trim())) {
      setError('Please fill all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const user = isRegisterMode
        ? await register(email.trim(), displayName.trim(), password)
        : await login(email.trim(), password);
      setCurrentUserId(user.id);
      onLogin();
    } catch (e: any) {
      setError(e?.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute top-0 bottom-0 left-0 right-0 z-50 flex flex-col bg-background overflow-hidden overscroll-none">
      <header className="flex-none p-5 md:p-8 w-full flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl sm:text-3xl">waves</span>
          <span className="text-xl sm:text-2xl font-bold text-primary tracking-tight font-headline">PuffSqueeze AI</span>
        </div>
      </header>

      <main className="flex-1 w-full flex items-start justify-center p-4 min-h-0 pt-6 sm:pt-12 md:pt-20 lg:pt-28">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          <section className="flex-none text-center md:text-left">
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="font-headline text-[32px] sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-on-surface tracking-tight leading-tight"
            >
              Ready to <br className="hidden md:block" />release and <span className="text-primary italic">Squeeze?</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-on-surface-variant text-xs md:text-sm mt-3 md:mt-4 leading-relaxed max-w-[280px] sm:max-w-xs mx-auto md:mx-0"
            >
              Your sanctuary is waiting. Connect with Bode and start your PuffSqueeze session.
            </motion.p>
          </section>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full max-w-[320px] sm:max-w-[360px] flex-none bg-surface-container-lowest rounded-2xl p-5 sm:p-6 editorial-shadow relative shrink-0"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-container rounded-full opacity-20 blur-2xl pointer-events-none"></div>

            <form
              className="space-y-4 relative z-10 w-full flex flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                if (!isSubmitting) {
                  void submit();
                }
              }}
            >
              <div className="space-y-3">
                {isRegisterMode && (
                  <div className="space-y-1">
                    <label className="font-body text-[10px] font-bold text-on-surface-variant ml-1 uppercase tracking-wider">Name</label>
                    <input
                      className="w-full bg-surface-container-low border border-transparent focus:border-primary/20 rounded-xl py-2.5 px-4 focus:ring-0 focus:bg-surface-container-lowest liquid-motion outline-none text-on-surface placeholder:text-outline/40 text-sm"
                      placeholder="Your name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-body text-[10px] font-bold text-on-surface-variant ml-1 uppercase tracking-wider">Email</label>
                  <div className="relative group">
                    <input
                      className="w-full bg-surface-container-low border border-transparent focus:border-primary/20 rounded-xl py-2.5 px-4 focus:ring-0 focus:bg-surface-container-lowest liquid-motion outline-none text-on-surface placeholder:text-outline/40 text-sm"
                      placeholder="hello@sanctuary.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">mail</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="font-body text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Password</label>
                  </div>
                  <div className="relative group">
                    <input
                      className="w-full bg-surface-container-low border border-transparent focus:border-primary/20 rounded-xl py-2.5 px-4 focus:ring-0 focus:bg-surface-container-lowest liquid-motion outline-none text-on-surface placeholder:text-outline/40 text-sm"
                      placeholder="Enter password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">lock_open</span>
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 px-1">{error}</p>}

              <div className="space-y-3 pt-1">
                <button
                  className="w-full py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-sm liquid-motion hover:scale-[1.02] shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5 disabled:opacity-60"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Please wait...' : isRegisterMode ? 'Create Account' : 'Enter Sanctuary'}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                <div className="relative flex items-center justify-center py-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant/20"></div>
                  </div>
                  <span className="relative bg-surface-container-lowest px-2 text-[9px] font-bold text-outline uppercase">Or</span>
                </div>

                <button
                  className="w-full py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-headline font-bold text-[11px] liquid-motion hover:bg-surface-variant"
                  type="button"
                  onClick={() => {
                    setIsRegisterMode((prev) => !prev);
                    setError('');
                  }}
                >
                  {isRegisterMode ? 'Already have account? Login' : 'Create account'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

