import { COMPANION_CHOICES } from './companionService';
import { getBilingualPoem, type PoetryCard } from './treeholePoetry';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function downloadPoemText(card: PoetryCard) {
  const pair = getBilingualPoem(card);
  const poem = pair ? [pair.en.title, pair.zh.title, '', ...pair.en.lines.flatMap((line, index) => [line, pair.zh.lines[index], ''])] : [card.title, '', ...card.lines];
  const content = [...poem, ...(card.original ? ['', 'My note / 我的来信', card.original] : []), '', 'Tree-hole Poetry / 树洞小诗 · PuffSqueeze'].join('\n');
  download(new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' }), `puffsqueeze-poem-${card.id.slice(0,8)}.txt`);
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('image'));
    reader.readAsDataURL(blob);
  });
}

async function companionImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', '1000'); copy.setAttribute('height', '1000'); copy.removeAttribute('style');
  await Promise.all(Array.from(copy.querySelectorAll('image')).map(async node => {
    const href = node.getAttribute('href');
    if (!href) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) throw new Error('image-origin');
    const response = await fetch(url.href, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('image');
    node.setAttribute('href', await toDataUrl(await response.blob()));
  }));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image(); img.src = url; await img.decode(); return img;
  } finally { URL.revokeObjectURL(url); }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  // Split on characters as a final fallback, including long words and Chinese text.
  const tokens = text.match(/[\u3400-\u9fff]|[^\u3400-\u9fff\s]+\s*|\s+/gu) ?? [];
  const lines: string[] = []; let line = '';
  for (const token of tokens) {
    if (ctx.measureText(line + token).width <= width) { line += token; continue; }
    if (line.trim()) lines.push(line.trimEnd());
    line = '';
    for (const char of Array.from(token.trimStart())) {
      if (ctx.measureText(line + char).width > width && line) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

export async function downloadPoemImage(card: PoetryCard, svg: SVGSVGElement) {
  const animal = await companionImage(svg);
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas');
  const width = 1200, margin = 116, textWidth = width - margin * 2;
  const fonts = { en: 'Georgia, serif', zh: '"Microsoft YaHei", sans-serif' };
  const pair = getBilingualPoem(card);
  const font = fonts[card.language];
  ctx.font = `38px ${pair ? fonts.en : font}`;
  const titleLines = wrap(ctx, pair?.en.title ?? card.title, textWidth);
  ctx.font = `29px ${fonts.zh}`;
  const zhTitleLines = pair ? wrap(ctx, pair.zh.title, textWidth) : [];
  let titleEnd = 220 + (titleLines.length - 1) * 48;
  if (zhTitleLines.length) titleEnd += 48 + (zhTitleLines.length - 1) * 40;
  const dividerY = titleEnd + 50, poemStart = dividerY + 75;
  const poemLines = card.lines.map((line, index) => {
    ctx.font = `34px ${pair ? fonts.en : font}`;
    const primary = wrap(ctx, pair?.en.lines[index] ?? line, textWidth);
    ctx.font = `26px ${fonts.zh}`;
    return { primary, secondary: pair ? wrap(ctx, pair.zh.lines[index], textWidth) : [] };
  });
  ctx.font = '23px "Microsoft YaHei", sans-serif';
  const noteLines = card.original ? card.original.split('\n').flatMap(line => wrap(ctx, line, textWidth)) : [];
  const contentHeight = poemLines.reduce((sum, group) => sum + group.primary.length * 55 + group.secondary.length * 42 + 24, 0);
  const height = Math.max(1500, poemStart + contentHeight + (noteLines.length ? 110 + noteLines.length * 34 : 0) + 390);
  canvas.width = width; canvas.height = height;
  const paper = ctx.createLinearGradient(0, 0, width, height); paper.addColorStop(0, '#f4f9fd'); paper.addColorStop(1, '#e6f0f8');
  ctx.fillStyle = paper; ctx.fillRect(0,0,width,height);
  ctx.fillStyle = '#fffefb'; ctx.beginPath(); ctx.roundRect(56,56,width-112,height-112,30); ctx.fill();
  ctx.strokeStyle = '#e2ebf2'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#7894a9'; ctx.font = '17px "Segoe UI", sans-serif'; ctx.fillText('PUFFSQUEEZE / TREE-HOLE POETRY',margin,135);
  ctx.fillStyle = '#456780'; ctx.font = `38px ${pair ? fonts.en : font}`;
  titleLines.forEach((line,i) => ctx.fillText(line,margin,220+i*48));
  ctx.fillStyle = '#7892a5'; ctx.font = `29px ${fonts.zh}`;
  zhTitleLines.forEach((line,i) => ctx.fillText(line,margin,220+titleLines.length*48+i*40));
  ctx.strokeStyle = '#dce8f0'; ctx.beginPath(); ctx.moveTo(margin,dividerY); ctx.lineTo(width-margin,dividerY); ctx.stroke();
  let y = poemStart;
  poemLines.forEach(group => {
    ctx.font = `34px ${pair ? fonts.en : font}`; ctx.fillStyle = '#4e6c80';
    group.primary.forEach(line => { ctx.fillText(line, margin, y); y += 55; });
    ctx.font = `26px ${fonts.zh}`; ctx.fillStyle = '#8196a7';
    group.secondary.forEach(line => { ctx.fillText(line, margin, y); y += 42; });
    y += 24;
  });
  if (noteLines.length) {
    y += 55; ctx.fillStyle = '#8b9ba8'; ctx.font = '19px "Microsoft YaHei", sans-serif';
    ctx.fillText('MY NOTE / 我的来信', margin, y); y += 42;
    ctx.font = '23px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#798b97';
    noteLines.forEach(line => { ctx.fillText(line,margin,y); y+=34; });
  }
  ctx.drawImage(animal,width-350,height-340,240,240);
  const choice = COMPANION_CHOICES.find(item => item.kind === card.companion)!;
  ctx.fillStyle = '#8a9cab'; ctx.font = '19px "Microsoft YaHei", sans-serif';
  ctx.fillText(`A little letter, with ${choice.en}.`,margin,height-225);
  ctx.fillText(`和${choice.zh}一起，留下一小刻。`,margin,height-191);
  ctx.font = '16px "Microsoft YaHei", sans-serif';
  ctx.fillText(new Date(card.createdAt).toISOString().slice(0,10),margin,height-150);
  const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('export')), 'image/png'));
  download(blob, `puffsqueeze-poem-${card.id.slice(0,8)}.png`);
}
