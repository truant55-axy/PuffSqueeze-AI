import { MouseEvent, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLanguage, tr } from '../i18n';
import { Screen } from '../types';

type Option = { key: 'A' | 'B' | 'C'; zh: string; en: string; score: 1 | 2 | 3 };
type Question = { id: number; zh: string; en: string; options: [Option, Option, Option] };

const QUESTIONS: Question[] = [
  { id: 1, zh: '大海是如何死亡的？', en: 'How does the sea die?', options: [{ key: 'A', zh: '蒸发成云去流浪了', en: 'It evaporates into clouds and wanders away.', score: 1 }, { key: 'B', zh: '耗尽了所有的浪花', en: 'It runs out of all its waves.', score: 2 }, { key: 'C', zh: '溺死在秘密里', en: 'It drowns in its own secrets.', score: 3 }] },
  { id: 2, zh: '假如人鱼真实存在，你为什么没有成为它们？', en: "If mermaids are real, why didn't you become one?", options: [{ key: 'A', zh: '迷恋陆地的阳光', en: 'I fell in love with sunlight on land.', score: 1 }, { key: 'B', zh: '弄丢了海底的地图', en: 'I lost the map to the deep sea.', score: 2 }, { key: 'C', zh: '我的双脚太沉重了', en: 'My feet were too heavy.', score: 3 }] },
  { id: 3, zh: '如果凌晨有一种味道，你觉得是？', en: 'If dawn had a taste, what would it be?', options: [{ key: 'A', zh: '凉爽的薄荷', en: 'Cool mint.', score: 1 }, { key: 'B', zh: '无味的白开水', en: 'Plain boiled water.', score: 2 }, { key: 'C', zh: '烧焦的电路板', en: 'A burnt circuit board.', score: 3 }] },
  { id: 4, zh: '眼泪掉进杯子里，它会是什么颜色的？', en: 'If a tear falls into a cup, what color is it?', options: [{ key: 'A', zh: '像碎钻一样透明', en: 'Clear like crushed diamonds.', score: 1 }, { key: 'B', zh: '忧郁的深蓝色', en: 'A melancholy deep blue.', score: 2 }, { key: 'C', zh: '烫人的暗红色', en: 'A burning dark red.', score: 3 }] },
  { id: 5, zh: '如果你是一片云，此时你最想？', en: 'If you were a cloud, what would you do now?', options: [{ key: 'A', zh: '出彩虹', en: 'Make a rainbow.', score: 1 }, { key: 'B', zh: '随风飘走', en: 'Drift with the wind.', score: 2 }, { key: 'C', zh: '瞬间下一场暴雨', en: 'Drop a sudden storm.', score: 3 }] },
  { id: 6, zh: '明天是一个空白日，你的第一反应是？', en: 'Tomorrow is blank. Your first reaction?', options: [{ key: 'A', zh: '出去散步数树叶', en: 'Go out and count leaves.', score: 1 }, { key: 'B', zh: '睡一个世纪大觉', en: 'Sleep for a century.', score: 2 }, { key: 'C', zh: '感到莫名的恐慌', en: 'Feel an unexplainable panic.', score: 3 }] },
  { id: 7, zh: '如果你的心是一个房间，推开门你看到？', en: 'If your heart is a room, what do you see?', options: [{ key: 'A', zh: '满屋的彩色气泡', en: 'A room full of colorful bubbles.', score: 1 }, { key: 'B', zh: '堆满旧物的阁楼', en: 'An attic crowded with old stuff.', score: 2 }, { key: 'C', zh: '只有一盏忽明忽暗的灯', en: 'Only one flickering lamp.', score: 3 }] },
  { id: 8, zh: '假如世界没有了咖啡和茶，你会？', en: 'If coffee and tea vanish, you would?', options: [{ key: 'A', zh: '刚好尝试喝白开水', en: 'Try plain water for once.', score: 1 }, { key: 'B', zh: '寻找替代的化学能量', en: 'Search for chemical substitutes.', score: 2 }, { key: 'C', zh: '觉得世界末日提前了', en: 'Think the apocalypse came early.', score: 3 }] },
  { id: 9, zh: '如果能和10年后的自己通话，你会问？', en: 'If you could call yourself in 10 years, you would ask?', options: [{ key: 'A', zh: '我变聪明了吗？', en: 'Did I become wiser?', score: 1 }, { key: 'B', zh: '现在的烦恼解决了吗？', en: 'Did today’s worries get solved?', score: 2 }, { key: 'C', zh: '直接告诉我彩票号码', en: 'Just give me lottery numbers.', score: 3 }] },
  { id: 10, zh: '你觉得自己更像是一盏灯还是一个黑洞？', en: 'Are you more a lamp or a black hole?', options: [{ key: 'A', zh: '微弱但发光的灯', en: 'A faint but glowing lamp.', score: 1 }, { key: 'B', zh: '灰色的雾气', en: 'A gray mist.', score: 2 }, { key: 'C', zh: '吞噬一切的黑洞', en: 'A black hole that swallows all.', score: 3 }] },
  { id: 11, zh: '人本善还是人本恶？', en: 'Are humans born good or evil?', options: [{ key: 'A', zh: '本善，恶是灰尘', en: 'Good by nature; evil is dust.', score: 1 }, { key: 'B', zh: '都是生存本能', en: 'Both are survival instincts.', score: 2 }, { key: 'C', zh: '本恶，善是伪装', en: 'Evil by nature; good is disguise.', score: 3 }] },
  { id: 12, zh: '所有电子产品突然变成动物，手机会变成？', en: 'If devices became animals, your phone would be?', options: [{ key: 'A', zh: '粘人的猫', en: 'A clingy cat.', score: 1 }, { key: 'B', zh: '聒噪的乌鸦', en: 'A noisy crow.', score: 2 }, { key: 'C', zh: '盯着你的毒蛇', en: 'A snake staring at you.', score: 3 }] },
  { id: 13, zh: '如果你是一颗行星，你现在的状态是？', en: 'If you were a planet, your state would be?', options: [{ key: 'A', zh: '自转得很优雅', en: 'Spinning gracefully.', score: 1 }, { key: 'B', zh: '被陨石撞得鼻青脸肿', en: 'Bruised by meteors.', score: 2 }, { key: 'C', zh: '正在坍塌', en: 'Collapsing right now.', score: 3 }] },
  { id: 14, zh: '假如要去荒岛，只能带一样东西：', en: 'Going to an island with one item only:', options: [{ key: 'A', zh: '一本诗集', en: 'A poetry collection.', score: 1 }, { key: 'B', zh: '能召唤火锅的神灯', en: 'A magic hotpot lamp.', score: 2 }, { key: 'C', zh: '没什么想带的', en: 'Nothing to bring.', score: 3 }] },
  { id: 15, zh: '凌晨三点的收音机里在播什么？', en: 'What is on the radio at 3 AM?', options: [{ key: 'A', zh: '治愈的情歌', en: 'A healing love song.', score: 1 }, { key: 'B', zh: '嘈杂的白噪音', en: 'Noisy white noise.', score: 2 }, { key: 'C', zh: '无尽的叹息', en: 'Endless sighs.', score: 3 }] },
  { id: 16, zh: '如果你的压力是一个动物，它长得像？', en: 'If your stress were an animal, it looks like?', options: [{ key: 'A', zh: '轻飘飘的水母', en: 'A floating jellyfish.', score: 1 }, { key: 'B', zh: '背着壳的蜗牛', en: 'A snail with a shell.', score: 2 }, { key: 'C', zh: '巨大的长毛怪', en: 'A huge furry monster.', score: 3 }] },
  { id: 17, zh: '感到委屈时，你身体哪里最疼？', en: 'When you feel wronged, where hurts most?', options: [{ key: 'A', zh: '鼻子酸酸的', en: 'A sore nose.', score: 1 }, { key: 'B', zh: '肩膀很重', en: 'Heavy shoulders.', score: 2 }, { key: 'C', zh: '胸口像堵了石头', en: 'A stone on the chest.', score: 3 }] },
  { id: 18, zh: '如果影子离开你独立生活，它会去哪？', en: 'If your shadow could leave, where would it go?', options: [{ key: 'A', zh: '去草地上跳舞', en: 'Dance on a meadow.', score: 1 }, { key: 'B', zh: '躲在角落观察世界', en: 'Hide and watch the world.', score: 2 }, { key: 'C', zh: '彻底沉入黑暗', en: 'Sink fully into darkness.', score: 3 }] },
  { id: 19, zh: '面对还没开始的复杂作业，你现在的姿势是？', en: 'Facing a complex assignment not started yet, your posture is?', options: [{ key: 'A', zh: '挺拔坐着准备开始', en: 'Sit up and begin.', score: 1 }, { key: 'B', zh: '瘫在椅子上叹气', en: 'Slump and sigh.', score: 2 }, { key: 'C', zh: '像兵马俑一样僵硬', en: 'Stiff like a terracotta warrior.', score: 3 }] },
  { id: 20, zh: '如果大脑是浏览器，现在开了多少标签页？', en: 'If your brain is a browser, how many tabs are open?', options: [{ key: 'A', zh: '1个，正在加载阳光', en: 'One tab loading sunshine.', score: 1 }, { key: 'B', zh: '很多个，运行卡顿', en: 'Many tabs lagging.', score: 2 }, { key: 'C', zh: '已经死机弹出404', en: 'It crashed with 404.', score: 3 }] },
  { id: 21, zh: '如果可以消失一小时，你会去哪？', en: 'If you could disappear for one hour, where to?', options: [{ key: 'A', zh: '云端', en: 'To the clouds.', score: 1 }, { key: 'B', zh: '没人的电影院', en: 'An empty cinema.', score: 2 }, { key: 'C', zh: '彻底虚无的空间', en: 'A void of nothingness.', score: 3 }] },
  { id: 22, zh: '人生意义必须选一个词，你会选？', en: 'If life meaning must be one word, you choose?', options: [{ key: 'A', zh: '体验', en: 'Experience.', score: 1 }, { key: 'B', zh: '忍受', en: 'Endure.', score: 2 }, { key: 'C', zh: '消耗', en: 'Consumption.', score: 3 }] },
  { id: 23, zh: '现在的你，发际线情况更接近？', en: 'Your current hairline is closer to?', options: [{ key: 'A', zh: '茂密森林', en: 'A dense forest.', score: 1 }, { key: 'B', zh: '逐渐稀疏', en: 'Gradually sparse.', score: 2 }, { key: 'C', zh: '珍稀文化遗产', en: 'A rare cultural relic.', score: 3 }] },
  { id: 24, zh: '收到导师/组长的长语音，你觉得那是？', en: "You receive a long voice message from supervisor. It's?", options: [{ key: 'A', zh: '新的挑战', en: 'A new challenge.', score: 1 }, { key: 'B', zh: '必须完成的噪音', en: 'Mandatory noise.', score: 2 }, { key: 'C', zh: '索命符', en: 'A death warrant.', score: 3 }] },
  { id: 25, zh: '如果心情是一种天气，你头顶是？', en: 'If mood is weather, above your head now is?', options: [{ key: 'A', zh: '晴空万里', en: 'Clear sky.', score: 1 }, { key: 'B', zh: '阴天有雾', en: 'Cloudy and foggy.', score: 2 }, { key: 'C', zh: '正在打雷', en: 'Thunderstorm.', score: 3 }] },
  { id: 26, zh: '镜子里的自己，最陌生的地方是？', en: 'In the mirror, what feels most unfamiliar?', options: [{ key: 'A', zh: '充满期待的眼神', en: 'Eyes full of hope.', score: 1 }, { key: 'B', zh: '疲惫的黑眼圈', en: 'Tired dark circles.', score: 2 }, { key: 'C', zh: '紧锁的眉头', en: 'Furrowed brows.', score: 3 }] },
  { id: 27, zh: '如果生活是一场电影，现在是？', en: 'If life is a film, now is?', options: [{ key: 'A', zh: '精彩开场', en: 'A brilliant opening.', score: 1 }, { key: 'B', zh: '冗长中段', en: 'A long middle act.', score: 2 }, { key: 'C', zh: '想快进的垃圾时间', en: 'A skippable bad stretch.', score: 3 }] },
  { id: 28, zh: '如果快乐可以用钱买，你现在买得起吗？', en: 'If happiness could be bought, can you afford it now?', options: [{ key: 'A', zh: '我本来就很富有', en: 'I am already rich in it.', score: 1 }, { key: 'B', zh: '需要攒攒钱', en: 'Need to save up.', score: 2 }, { key: 'C', zh: '彻底破产了', en: 'Totally bankrupt.', score: 3 }] },
  { id: 29, zh: '去图书馆发现没位子，你的内心独白：', en: 'No seats in library. Inner monologue?', options: [{ key: 'A', zh: '刚好去草地坐坐', en: 'Great, I will sit on grass.', score: 1 }, { key: 'B', zh: '哎，又是倒霉的一天', en: 'Sigh, unlucky day again.', score: 2 }, { key: 'C', zh: '世界在针对我', en: 'The world is targeting me.', score: 3 }] },
  { id: 30, zh: '此时此刻，你想对世界说一句：', en: 'At this moment, one sentence to the world:', options: [{ key: 'A', zh: '你好呀', en: 'Hello there.', score: 1 }, { key: 'B', zh: '保持距离', en: 'Keep your distance.', score: 2 }, { key: 'C', zh: '别烦我', en: 'Leave me alone.', score: 3 }] },
];

function pickFive(): Question[] {
  const arr = [...QUESTIONS];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 5);
}

export default function StressQuestionnaireScreen({
  onBack,
  onNavigate,
  language,
}: {
  onBack: () => void;
  onNavigate: (screen: Screen) => void;
  language: AppLanguage;
}) {
  const [questions, setQuestions] = useState<Question[]>(() => pickFive());
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const current = questions[idx];
  const finished = idx >= questions.length;
  const progress = finished ? 100 : (idx / questions.length) * 100;

  const result = useMemo(() => {
    if (!finished) return null;
    if (score <= 8) {
      return {
        state: 'LIGHT',
        label: tr(language, 'Cloud Walker', '云端漫步者'),
        tips:
          language === 'zh'
            ? [
                '你现在的状态很轻盈，这是非常珍贵的节奏。',
                '不妨把这份好心情记录在 Connect，给别人一点阳光。',
                '继续保持规律作息和小幅运动，你会更稳更亮。',
                '今天的你，已经做得很好了，继续发光。',
              ]
            : [
                'Your state is light and clear right now, and that is precious.',
                'Share this good energy in Connect and brighten someone else’s day.',
                'Keep your rhythm with simple routines and small movement.',
                'You are doing great today. Keep shining.',
              ],
        line: tr(language, 'Your soul weighs only 21 grams, light enough to dance with wind.', '你的灵魂现在只有21克，轻盈得能随风起舞。'),
        bg: 'from-sky-100 via-cyan-50 to-blue-100',
      };
    }
    if (score <= 12) {
      return {
        state: 'MEDIUM',
        label: tr(language, 'Deep Sea Diver', '深海潜行者'),
        tips:
          language === 'zh'
            ? [
                '你有点累了，但你并没有失去方向。',
                '先做一次 Deep Breathing，让大脑和身体重新对齐。',
                '再去 Feeding Time 陪陪小鸟，给自己一点温柔的停靠。',
                '慢一点没关系，你正在往更好的状态走。',
              ]
            : [
                'You seem a little tired, but you are not lost.',
                'Start with one Deep Breathing cycle to reset your body and mind.',
                'Then visit Feeding Time and give yourself a gentle pause.',
                'Slower is okay. You are still moving forward.',
              ],
        line: tr(language, 'You stayed underwater for a while. Remember to come up for air.', '你在水下呆得有点久了，记得浮出水面换口气。'),
        bg: 'from-indigo-900 via-purple-900 to-slate-900',
      };
    }
    return {
      state: 'HEAVY',
      label: tr(language, 'Blackhole Gravity', '黑洞引力者'),
      tips:
        language === 'zh'
          ? [
              '你现在承受的真的很多，请先允许自己慢下来。',
              '先去 AI Companion 说说你此刻最重的一件事，不用完整也没关系。',
              '再做几次按压或去 Puff Zen，把身体里的紧绷先释放一点。',
              '你不是一个人在扛，我们一步一步来。',
            ]
          : [
              'You are carrying a lot right now, so please let yourself slow down first.',
              'Open AI Companion and talk about the heaviest part, even if it is unfinished.',
              'Then try a few squeeze actions or Puff Zen to release body tension.',
              'You are not alone in this. We can do it step by step.',
            ],
      line: tr(language, 'Alert. Your emotional core is collapsing. Start release mode now.', '警报：你的情绪内核正在坍缩，请立即开启泄压程序。'),
      bg: 'from-zinc-950 via-red-950 to-black',
    };
  }, [finished, language, score]);

  const answer = (opt: Option, ev: MouseEvent<HTMLButtonElement>) => {
    const rect = (ev.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
    const ripple = { id: Date.now(), x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    setRipples((p) => [...p, ripple]);
    setTimeout(() => setRipples((p) => p.filter((r) => r.id !== ripple.id)), 650);
    const next = score + opt.score;
    setScore(next);
    setTimeout(() => setIdx((p) => p + 1), 180);
  };

  const restart = () => {
    setQuestions(pickFive());
    setIdx(0);
    setScore(0);
  };

  const textToneClass = result?.state === 'LIGHT' ? 'text-slate-900' : 'text-white';

  return (
    <div className={`min-h-screen relative z-20 bg-gradient-to-br ${result?.bg ?? 'from-slate-900 via-blue-900 to-cyan-900'} ${textToneClass}`}>
      <header className="px-6 py-4 flex items-center gap-3 border-b border-white/10 backdrop-blur-md">
        <button type="button" onClick={onBack} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-black">{tr(language, 'Deep Sea Lab', '深海实验室')}</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!finished && current && (
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-6">
            <div className="mb-4">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div className="h-full bg-cyan-300" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
              </div>
              <p className={`text-xs mt-2 ${result?.state === 'LIGHT' ? 'text-slate-700' : 'text-cyan-100'}`}>{tr(language, 'Question', '第')} {idx + 1}/5</p>
            </div>
            <h2 className="text-2xl font-bold leading-relaxed mb-6">{language === 'zh' ? current.zh : current.en}</h2>

            <div className="space-y-3 relative overflow-hidden rounded-2xl">
              {ripples.map((r) => (
                <motion.span key={r.id} initial={{ opacity: 0.6, scale: 0 }} animate={{ opacity: 0, scale: 9 }} className="absolute w-8 h-8 rounded-full bg-cyan-300/50 pointer-events-none" style={{ left: r.x - 16, top: r.y - 16 }} />
              ))}
              {current.options.map((opt) => (
                <button key={opt.key} type="button" onClick={(ev) => answer(opt, ev)} className="w-full text-left rounded-2xl px-5 py-4 bg-white/15 hover:bg-white/25 border border-white/20 transition">
                  <span className="font-black mr-2">{opt.key}.</span>{language === 'zh' ? opt.zh : opt.en}
                </button>
              ))}
            </div>
          </div>
        )}

        {finished && result && (
          <AnimatePresence>
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-6">
              <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${result.state === 'LIGHT' ? 'text-slate-700' : 'text-cyan-100'}`}>{tr(language, 'Stress Result', '压力结果')}</p>
              <h2 className="text-3xl font-black mb-2">{result.label}</h2>
              <p className="mb-2">{tr(language, 'Total score', '总分')}: {score}/15</p>
              <p className="text-lg mb-2">{result.line}</p>
              <div className={`mb-5 space-y-1.5 ${result.state === 'LIGHT' ? 'text-slate-700' : 'text-cyan-100'}`}>
                {result.tips.map((t, i) => (
                  <p key={`${i}-${t}`}>{t}</p>
                ))}
              </div>

              <div className="mb-6 flex justify-center">
                <div
                  className={`w-72 max-w-full h-64 rounded-3xl border overflow-hidden relative ${
                    result.state === 'LIGHT'
                      ? 'bg-gradient-to-b from-sky-200 via-cyan-100 to-yellow-100 border-sky-300'
                      : result.state === 'MEDIUM'
                        ? 'bg-gradient-to-b from-indigo-200 via-slate-100 to-zinc-200 border-indigo-300'
                        : 'bg-gradient-to-b from-zinc-700 via-zinc-800 to-black border-zinc-500'
                  }`}
                >
                  {result.state === 'LIGHT' && (
                    <>
                      <div className="absolute top-4 right-6 text-3xl">☀️</div>
                      <div className="absolute bottom-2 left-3 text-2xl opacity-80">🏖️</div>
                    </>
                  )}
                  {result.state === 'MEDIUM' && (
                    <>
                      <div className="absolute bottom-3 left-4 w-28 h-3 bg-amber-900/60 rounded" />
                      <div className="absolute bottom-6 left-6 w-16 h-10 bg-white/75 rounded-md border border-slate-400" />
                      <div className="absolute bottom-8 left-12 text-lg">📚</div>
                      <div className="absolute top-8 left-4 text-xl rotate-[-16deg]">📘</div>
                      <div className="absolute top-12 right-6 text-xl rotate-[12deg]">📗</div>
                      <div className="absolute bottom-16 right-3 text-xl rotate-[-8deg]">📙</div>
                      <div className="absolute bottom-10 left-2 text-lg rotate-[10deg]">📓</div>
                      <div className="absolute top-24 right-14 text-base opacity-80">📝</div>
                    </>
                  )}
                  {result.state === 'HEAVY' && (
                    <>
                      <div className="absolute inset-0 bg-black/35" />
                      <div className="absolute top-4 left-6 text-xl">🌧️</div>
                      <div className="absolute bottom-6 left-5 text-2xl opacity-90">🧱</div>
                      <div className="absolute bottom-7 left-14 text-xl opacity-80 rotate-[8deg]">🪨</div>
                      <div className="absolute bottom-8 right-5 text-2xl opacity-90">🧱</div>
                      <div className="absolute bottom-7 right-16 text-xl opacity-80 rotate-[-10deg]">🪨</div>
                      <div className="absolute top-10 right-8 text-lg opacity-70">⚠️</div>
                    </>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 200 250" className="w-40 h-44 drop-shadow-[0_18px_20px_rgba(0,0,0,0.25)]">
                      <rect x="58" y="195" width="40" height="26" rx="13" fill="#fbbf24" />
                      <rect x="102" y="195" width="40" height="26" rx="13" fill="#fbbf24" />
                      <path d="M30 145 C 10 150, -5 170, 5 190 C 15 200, 35 180, 45 165 Z" fill="#1d4ed8" />
                      <path d="M170 145 C 190 150, 205 170, 195 190 C 185 200, 165 180, 155 165 Z" fill="#1d4ed8" />
                      <circle cx="10" cy="188" r="14" fill="#ffffff" />
                      <circle cx="190" cy="188" r="14" fill="#ffffff" />
                      <path d="M30 110 C 30 20, 170 20, 170 110 L170 155 C 170 200, 140 215, 100 215 C 60 215, 30 200, 30 155 Z" fill="#ffffff" />
                      <path d="M30 155 C 30 200, 60 215, 100 215 C 140 215, 170 200, 170 155 L170 135 C 140 120, 60 120, 30 135 Z" fill="#1d4ed8" />
                      <text x="100" y="180" textAnchor="middle" fill="#ffffff" fontSize="26" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="2">XJTLU</text>
                      <ellipse cx="74" cy="98" rx="6" ry="14" fill="#1e293b" />
                      <ellipse cx="126" cy="98" rx="6" ry="14" fill="#1e293b" />
                      <ellipse cx="46" cy="104" rx="12" ry="8" fill="#f9a8d4" />
                      <ellipse cx="154" cy="104" rx="12" ry="8" fill="#f9a8d4" />
                      <ellipse cx="100" cy="110" rx="18" ry="22" fill="#eab308" />
                      {result.state === 'LIGHT' && (
                        <g>
                          <rect x="63" y="84" width="22" height="10" rx="4" fill="#111827" />
                          <rect x="115" y="84" width="22" height="10" rx="4" fill="#111827" />
                          <rect x="85" y="88" width="30" height="2" fill="#111827" />
                        </g>
                      )}
                      {result.state === 'MEDIUM' && (
                        <text x="100" y="78" textAnchor="middle" fontSize="13" fill="#334155">...</text>
                      )}
                      {result.state === 'HEAVY' && (
                        <g>
                          <path d="M70 124 C74 132,78 132,82 124" stroke="#1e293b" strokeWidth="2.5" fill="none" />
                          <path d="M118 124 C122 132,126 132,130 124" stroke="#1e293b" strokeWidth="2.5" fill="none" />
                          <path d="M88 144 Q100 136 112 144" stroke="#1e293b" strokeWidth="2.5" fill="none" />
                          <path d="M76 128 C72 136,72 144,76 150" stroke="#60a5fa" strokeWidth="2.5" fill="none" />
                          <path d="M124 128 C128 136,128 144,124 150" stroke="#60a5fa" strokeWidth="2.5" fill="none" />
                        </g>
                      )}
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={restart} className="px-5 py-3 rounded-full bg-white text-slate-900 font-bold">
                  {tr(language, 'Retest (Random 5)', '再测一次（随机5题）')}
                </button>
                {result.state === 'MEDIUM' && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('puffsqueeze_mindfulcare_autostart', 'feeding');
                      onNavigate('mindful-care');
                    }}
                    className="px-5 py-3 rounded-full bg-emerald-500 text-white font-bold"
                  >
                    {tr(language, 'Go to Feeding Time', '去 Feeding Time')}
                  </button>
                )}
                {result.state === 'MEDIUM' && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('puffsqueeze_mindfulcare_autostart', 'breathing');
                      onNavigate('mindful-care');
                    }}
                    className="px-5 py-3 rounded-full bg-sky-600 text-white font-bold"
                  >
                    {tr(language, 'Go to Deep Breathing', '去 Deep Breathing')}
                  </button>
                )}
                {result.state === 'HEAVY' && (
                  <button type="button" onClick={() => onNavigate('puff-zen')} className="px-5 py-3 rounded-full bg-red-600 text-white font-bold">
                    {tr(language, 'Release Stress Now', '立即释放压力')}
                  </button>
                )}
                {result.state === 'HEAVY' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('ai-space')}
                    className="px-5 py-3 rounded-full bg-violet-600 text-white font-bold"
                  >
                    {tr(language, 'Talk to AI Now', '立即去AI对话')}
                  </button>
                )}
                <button type="button" onClick={onBack} className="px-5 py-3 rounded-full bg-white/20 border border-white/30 font-bold">
                  {tr(language, 'Back to Game Center', '返回游戏中心')}
                </button>
              </div>
            </motion.section>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
