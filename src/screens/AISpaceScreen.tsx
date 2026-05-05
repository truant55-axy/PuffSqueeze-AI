import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getChatResponse } from '../services/geminiService';
import { ChatAttachment, Message } from '../types';
import { getAiReport, getDashboard } from '../services/backendService';
import { getCurrentUserId } from '../services/session';
import ProfileAvatarMenu from '../components/ProfileAvatarMenu';
import { AppLanguage, tr } from '../i18n';

export default function AISpaceScreen({ language }: { language: AppLanguage }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: tr(
        language,
        "Welcome back. I can help you reflect and calm down. What's on your mind right now?",
        '欢迎回来。我可以陪你梳理情绪、放松身心。你现在最想聊什么？'
      ),
      timestamp: new Date(),
    },
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
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        // graceful fallback
      }
    };
    void loadMetrics();
  }, [userId]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readFileAsAttachment = (file: File): Promise<ChatAttachment> =>
    new Promise((resolve, reject) => {
      const baseAttachment = {
        id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: file.type || 'unknown',
        size: file.size,
      };

      if (!file.type.startsWith('image/')) {
        resolve(baseAttachment);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve({ ...baseAttachment, dataUrl: String(reader.result || '') });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    const maxFiles = 5;
    const selectedFiles = Array.from(files).slice(0, maxFiles);
    const nextAttachments = await Promise.all(selectedFiles.map(readFileAsAttachment));
    setAttachments((prev) => [...prev, ...nextAttachments].slice(0, maxFiles));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const messageText = input.trim();
    const outgoingAttachments = attachments;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText || tr(language, 'Sent an attachment.', '发送了一个附件。'),
      timestamp: new Date(),
      attachments: outgoingAttachments,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);
    try {
      const history = messages.map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      }));
      const strikeLevel = metrics.currentStress >= 75 ? 'high' : metrics.currentStress >= 50 ? 'medium' : 'low';
      const attachmentSummary =
        outgoingAttachments.length > 0
          ? `\nAttached files: ${outgoingAttachments
              .map((attachment) => `${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})`)
              .join('; ')}`
          : '';
      const localizedInput =
        language === 'zh'
          ? `Please reply in natural Chinese without markdown symbols. User message: ${messageText || 'User sent attachments.'}${attachmentSummary}`
          : `Please reply in natural English without markdown symbols. User message: ${messageText || 'User sent attachments.'}${attachmentSummary}`;
      const response = await getChatResponse(localizedInput, history, {
        userId,
        strikeLevel,
        deviceData: {
          today_squeezes: metrics.todaySqueezes,
          current_stress: metrics.currentStress,
          weekly_average_squeezes: metrics.weeklyAverage,
        },
      });
      setMessages((prev) => [...prev, { id: `${Date.now()}-ai`, role: 'assistant', content: response, timestamp: new Date() }]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: 'assistant',
          content: error?.message || tr(language, 'AI request failed.', 'AI 请求失败。'),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReport = async () => {
    setIsReportOpen(true);
    setIsReportLoading(true);
    setReportError('');
    try {
      const report = await getAiReport(userId, language);
      setReportText(report);
    } catch (error: any) {
      setReportText('');
      setReportError(error?.message || tr(language, 'Failed to generate report', '生成报告失败'));
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
          <ProfileAvatarMenu userId={userId} sizeClassName="w-8 h-8" language={language} />
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-hidden px-4 md:px-8 max-w-4xl mx-auto w-full pt-6">
        <section className="mb-8 shrink-0 flex items-center justify-between">
          <div className="max-w-xl">
            <h2 className="text-4xl font-serif italic text-on-surface tracking-tight">{tr(language, 'AI Companion', 'AI陪伴')}</h2>
            <p className="text-on-surface-variant text-sm font-medium leading-relaxed mt-1">{tr(language, 'Your digital garden for reflection.', '你的数字疗愈花园。')}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => void handleOpenReport()}
            className="group relative px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-black rounded-full shadow-xl shadow-primary/20 flex items-center gap-2 text-xs shrink-0"
          >
            <span className="material-symbols-outlined text-sm">analytics</span>
            <span>{tr(language, 'Report', '报告')}</span>
          </motion.button>
        </section>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-6" ref={scrollRef}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col ${msg.role === 'assistant' ? 'items-start' : 'items-end'} gap-2 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'ml-auto' : ''}`}
              >
                <div className="flex items-center gap-2 mb-0.5 px-3">
                  {msg.role === 'assistant' && <span className="material-symbols-outlined text-primary text-xs">psychology</span>}
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                    {msg.role === 'assistant' ? 'Healing AI' : tr(language, 'You', '你')}
                  </span>
                </div>
                <div
                  className={`p-5 rounded-[2rem] leading-relaxed shadow-sm text-[15px] border border-white/20 ${
                    msg.role === 'assistant' ? 'rounded-tl-none bg-white/60 backdrop-blur-md text-on-surface' : 'rounded-tr-none bg-primary text-on-primary'
                  }`}
                >
                  <div>{msg.content}</div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-4 grid gap-3">
                      {msg.attachments.map((attachment) =>
                        attachment.dataUrl ? (
                          <img
                            key={attachment.id}
                            src={attachment.dataUrl}
                            alt={attachment.name}
                            className="max-h-64 w-full rounded-2xl object-cover border border-white/30"
                          />
                        ) : (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-3 rounded-2xl bg-white/20 border border-white/30 px-4 py-3"
                          >
                            <span className="material-symbols-outlined text-xl">description</span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{attachment.name}</p>
                              <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-6">
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="shrink-0 pt-4 pb-32">
          <div className="max-w-2xl mx-auto bg-white/40 backdrop-blur-2xl p-2 rounded-[2rem] shadow-2xl border border-white/30">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void handleFilesSelected(e.target.files)}
            />

            {attachments.length > 0 && (
              <div className="px-3 pt-3 pb-2 grid gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-2xl bg-white/45 border border-white/40 p-2"
                  >
                    {attachment.dataUrl ? (
                      <img src={attachment.dataUrl} alt={attachment.name} className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">description</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-on-surface">{attachment.name}</p>
                      <p className="text-xs text-on-surface-variant">{formatFileSize(attachment.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="h-8 w-8 rounded-full hover:bg-white/60 text-on-surface-variant flex items-center justify-center"
                      aria-label={tr(language, 'Remove attachment', '移除附件')}
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white/50 transition-all"
                aria-label={tr(language, 'Upload photo or file', '上传照片或文件')}
              >
                <span className="material-symbols-outlined text-2xl">add_circle</span>
              </button>
            <input
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/40 font-body text-base font-medium"
              placeholder={tr(language, "Share what's on your mind...", '说说你现在在想什么...')}
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
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={isLoading || (!input.trim() && attachments.length === 0)} className={`w-12 h-12 flex items-center justify-center rounded-full bg-primary text-on-primary ${isLoading || (!input.trim() && attachments.length === 0) ? 'opacity-50' : ''}`}>
              <span className="material-symbols-outlined text-2xl">send</span>
            </motion.button>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isReportOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className="w-full max-w-2xl max-h-[82vh] overflow-hidden rounded-3xl bg-white/95 border border-white/50 shadow-2xl">
              <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">insights</span>
                  <h3 className="text-lg font-black text-on-surface">{tr(language, 'AI Companion Report', 'AI陪伴报告')}</h3>
                </div>
                <button type="button" onClick={() => setIsReportOpen(false)} className="w-8 h-8 rounded-full hover:bg-black/5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[65vh]">
                {isReportLoading && <p className="text-sm text-on-surface-variant">{tr(language, 'Generating your latest report...', '正在生成你的最新报告...')}</p>}
                {!isReportLoading && reportError && <p className="text-sm text-red-600">{reportError}</p>}
                {!isReportLoading && !reportError && <div className="whitespace-pre-wrap text-sm leading-7 text-on-surface">{reportText}</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
