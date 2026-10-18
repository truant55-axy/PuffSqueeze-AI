import { accountRecordId } from '../services/accountSync';
import AppIcon from '../components/AppIcon';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import HealingAnimal from '../components/HealingAnimal';
import { useCompanion } from '../hooks/useCompanion';
import { COMPANION_CHOICES } from '../services/companionService';
import { readCompanionMood } from '../services/companionMoodService';
import { readGrowthStage } from '../services/careVisualStore';
import { getCurrentUserId } from '../services/session';
import { createPoetry, getBilingualPoem, readPoetryCards, writePoetryCards, POETRY_STORAGE_EVENT, POEM_FORMS, POEM_THEMES, POEM_IMAGES, type PoetryCard, type PoetryRequest } from '../services/treeholePoetry';
import { downloadPoemImage, downloadPoemText } from '../services/poetryExport';
import { AppLanguage, tr } from '../i18n';
import './treeholePoetry.css';

type Phase = 'idle' | 'delivering' | 'releasing';
const icon = (name: string) => <AppIcon className="app-icon" aria-hidden="true">{name}</AppIcon>;

export default function TreeholePoetryScreen({ onBack, language }: { onBack: () => void; language: AppLanguage }) {
  const t = (en: string, zh: string) => tr(language, en, zh);
  const userId = getCurrentUserId();
  const [companion] = useCompanion();
  const choice = COMPANION_CHOICES.find(item => item.kind === companion)!;
  const name = t(choice.en, choice.zh);
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<'write' | 'saved'>('write');
  const [note, setNote] = useState('');
  const [theme, setTheme] = useState<PoetryRequest['theme']>('auto');
  const [imagery, setImagery] = useState<PoetryRequest['imagery']>('auto');
  const [form, setForm] = useState<PoetryRequest['form']>('three');
  const [current, setCurrent] = useState<PoetryCard | null>(null);
  const [lastRequest, setLastRequest] = useState<PoetryRequest | null>(null);
  const [cards, setCards] = useState(() => readPoetryCards(userId).cards);
  const [storageAvailable, setStorageAvailable] = useState(() => readPoetryCards(userId).available);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [includeOriginal, setIncludeOriginal] = useState(false);
  const [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<PoetryCard | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editLines, setEditLines] = useState('');
  const [editZhTitle, setEditZhTitle] = useState('');
  const [editZhLines, setEditZhLines] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animalRef = useRef<HTMLDivElement>(null);
  const busy = phase !== 'idle';
  const selectedSaved = cards.find(card => card.id === selectedId) ?? cards[0] ?? null;
  const shown = tab === 'saved' ? selectedSaved : current;
  const bilingual = shown ? getBilingualPoem(shown) : null;
  const shownChoice = COMPANION_CHOICES.find(item => item.kind === (shown?.companion ?? companion))!;
  const isSaved = shown ? cards.some(card => card.id === shown.id) : false;

  useEffect(() => {
    const refresh = () => { const value = readPoetryCards(userId); setCards(value.cards); setStorageAvailable(value.available); };
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === `puffsqueeze_poetry_cards_${userId}`) refresh(); };
    window.addEventListener(POETRY_STORAGE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(POETRY_STORAGE_EVENT, refresh); window.removeEventListener('storage', onStorage); };
  }, [userId]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { setNotice(''); }, [language]);

  const deliver = (again = false) => {
    if (busy || editing) return;
    const request = again && lastRequest ? lastRequest : { note: note.trim(), theme, imagery, form };
    if (!request.note) return;
    try {
      const draft = createPoetry(request, { companion, growthStage: readGrowthStage(companion), mood: readCompanionMood(companion) }, current?.lines);
      setLastRequest({ ...request }); setNotice(''); setUndo(null); setPhase('delivering');
      timer.current = setTimeout(() => { setCurrent(draft); setPhase('idle'); }, reduceMotion ? 80 : 1000);
    } catch { setNotice(t('The letter could not be written. Please try again.', '暂时没能写好这封回信，请再试一次。')); }
  };
  const exportCard = (): PoetryCard | null => {
    if (!shown) return null;
    return tab === 'write' ? { ...shown, original: includeOriginal ? lastRequest?.note : undefined } : shown;
  };
  const save = () => {
    const card = exportCard(); if (!card || busy) return;
    try {
      const latest = readPoetryCards(userId); if (!latest.available) throw new Error('storage');
      if (latest.cards.some(item => item.id === card.id)) return;
      writePoetryCards(userId, [card, ...latest.cards]); setUndo(null);
      setNotice(t('Saved on this device; account sync is queued. Find it in My letters.', '本机已保存并加入账号同步队列，可在“我的回信”里找到。'));
    } catch (error) {
      setNotice(error instanceof Error && error.message === 'full' ? t('Your box holds 80 letters. Remove one before keeping another.', '信箱最多保存 80 张，请先移除一张。') : t('Browser storage is unavailable or full. You can still download this card.', '浏览器存储不可用或已满，仍可下载这张诗卡。'));
    }
  };
  const remove = (card: PoetryCard) => {
    try {
      const latest = readPoetryCards(userId); if (!latest.available) throw new Error('storage');
      writePoetryCards(userId, latest.cards.filter(item => item.id !== card.id));
      setUndo(card); setNotice(t('Letter removed.', '已移除这张回信。'));
    } catch { setNotice(t('The letter could not be removed.', '暂时无法移除这张回信。')); }
  };
  const restore = () => {
    if (!undo) return;
    try {
      const latest = readPoetryCards(userId); if (!latest.available) throw new Error('storage');
      if (!latest.cards.some(card => card.id === undo.id)) writePoetryCards(userId, [...latest.cards, undo].sort((a,b) => b.createdAt-a.createdAt));
      setSelectedId(undo.id); setUndo(null); setNotice(t('Letter restored.', '回信已恢复。'));
    } catch { setNotice(t('Could not restore the letter. It is still available to undo here.', '暂时无法恢复，可以保留此页面稍后再试。')); }
  };
  const release = () => {
    if (busy || editing) return;
    setPhase('releasing');
    timer.current = setTimeout(() => { setCurrent(null); setLastRequest(null); setNote(''); setPhase('idle'); setIncludeOriginal(false); setNotice(''); }, reduceMotion ? 50 : 800);
  };
  const downloadImage = async () => {
    const card = exportCard(), svg = animalRef.current?.querySelector('svg'); if (!card || exporting) return;
    if (!svg) { setNotice(t('The card is still opening. Please try again in a moment.', '诗卡正在展开，请稍后再下载。')); return; }
    setExporting(true);
    try { await downloadPoemImage(card, svg); setNotice(t('Your poem card is ready to download.', '诗卡已生成，可以在下载中查看。')); }
    catch { setNotice(t('Image download is unavailable. Try the text download instead.', '图片暂时无法导出，可以先下载文字版。')); }
    finally { setExporting(false); }
  };
  const applyEdit = () => {
    const lines = editLines.split('\n').map(line => line.trim()).filter(Boolean);
    const zhLines = editZhLines.split('\n').map(line => line.trim()).filter(Boolean);
    if (!editTitle.trim() || !editZhTitle.trim() || !lines.length || lines.length > 12 || lines.length !== zhLines.length || [...lines, ...zhLines].some(line => line.length > 200)) {
      setNotice(t('Add both titles and 1–12 matching lines in each language (up to 200 characters per line).', '请填写中英文标题，两种语言均为 1–12 行且行数一致，每行不超过 200 字。')); return;
    }
    if (current) setCurrent({ ...current, id: accountRecordId(), language: 'en', title: editTitle.trim(), lines, translation: { title: editZhTitle.trim(), lines: zhLines }, edited: true });
    setEditing(false); setNotice(t('Your words are part of this letter now.', '现在，这张回信里也有你自己的话了。'));
  };
  const startEdit = () => {
    if (!shown) return;
    setEditTitle(bilingual?.en.title ?? (shown.language === 'en' ? shown.title : ''));
    setEditLines((bilingual?.en.lines ?? (shown.language === 'en' ? shown.lines : [])).join('\n'));
    setEditZhTitle(bilingual?.zh.title ?? (shown.language === 'zh' ? shown.title : ''));
    setEditZhLines((bilingual?.zh.lines ?? (shown.language === 'zh' ? shown.lines : [])).join('\n'));
    setEditing(true);
  };
  const date = (card: PoetryCard) => new Date(card.createdAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });

  return <div className="treehole-screen">
    <header className="treehole-header">
      <button type="button" className="treehole-back" onClick={onBack} aria-label={t('Back to games', '返回游戏')}>{icon('arrow_back')}</button>
      <div><h1>{t('Tree-hole Poetry', '树洞小诗')}</h1><p>{t('A little place for the words you carry.', '给今天没说完的话，留一个位置。')}</p></div>
    </header>
    <main className="treehole-main">
      <div className="treehole-intro"><div><span className="treehole-eyebrow">{t('A SMALL LETTER TO YOURSELF', '给自己的一封小信')}</span><h2>{t('Leave a thought. Receive a little poem.', '写下一点心事，收一封小小的诗。')}</h2></div><p>{icon('lock')} {t('Written here · Saved letters sync to your account', '在本地写成 · 收藏后同步账号')}</p></div>
      <div className="treehole-tabs" role="tablist" aria-label={t('Tree-hole sections', '树洞分区')}>
        <button type="button" role="tab" aria-selected={tab === 'write'} aria-controls="treehole-workspace" disabled={busy || editing} onClick={() => setTab('write')}>{icon('edit_note')}{t('Write a note', '写一封信')}</button>
        <button type="button" role="tab" aria-selected={tab === 'saved'} aria-controls="treehole-workspace" disabled={busy || editing} onClick={() => setTab('saved')}>{icon('mail')}{t('My letters', '我的回信')}<span>{cards.length}</span></button>
      </div>
      {!storageAvailable && <p className="treehole-storage" role="status">{t('Saved letters could not be read. Existing data has not been overwritten; new poems can still be downloaded.', '暂时无法读取已存回信。已有内容未被覆盖，新诗卡仍可以下载。')}</p>}
      <div className="treehole-layout" id="treehole-workspace" role="tabpanel">
        {tab === 'write' ? <section className="treehole-compose" aria-label={t('Your letter', '你的来信')}>
          <div className="treehole-section-heading"><span>01 / {t('YOUR NOTE', '你的来信')}</span><span>{t('A sentence is enough', '一句也可以')}</span></div>
          <fieldset disabled={busy || editing}>
            <label className="treehole-note-label" htmlFor="treehole-note">{t('What would you like to leave here?', '今天，有什么想留在这里？')}</label>
            <textarea id="treehole-note" maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder={t('Something from today, or a thought that has been on your mind…', '今天发生的一件小事，或一段还没说出口的话……')} />
            <div className="treehole-note-meta"><span>{t('Only saved when you choose to keep it.', '原文只在你选择附上时保存。')}</span><span>{note.length}/1000</span></div>
            <div className="treehole-setting-row"><span>{t('Poem language', '诗歌语言')}</span><span className="treehole-bilingual-badge">{icon('translate')}{t('English + Chinese · Paired lines', '中英双语 · 逐句对照')}</span></div>
            <div className="treehole-setting-row"><label htmlFor="treehole-form">{t('Shape of the letter', '诗的形式')}</label><select id="treehole-form" value={form} onChange={event => setForm(event.target.value as PoetryRequest['form'])}>{POEM_FORMS.map(item => <option key={item.value} value={item.value}>{t(item.en,item.zh)}</option>)}</select></div>
            <div className="treehole-theme"><span className="treehole-field-label">{t('A theme, if you like', '想写的主题')}</span><div role="group" aria-label={t('Poem theme', '诗歌主题')}>{POEM_THEMES.map(item => <button key={item.value} type="button" aria-pressed={theme === item.value} onClick={() => setTheme(item.value)}>{t(item.en,item.zh)}</button>)}</div></div>
            <div className="treehole-setting-row treehole-image-setting"><label htmlFor="treehole-imagery">{t('A little imagery', '一个小意象')}</label><select id="treehole-imagery" value={imagery} onChange={event => setImagery(event.target.value as PoetryRequest['imagery'])}>{POEM_IMAGES.map(item => <option key={item.value} value={item.value}>{t(item.en,item.zh)}</option>)}</select></div>
            <button type="button" className="treehole-deliver" disabled={!note.trim() || busy || editing} onClick={() => deliver()}>{icon('outgoing_mail')}{phase === 'delivering' ? t('Folding your letter…', '正在折好这封信……') : t('Send to the tree-hole', '把心事投进树洞')}</button>
          </fieldset>
          <p className="treehole-method">{t('Each English line is paired with its Chinese translation from our original word banks. Tracery combines these pairs into free verse; your note is not sent to an AI service.', '每句英文都有对应的中文诗句，以原创词库与 Tracery 规则组合成双语自由诗；来信不会发送到 AI 服务。')}</p>
        </section> : <section className="treehole-letterbox" aria-label={t('Saved letters', '已存回信')}>
          <div className="treehole-section-heading"><span>01 / {t('YOUR LETTER BOX', '你的信箱')}</span><span>{cards.length}/80</span></div>
          <h3>{t('Little moments, kept.', '留住的一些小小瞬间。')}</h3><p className="treehole-box-caption">{t('These letters live in this browser. They are not published or synced to another device.', '回信只保存在此浏览器，不会公开发布，也不会同步到其他设备。')}</p>
          {cards.length ? <div className="treehole-saved-list">{cards.map(card => {
            const pair = getBilingualPoem(card);
            return <button type="button" key={card.id} aria-pressed={selectedSaved?.id === card.id} onClick={() => { setSelectedId(card.id); setNotice(''); }}><span className="treehole-saved-icon">{icon('drafts')}</span><span><strong lang={pair ? language : card.language}>{pair?.[language].title ?? card.title}</strong><small>{date(card)} · {pair ? t('Bilingual', '中英双语') : t('Earlier single-language letter', '此前的单语回信')}</small></span>{icon('chevron_right')}</button>;
          })}</div> : <div className="treehole-empty-box">{icon('mark_email_unread')}<p>{t('Your first kept poem will be waiting here.', '第一张留下的小诗，会在这里等你。')}</p><button type="button" onClick={() => setTab('write')}>{t('Write a little note', '先写一封信')}</button></div>}
        </section>}

        <section className="treehole-reply" aria-label={t('Your poem card', '你的小诗卡片')}>
          <div className="treehole-section-heading"><span>02 / {t('A LITTLE REPLY', '一封小回信')}</span><span>{shown ? date(shown) : t('At your pace', '按你的节奏')}</span></div>
          <AnimatePresence mode="wait">
            <motion.article key={shown?.id ?? 'waiting'} className={`treehole-postcard ${phase === 'releasing' ? 'treehole-postcard-releasing' : ''}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: phase === 'releasing' ? 0 : 1, y: phase === 'releasing' && !reduceMotion ? -30 : 0, rotate: phase === 'releasing' && !reduceMotion ? -3 : 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? .05 : .45 }}>
              <div className="treehole-paper-stamp" aria-hidden="true">{icon('eco')}<span>PS</span></div>
              {shown ? <>
                <div className="treehole-postcard-label">{t('A LETTER FOR THIS MOMENT', '写给此刻的一封信')}</div>
                {editing ? <div className="treehole-poem-editor">
                  <p className="treehole-edit-help">{t('Keep one English line for each Chinese line. Both versions are saved together.', '请保持中英文逐行对应，两种语言会一起保存。')}</p>
                  <fieldset><legend lang="en">English</legend><label>{t('English title', '英文标题')}<input lang="en" maxLength={80} value={editTitle} onChange={event => setEditTitle(event.target.value)} /></label><label>{t('English lines', '英文诗句')}<textarea lang="en" maxLength={2400} value={editLines} onChange={event => setEditLines(event.target.value)} /></label></fieldset>
                  <fieldset><legend lang="zh-CN">中文</legend><label>{t('Chinese title', '中文标题')}<input lang="zh-CN" maxLength={80} value={editZhTitle} onChange={event => setEditZhTitle(event.target.value)} /></label><label>{t('Chinese lines', '中文诗句')}<textarea lang="zh-CN" maxLength={2400} value={editZhLines} onChange={event => setEditZhLines(event.target.value)} /></label></fieldset>
                </div> : bilingual ? <>
                  <h3 className="treehole-bilingual-title"><span lang="en">{bilingual.en.title}</span><span lang="zh-CN">{bilingual.zh.title}</span></h3>
                  <div className="treehole-poem-lines treehole-poem-bilingual">{bilingual.en.lines.map((line,index) => <motion.div className="treehole-line-pair" key={index} initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, delay: reduceMotion ? 0 : .1 + index * .13 }}><p lang="en">{line}</p><p lang="zh-CN">{bilingual.zh.lines[index]}</p></motion.div>)}</div>
                </> : <><h3 lang={shown.language}>{shown.title}</h3><div className={`treehole-poem-lines treehole-poem-${shown.language}`} lang={shown.language}>{shown.lines.map((line,index) => <p key={index}>{line}</p>)}</div><p className="treehole-legacy-note">{t('An earlier edited letter. Its original words are kept; new letters include both languages.', '这是此前改写的单语回信，原文已保留；新回信均为中英对照。')}</p></>}
                <div className="treehole-poem-tags"><span>{t(POEM_FORMS.find(item => item.value === shown.form)!.en, POEM_FORMS.find(item => item.value === shown.form)!.zh)}</span><span>{t(POEM_IMAGES.find(item => item.value === shown.imagery)!.en, POEM_IMAGES.find(item => item.value === shown.imagery)!.zh)}</span>{shown.edited && <span>{t('Your words', '你的改写')}</span>}</div>
                {tab === 'saved' && shown.original && <details className="treehole-original"><summary>{t('My original note', '我的原文')}</summary><p>{shown.original}</p></details>}
              </> : <div className="treehole-waiting"><div className="treehole-envelope" aria-hidden="true"><span /></div><h3>{t('A little letter will find you here.', '一封小小的回信，会在这里找到你。')}</h3><p>{tab === 'saved' ? t('Choose a saved letter to read it again.', '选择一张留下的回信，再读一次。') : t('A thought, a feeling, an ordinary moment. There is room for it here.', '一件小事、一点感受、一个普通的瞬间，这里都有位置。')}</p></div>}
              <div className="treehole-postcard-bottom"><div className="treehole-companion-note">{icon('favorite')}<span>{shown ? t(`A quiet moment with ${shownChoice.en}.`, `和${shownChoice.zh}一起，留住一小刻。`) : t(`${name} is keeping you company.`, `${name}在这里陪你。`)}</span></div>
                <motion.div className="treehole-postman" animate={phase === 'delivering' && !reduceMotion ? { x: [0,-14,8,0], y: [0,-5,-9,0], rotate: [0,-3,3,0] } : { x: 0, y: 0, rotate: 0 }} transition={{ duration: .95 }}>
                  <div ref={animalRef}><HealingAnimal kind={shown?.companion ?? companion} growthStage={shown?.growthStage} mood={shown?.mood} isJiggling={phase === 'delivering'} /></div><span className={`treehole-tiny-letter ${phase === 'delivering' ? 'is-delivering' : ''}`} aria-hidden="true" />
                </motion.div>
              </div>
            </motion.article>
          </AnimatePresence>
          {shown && <div className="treehole-actions">
            {editing ? <><button type="button" className="treehole-keep" onClick={applyEdit}>{icon('done')}{t('Keep my changes', '完成改写')}</button><button type="button" onClick={() => setEditing(false)}>{t('Cancel', '取消')}</button></> : <>
              {tab === 'write' && <><label className="treehole-include-note"><input type="checkbox" checked={includeOriginal} onChange={event => setIncludeOriginal(event.target.checked)} disabled={busy || exporting} />{t('Include my note in saves & downloads', '保存／下载时附上我的原文')}</label><button type="button" className="treehole-keep" onClick={save} disabled={busy || isSaved || !storageAvailable}>{icon(isSaved ? 'bookmark_added' : 'bookmark_add')}{isSaved ? t('Kept', '已留下') : t('Keep this letter', '留下这封信')}</button></>}
              <button type="button" disabled={busy || exporting} onClick={downloadImage}>{icon('image')}{exporting ? t('Preparing…', '正在生成……') : t('Download card', '下载诗卡')}</button>
              <button type="button" disabled={busy} onClick={() => { const card = exportCard(); if (card) downloadPoemText(card); }}>{icon('download')}{t('Text', '文字版')}</button>
              {tab === 'write' ? <><button type="button" disabled={busy} onClick={() => deliver(true)}>{icon('refresh')}{t('Another version', '换一封')}</button><button type="button" disabled={busy} onClick={startEdit}>{icon('edit')}{t('Make it mine', '自己改写')}</button><button type="button" disabled={busy} onClick={release}>{icon('air')}{t('Let it drift', '让它飘走')}</button></> : <button type="button" className="treehole-remove" disabled={exporting} onClick={() => remove(shown)}>{icon('delete')}{t('Remove letter', '移除回信')}</button>}
            </>}
          </div>}
        </section>
      </div>
      {notice && <div className="treehole-notice" role="status"><span>{notice}</span>{undo && <button type="button" onClick={restore}>{t('Undo', '撤销')}</button>}<button type="button" aria-label={t('Dismiss message', '关闭提示')} onClick={() => setNotice('')}>{icon('close')}</button></div>}
      <p className="treehole-footer-note">{t('A poem can hold a moment without having to explain it.', '小诗可以陪着一个瞬间，不必解释所有的事。')}</p>
    </main>
  </div>;
}
