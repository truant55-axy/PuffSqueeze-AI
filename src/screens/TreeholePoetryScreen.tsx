import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppLanguage, tr } from '../i18n';

type Category =
  | 'life'
  | 'happy'
  | 'sad'
  | 'stress'
  | 'angry'
  | 'ambition'
  | 'sunny'
  | 'rainy'
  | 'night';

type PoemEntry = { zh: string; en: string };
type PoemLibrary = Record<Category, PoemEntry[]>;

const poemLibrary: PoemLibrary = {
  life: [
    { zh: '草木不需要证明\n只是在风里\n活成了自己。', en: 'Trees do not prove themselves.\nThey simply grow in the wind,\nbecoming who they are.' },
    { zh: '生命是一场海啸\n我们是沙滩上\n握手言和的贝壳。', en: 'Life is a tidal surge.\nWe are shells on the shore,\nmaking peace in each wave.' },
    { zh: '如果不确定去哪\n就往高处走\n那里有光。', en: 'If the road is unclear,\nwalk toward higher ground.\nLight lives there.' },
    { zh: '活着不是答案\n而是一次次\n温柔地提问。', en: 'Living is not one answer.\nIt is a gentle question,\nasked again and again.' },
  ],
  happy: [
    { zh: '把所有的晚风\n揉进云里\n酿成满目的欢喜。', en: 'Knead every evening breeze\ninto the clouds,\nand brew a sky full of joy.' },
    { zh: '你是一枚跳动的火花\n在平庸的夜晚\n烧开了一壶星光。', en: 'You are a living spark,\nboiling a kettle of starlight\nin an ordinary night.' },
    { zh: '今天的阳光\n刚好够我\n原谅所有的不顺心。', en: 'Today’s sunlight is enough\nfor me to forgive\nevery rough corner of the day.' },
    { zh: '笑意像清泉\n从眉眼出发\n一路流到黄昏。', en: 'Your smile is clear spring water,\nstarting at your eyes,\nflowing all the way to dusk.' },
  ],
  sad: [
    { zh: '影子在脚下缩成一团\n它也想躲进\n没人看见的黑夜里。', en: 'Your shadow curls at your feet,\nwanting to hide\ninside unseen night.' },
    { zh: '海并不深\n深的是\n掉进海里的那些话。', en: 'The sea is not the deepest.\nThe deepest are the words\nthat fell into it.' },
    { zh: '碎掉的东西\n捡不起来\n就在原地开一朵花吧。', en: 'If broken pieces cannot be gathered,\nlet a flower bloom\nright where they fell.' },
    { zh: '孤独不是空房间\n是回音太久\n还没找到出口。', en: 'Loneliness is not an empty room.\nIt is an echo\nstill searching for a way out.' },
  ],
  stress: [
    { zh: '万米水压之下\n你不是在沉没\n而是在深海里扎根。', en: 'Under ten-thousand meters of pressure,\nyou are not sinking.\nYou are taking root in the deep.' },
    { zh: '时钟转得太快\n慢一点吧\n灵魂还没跟上来。', en: 'The clock spins too fast.\nSlow down.\nYour soul is still catching up.' },
    { zh: '迷雾存在的意义\n是为了让重逢\n更有惊喜。', en: 'Fog exists\nso reunion can arrive\nwith greater wonder.' },
    { zh: '把心里的结\n一圈一圈解开\n风会替你松绑。', en: 'Untie the knots in your chest,\none loop at a time.\nThe wind will help loosen them.' },
  ],
  angry: [
    { zh: '把火焰关进笼子\n让它烧掉\n那些无用的偏见。', en: 'Cage the flame,\nand let it burn away\nwhat prejudice left behind.' },
    { zh: '你不需要温和\n暴雨过后\n才是洗净的森林。', en: 'You do not need to be soft.\nAfter a storm,\na forest becomes clean.' },
    { zh: '愤怒是带刺的盾\n保护着那个\n不敢大声哭的孩子。', en: 'Anger is a thorned shield,\nguarding the child\nwho cannot cry out loud.' },
    { zh: '锋利不是错误\n学会收刀时\n也别丢了光。', en: 'Sharpness is not a fault.\nWhen you sheath the blade,\nkeep your light.' },
  ],
  ambition: [
    { zh: '去翻过那座山\n不是为了被世界看见\n而是为了看见世界。', en: 'Cross that mountain,\nnot to be seen by the world,\nbut to see the world.' },
    { zh: '野火烧不尽的\n是你骨子里\n那股向上的疯劲。', en: 'What wildfire cannot erase\nis the fierce upward force\ninside your bones.' },
    { zh: '在最冷的时候\n也要做\n最烫的英雄。', en: 'In your coldest hour,\nbecome\nyour hottest hero.' },
    { zh: '把平凡的今天\n磨成明天\n最亮的一把刃。', en: 'Grind this ordinary day\ninto tomorrow’s\nbrightest blade.' },
  ],
  sunny: [
    { zh: '蝉鸣剪碎了暑气\n剩下的那截\n叫做少年。', en: 'Cicadas cut summer heat,\nand what remains\nis called youth.' },
    { zh: '风是透明的信使\n寄来了\n满山的绿意。', en: 'Wind is a transparent messenger,\ndelivering\ngreen across the hills.' },
    { zh: '云朵在天空散步\n就像你\n散落在我的心上。', en: 'Clouds stroll across the sky,\nlike you,\nfalling gently on my heart.' },
    { zh: '阳光落在肩头\n像一句悄悄话\n说你值得被爱。', en: 'Sunlight on your shoulder\nwhispers softly:\nyou are worthy of love.' },
  ],
  rainy: [
    { zh: '雨滴敲打窗棂\n像是一场\n没写完的叙事诗。', en: 'Raindrops knock on window frames,\nlike a narrative poem\nleft unfinished.' },
    { zh: '天色暗了下来\n是为了让灯光\n更有理由温暖。', en: 'The sky darkens\nso lamplight\nhas a reason to be warm.' },
    { zh: '在潮湿的季节里\n适合把心事\n晾在雨声里。', en: 'In damp seasons,\nit helps to air your thoughts\ninside the sound of rain.' },
    { zh: '伞沿下的世界\n窄一点也没关系\n至少还有你。', en: 'The world beneath an umbrella\nmay be small,\nbut at least there is you.' },
  ],
  night: [
    { zh: '夜色把喧闹折好\n放进抽屉\n只留一盏小灯陪你。', en: 'Night folds the noise\ninto a drawer,\nleaving one small lamp with you.' },
    { zh: '月亮不说话\n却把每一块碎心\n照成银色。', en: 'The moon says nothing,\nyet turns each broken heart\ninto silver.' },
    { zh: '凌晨的风很轻\n轻到能托住\n一句没说出口的晚安。', en: 'Dawn wind is light enough\nto carry\nan unspoken good night.' },
    { zh: '你在黑夜里走\n星星就在你身后\n慢慢点亮。', en: 'As you walk through darkness,\nstars behind you\nlight up one by one.' },
  ],
};

const keywordDict: Record<Category, string[]> = {
  life: ['life', '活着', '意义', '存在'],
  happy: ['sparkle', '快乐', '喜悦', '甜'],
  sad: ['难过', '哭', '孤独', '碎'],
  stress: ['累', '焦虑', '压力', '堵'],
  angry: ['烦', '滚', '怒', '讨厌'],
  ambition: ['梦想', '赢', '战斗', '山顶'],
  sunny: ['太阳', '暖', '夏天', '蓝'],
  rainy: ['雨', '阴', '伞', '冷'],
  night: ['night', 'midnight', '夜', '凌晨'],
};

function randomPick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function getMatchedCategory(input: string): Category {
  const normalized = input.toLowerCase();
  for (const [cat, words] of Object.entries(keywordDict) as [Category, string[]][]) {
    if (words.some((w) => normalized.includes(w.toLowerCase()))) return cat;
  }
  return Math.random() > 0.5 ? 'life' : 'sunny';
}

export default function TreeholePoetryScreen({ onBack, language }: { onBack: () => void; language: AppLanguage }) {
  const [mood, setMood] = useState('');
  const [poem, setPoem] = useState<PoemEntry | null>(null);
  const [typedZh, setTypedZh] = useState('');
  const [typedEn, setTypedEn] = useState('');
  const [isBurst, setIsBurst] = useState(false);
  const [seed, setSeed] = useState(0);

  const placeholder = useMemo(() => tr(language, 'Type one mood sentence...', '输入一句今天的心情...'), [language]);
  const zhLines = useMemo(() => typedZh.split('\n'), [typedZh]);
  const enLines = useMemo(() => typedEn.split('\n'), [typedEn]);

  const generate = () => {
    const category = getMatchedCategory(mood.trim());
    const picked = randomPick(poemLibrary[category]);
    setPoem(picked);
    setTypedZh('');
    setTypedEn('');
    setIsBurst(false);
    setSeed((s) => s + 1);
  };

  useEffect(() => {
    if (!poem) return;
    let izh = 0;
    let ien = 0;
    const timerZh = setInterval(() => {
      izh += 1;
      setTypedZh(poem.zh.slice(0, izh));
      if (izh >= poem.zh.length) clearInterval(timerZh);
    }, 45);
    const timerEn = setInterval(() => {
      ien += 1;
      setTypedEn(poem.en.slice(0, ien));
      if (ien >= poem.en.length) clearInterval(timerEn);
    }, 35);
    const burstTimer = setTimeout(() => setIsBurst(true), 4700);
    const clearTimer = setTimeout(() => {
      setPoem(null);
      setTypedZh('');
      setTypedEn('');
      setIsBurst(false);
    }, 8600);
    return () => {
      clearInterval(timerZh);
      clearInterval(timerEn);
      clearTimeout(burstTimer);
      clearTimeout(clearTimer);
    };
  }, [poem]);

  return (
    <div className="min-h-screen relative z-20 bg-background/30 text-on-surface">
      <header className="px-6 py-4 flex items-center gap-3 border-b border-white/20 bg-white/20 backdrop-blur-md">
        <button type="button" onClick={onBack} className="w-9 h-9 rounded-full bg-white/50 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-black text-primary">Tree-hole Poetry</h1>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8">
        <section className="bg-white/40 border border-white/30 rounded-3xl backdrop-blur-2xl p-6 shadow-sm">
          <p className="text-sm text-on-surface-variant mb-4">
            {tr(language, 'Input one feeling. Click Deliver. A poem will appear for this moment.', '输入一句心情，点击投递，一首小诗会为你浮现。')}
          </p>
          <textarea
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-28 rounded-2xl bg-white/70 border border-white/60 px-4 py-3 text-on-surface placeholder:text-on-surface-variant/60 outline-none"
          />
          <div className="mt-4">
            <button
              type="button"
              onClick={generate}
              disabled={!mood.trim()}
              className="px-5 py-3 rounded-full bg-primary text-white font-black disabled:opacity-50"
            >
              {tr(language, 'Deliver', '投递')}
            </button>
          </div>
        </section>

        <section className="mt-8 min-h-[300px] relative overflow-hidden rounded-3xl border border-white/30 bg-white/35 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {typedZh && (
              <motion.div
                key={`${seed}-${poem?.zh ?? ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-8 flex items-center justify-center"
              >
                <div className="text-center max-w-2xl space-y-6">
                  <div className="font-serif text-xl leading-relaxed text-primary space-y-1.5">
                    {zhLines.map((line, i) => (
                      <motion.p
                        key={`zh-${i}-${line}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={
                          isBurst
                            ? {
                                opacity: 0,
                                x: (i % 2 === 0 ? -1 : 1) * (35 + i * 8),
                                y: -20 - i * 6,
                                filter: 'blur(5px)',
                              }
                            : { opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }
                        }
                        transition={{ duration: isBurst ? 3.2 : 0.35, delay: isBurst ? i * 0.05 : i * 0.1 }}
                      >
                        {line || '\u00A0'}
                      </motion.p>
                    ))}
                  </div>
                  <div className="font-serif text-lg leading-relaxed text-primary/85 space-y-1.5 border-t border-primary/20 pt-4">
                    {enLines.map((line, i) => (
                      <motion.p
                        key={`en-${i}-${line}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={
                          isBurst
                            ? {
                                opacity: 0,
                                x: (i % 2 === 0 ? 1 : -1) * (30 + i * 7),
                                y: -18 - i * 5,
                                filter: 'blur(5px)',
                              }
                            : { opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }
                        }
                        transition={{ duration: isBurst ? 3.2 : 0.35, delay: isBurst ? i * 0.05 : i * 0.08 }}
                      >
                        {line || '\u00A0'}
                      </motion.p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {!typedZh && (
            <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant/60 text-sm">
              {tr(language, 'Your poem will bloom here, then drift away.', '诗会在这里浮现，然后像烟一样散开。')}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
