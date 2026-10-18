import { saveAccountItem, accountRecordId } from './accountSync';
import tracery from '../vendor/tracery/tracery.js';
import type { AppLanguage } from '../i18n';
import type { CompanionKind } from './companionService';
import { isCompanionKind } from './companionService';
import type { CompanionMood } from './companionMoodService';

export type PoemForm = 'three' | 'letter' | 'free';
export type PoemTheme = 'study' | 'friendship' | 'heavy' | 'joy' | 'change' | 'rest';
export type PoemImage = 'rain' | 'sea' | 'moon' | 'wind' | 'window' | 'tree';
export interface PoetryRequest { note: string; form: PoemForm; theme: PoemTheme | 'auto'; imagery: PoemImage | 'auto' }
export interface PoemText { title: string; lines: string[] }
export interface PoetryCard {
  id: string; createdAt: number; language: AppLanguage; form: PoemForm; theme: PoemTheme; imagery: PoemImage;
  title: string; lines: string[]; companion: CompanionKind; growthStage: 0 | 1 | 2; mood: CompanionMood;
  original?: string;
  edited?: boolean;
  // The opposite language, with exactly one translation for each original line.
  translation?: PoemText;
}
export const POEM_FORMS = [
  { value: 'three', en: 'Three-line poem', zh: '三行短诗' },
  { value: 'letter', en: 'A little letter', zh: '一封短笺' },
  { value: 'free', en: 'Free verse', zh: '自由诗' },
] as const;
export const POEM_THEMES = [
  { value: 'auto', en: 'From my words', zh: '从来信中寻找', words: [] },
  { value: 'study', en: 'School & effort', zh: '学习与努力', words: ['exam','homework','school','grade','deadline','study','考试','学习','作业','成绩','上课','ddl'] },
  { value: 'friendship', en: 'People & belonging', zh: '关系与陪伴', words: ['friend','family','alone','belong','miss','朋友','家人','孤单','想念','关系'] },
  { value: 'heavy', en: 'A heavy day', zh: '有点累的一天', words: ['tired','stress','overwhelm','anxious','angry','sad','累','压力','难过','焦虑','烦','生气'] },
  { value: 'joy', en: 'A small good thing', zh: '一点小开心', words: ['happy','joy','glad','proud','excited','开心','快乐','高兴','幸福','期待'] },
  { value: 'change', en: 'Something changing', zh: '变化与未知', words: ['change','future','tomorrow','uncertain','lost','未来','变化','迷茫','明天','不知道'] },
  { value: 'rest', en: 'Room to breathe', zh: '留一点空白', words: ['rest','quiet','sleep','peace','放松','安静','休息','睡'] },
] as const;
export const POEM_IMAGES = [
  { value: 'auto', en: 'Find an image', zh: '从来信中寻找', words: [] },
  { value: 'rain', en: 'Rain', zh: '雨', words: ['rain','雨'] },
  { value: 'sea', en: 'Sea', zh: '海', words: ['sea','ocean','wave','海','浪'] },
  { value: 'moon', en: 'Moonlight', zh: '月光', words: ['moon','night','星','月','夜'] },
  { value: 'wind', en: 'Breeze', zh: '风', words: ['wind','breeze','风'] },
  { value: 'window', en: 'Window', zh: '窗', words: ['window','light','窗','阳光'] },
  { value: 'tree', en: 'Trees', zh: '树', words: ['tree','forest','leaf','树','森林','叶'] },
] as const;

type BilingualLines = { en: string[]; zh: string[] };
const contexts: Record<PoemTheme, BilingualLines> = {
  study: { en: ['The unfinished page can wait for one more breath.', 'There is more to you than the answer on a page.', 'A crossed-out line still belongs to the story.', 'Some answers take the long way home.', 'Today, trying was part of the work.'], zh: ['没写完的那一页，可以再等一次呼吸。','纸上的答案，写不完一个完整的你。','划掉的一行，也留在了故事里。','有些答案，会绕一点远路。','今天，尝试本身也是一部分。'] },
  friendship: { en: ['There is room for the words you have not found.', 'A small hello can cross a long silence.', 'Some distances fit inside an unsent letter.', 'You can miss someone and still make room for today.', 'The empty chair does not need an answer tonight.'], zh: ['还没找到的话，也可以在这里坐一会儿。','轻轻的一声问候，越过一段安静。','有些距离，装在一封未寄的信里。','想念一个人时，也能给今天留一点位置。','空着的椅子，今晚不必有答案。'] },
  heavy: { en: ['You do not have to name everything at once.', 'The day was heavy; the evening can be quiet.', 'Even the held breath is allowed to leave.', 'Some feelings need a place before they need an answer.', 'What you carried today can rest beside this page.'], zh: ['不必一次，说清楚所有的感受。','今天有些沉，夜晚可以安静一点。','一直屏住的呼吸，也可以慢慢松开。','有些感受，先需要一个位置。','今天背着的事，先放在这页纸旁。'] },
  joy: { en: ['A small good thing does not have to become anything else.', 'Let this ordinary happiness have its own name.', 'For a moment, nothing needs to be added.', 'There is a little more room for laughter today.', 'Keep one bright detail from this ordinary day.'], zh: ['一件小小的好事，不必再变成别的什么。','让平凡的开心，也有自己的名字。','这一刻，暂时不需要再添些什么。','今天，给笑声多留一点位置。','把平常日子里亮着的细节，留下一个。'] },
  change: { en: ['The path does not need to show its whole length.', 'One small step can belong to an unfinished map.', 'A door can stay unopened until you are ready.', 'Not knowing is a place to pause, too.', 'Tomorrow can wait outside this quiet moment.'], zh: ['一条路，不必一下露出全部的长度。','小小的一步，也能落在未画完的地图上。','还没准备好的门，可以先不打开。','不知道的时候，也有停一停的位置。','明天的事，先等在这一刻之外。'] },
  rest: { en: ['Nothing here asks you to hurry.', 'An empty space can be part of the page.', 'For a little while, let the day be unfinished.', 'This moment does not need to earn its place.', 'Set down one small thing you no longer need to hold.'], zh: ['这里，没有什么催着你。','空白，也可以是这一页的一部分。','允许今天，暂时还没完成。','这一刻，不需要用什么来交换。','把暂时不用握紧的事，放下一件。'] },
};
const scenes: Record<PoemImage, { title: BilingualLines; scene: BilingualLines; detail: BilingualLines }> = {
  rain: {
    title: { en: ['A note in the rain','Between raindrops','A softer kind of weather'], zh: ['写在雨里','雨滴之间','柔软的天气'] },
    scene: { en: ['Rain gathers quietly on the window.', 'The rain writes slowly across the glass.', 'Beyond the roof, the rain keeps its own time.'], zh: ['雨，轻轻聚在窗边。','雨在玻璃上，慢慢写着。','屋檐之外，雨有自己的节奏。'] },
    detail: { en: ['One drop finds its way to another.', 'The street holds a hundred small reflections.', 'The room grows quiet around the sound.'], zh: ['一滴水，找到了另一滴。','街道，留下一百个小小的倒影。','房间在雨声里，渐渐安静。'] },
  },
  sea: {
    title: { en: ['A pocket of tide','At the waterline','A letter from the shore'], zh: ['一小片潮汐','海水经过的地方','岸边的信'] },
    scene: { en: ['The tide leaves a small shell on the shore.', 'A pale wave folds itself onto the sand.', 'The sea moves slowly under an open sky.'], zh: ['潮水，把一枚小贝壳留在岸上。','浅浅的浪，在沙滩上轻轻折起。','海在空旷的天空下，慢慢移动。'] },
    detail: { en: ['The water draws a line, then lets it go.', 'Salt settles on the edge of the afternoon.', 'A little foam arrives without a sound.'], zh: ['水画下一条线，又松开了它。','盐粒，落在午后的边缘。','一小片泡沫，没有声音地抵达。'] },
  },
  moon: {
    title: { en: ['A little after dark','Under the same moon','The quiet side of night'], zh: ['入夜以后','月光经过','夜的安静一面'] },
    scene: { en: ['Moonlight rests on the edge of the desk.', 'The moon leaves a pale square on the floor.', 'A little moonlight reaches through the curtains.'], zh: ['月光，停在书桌的边缘。','月亮在地板上，留下一块淡淡的光。','一点月光，越过了窗帘。'] },
    detail: { en: ['The room makes space for a quieter hour.', 'A cup cools beside the folded page.', 'The night does not turn another page.'], zh: ['房间，给安静的一小时留了位置。','折起的纸旁，一杯水慢慢凉下来。','夜晚，没有急着翻下一页。'] },
  },
  wind: {
    title: { en: ['Carried by a breeze','A page left open','Where the wind pauses'], zh: ['风带来的一页','翻开的纸','风停一停的地方'] },
    scene: { en: ['A breeze turns the corner of the page.', 'The wind moves softly through the open door.', 'A cool breeze passes through the afternoon.'], zh: ['风，把书页的一角轻轻翻起。','风，从开着的门里轻轻经过。','一阵清凉，穿过了午后。'] },
    detail: { en: ['The curtain lifts, then settles.', 'A loose leaf takes the longer way down.', 'The air carries nothing that must be kept.'], zh: ['窗帘扬起，又慢慢落下。','一片叶子，绕了远一点的路落下。','风里，没有必须留住的东西。'] },
  },
  window: {
    title: { en: ['A little window light','Room for the afternoon','A note beside the glass'], zh: ['窗边一点光','午后的位置','玻璃旁的信'] },
    scene: { en: ['Soft light falls across the windowsill.', 'The window holds a small piece of sky.', 'Afternoon light reaches the corner of the room.'], zh: ['柔软的光，落在窗台上。','窗户，留住一小块天空。','午后的光，走到了房间的一角。'] },
    detail: { en: ['Dust drifts through a quiet square of light.', 'A shadow slowly changes its shape.', 'The glass keeps the noise a little further away.'], zh: ['微尘，在安静的光里经过。','影子，慢慢换了一种形状。','隔着玻璃，喧闹远了一点。'] },
  },
  tree: {
    title: { en: ['A place beneath the leaves','The tree keeps listening','A little green silence'], zh: ['树叶底下的位置','树还在这里','一小片绿色的安静'] },
    scene: { en: ['A leaf loosens its hold on the branch.', 'The tree keeps a patch of shade beside the path.', 'Small leaves move in the afternoon air.'], zh: ['一片叶子，松开了握着树枝的手。','树在路边，留下一片阴凉。','小小的叶子，在午后的空气里晃动。'] },
    detail: { en: ['The branches leave room for the sky.', 'A thin shadow crosses the empty path.', 'The roots keep their quiet place in the earth.'], zh: ['枝叶之间，给天空留了一点空隙。','细细的影子，经过空着的小路。','树根，在泥土里安静地待着。'] },
  },
};
const closing: BilingualLines = {
  en: ['For now, this small moment can be enough.', 'Leave a little room for the next breath.', 'There is no need to finish the story tonight.', 'Let one quiet thing stay with you.', 'You can leave the rest for another page.', 'Stay here for one unhurried breath.'],
  zh: ['现在，先让这一小刻足够。','给下一次呼吸，留一点位置。','今晚，不必写完这个故事。','留一件安静的事，陪着此刻。','剩下的，留给另一页。','在这里，慢慢呼吸一次。'],
};
const opening: BilingualLines = {
  en: ['A small letter, just for this moment:', 'To the part of you that made it through today:', 'A little note to keep beside you:'],
  zh: ['给这一刻的一封短信：','给今天走到这里的你：','一张可以放在身边的小纸条：'],
};
const turn: BilingualLines = {
  en: ['The hour opens a little wider.', 'There is still a blank space on this page.', 'Nothing has to happen all at once.'],
  zh: ['这一小时，慢慢宽了一点。','这一页，还留着一点空白。','所有的事，不必同时发生。'],
};

// Older single-language letters can recover their curated counterpart without
// generating a different poem or sending their contents to a translation service.
const pairedBanks = [closing, opening, turn, ...Object.values(contexts), ...Object.values(scenes).flatMap(image => [image.title, image.scene, image.detail])];
function curatedTranslation(text: string, from: AppLanguage): string | undefined {
  for (const bank of pairedBanks) {
    const index = bank[from].indexOf(text);
    if (index >= 0) return bank[from === 'en' ? 'zh' : 'en'][index];
  }
}
export function getBilingualPoem(card: PoetryCard): { en: PoemText; zh: PoemText } | null {
  const original = { title: card.title, lines: card.lines };
  let translation = card.translation;
  if (!translation) {
    const title = curatedTranslation(card.title, card.language);
    const lines = card.lines.map(line => curatedTranslation(line, card.language));
    if (title && lines.every((line): line is string => line !== undefined)) translation = { title, lines };
  }
  if (!translation || translation.lines.length !== card.lines.length) return null;
  return card.language === 'en' ? { en: original, zh: translation } : { en: translation, zh: original };
}

function mentions(note: string, word: string) {
  return /^[a-z]+$/i.test(word) ? new RegExp(`\\b${word}\\b`, 'i').test(note) : note.includes(word);
}
function resolveRecipe(request: PoetryRequest): { theme: PoemTheme; imagery: PoemImage } {
  const note = request.note.toLowerCase();
  const candidates = POEM_THEMES.filter(item => item.value !== 'auto').map(item => ({ value: item.value as PoemTheme, score: item.words.filter(word => mentions(note, word)).length }));
  candidates.sort((a, b) => b.score - a.score);
  const theme = request.theme !== 'auto' ? request.theme : candidates[0].score > 0 ? candidates[0].value : 'rest';
  const suggestedImage = POEM_IMAGES.find(item => item.value !== 'auto' && item.words.some(word => mentions(note, word)))?.value as PoemImage | undefined;
  const defaults: Record<PoemTheme, PoemImage> = { study: 'window', friendship: 'sea', heavy: 'rain', joy: 'wind', change: 'tree', rest: 'moon' };
  return { theme, imagery: request.imagery !== 'auto' ? request.imagery : suggestedImage ?? defaults[theme] };
}

export function createPoetry(request: PoetryRequest, identity: Pick<PoetryCard, 'companion' | 'growthStage' | 'mood'>, previousLines?: string[]): PoetryCard {
  const { theme, imagery } = resolveRecipe(request);
  const image = scenes[imagery];
  // Select bilingual pair IDs once. Never roll English and Chinese separately.
  // Only curated IDs enter Tracery; raw user text is never parsed as grammar.
  const banks: Record<string, BilingualLines> = { title: image.title, scene: image.scene, detail: image.detail, context: contexts[theme], closing, opening, turn };
  const pairs: Record<string, { en: string; zh: string }> = {};
  const rules: Record<string, string[]> = {};
  for (const [symbol, bank] of Object.entries(banks)) {
    rules[symbol] = bank.en.map((en, index) => {
      const id = `${symbol}_${index}`;
      pairs[id] = { en, zh: bank.zh[index] };
      return id;
    });
  }
  rules.origin = request.form === 'three' ? ['#scene#\n#context#\n#closing#'] : request.form === 'letter' ? ['#opening#\n#context#\n#scene#\n#closing#'] : ['#scene#\n#detail#\n#context#\n#turn#\n#closing#'];
  const grammar = tracery.createGrammar(rules);
  let chosen: { en: string; zh: string }[] = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    chosen = grammar.flatten('#origin#').split('\n').map(id => pairs[id.trim()]);
    if (chosen.map(pair => pair.en).join('\n') !== previousLines?.join('\n')) break;
  }
  const title = pairs[grammar.flatten('#title#')];
  return { id: accountRecordId(), createdAt: Date.now(), language: 'en', form: request.form, theme, imagery,
    title: title.en, lines: chosen.map(pair => pair.en), translation: { title: title.zh, lines: chosen.map(pair => pair.zh) }, ...identity };
}

const keyFor = (userId: number) => `puffsqueeze_poetry_cards_${userId}`;
export const POETRY_STORAGE_EVENT = 'puffsqueeze:poetry-cards';
function isCard(value: unknown): value is PoetryCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as PoetryCard;
  return typeof card.id === 'string' && Number.isFinite(card.createdAt) && typeof card.title === 'string' && card.title.length <= 200
    && (card.language === 'en' || card.language === 'zh') && POEM_FORMS.some(item => item.value === card.form)
    && POEM_THEMES.some(item => item.value !== 'auto' && item.value === card.theme) && POEM_IMAGES.some(item => item.value !== 'auto' && item.value === card.imagery)
    && Array.isArray(card.lines) && card.lines.length >= 1 && card.lines.length <= 12 && card.lines.every(line => typeof line === 'string' && line.length <= 200)
    && isCompanionKind(card.companion) && [0,1,2].includes(card.growthStage) && ['calm','happy','tired','sleepy'].includes(card.mood)
    && (card.original === undefined || typeof card.original === 'string' && card.original.length <= 1000)
    && (card.edited === undefined || typeof card.edited === 'boolean')
    && (card.translation === undefined || !!card.translation && typeof card.translation === 'object'
      && typeof card.translation.title === 'string' && card.translation.title.length > 0 && card.translation.title.length <= 200
      && Array.isArray(card.translation.lines) && card.translation.lines.length === card.lines.length
      && card.translation.lines.every(line => typeof line === 'string' && line.length > 0 && line.length <= 200));
}
export function readPoetryCards(userId: number): { cards: PoetryCard[]; available: boolean } {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { cards: [], available: true };
    const cards: unknown = JSON.parse(raw);
    if (!Array.isArray(cards) || cards.length > 80 || !cards.every(isCard)) return { cards: [], available: false };
    return { cards: cards as PoetryCard[], available: true };
  } catch { return { cards: [], available: false }; }
}
export function writePoetryCards(userId: number, cards: PoetryCard[]) {
  if (cards.length > 80) throw new Error('full');
  // Refuse to overwrite unreadable storage; export still works independently.
  if (!readPoetryCards(userId).available) throw new Error('storage');
  saveAccountItem(keyFor(userId), JSON.stringify(cards), userId);
  window.dispatchEvent(new Event(POETRY_STORAGE_EVENT));
}
