/*
 * Adapted portions: Fishing Game by jm-wltr, Apache-2.0.
 * https://github.com/jm-wltr/fishing-game/tree/9ccb03995c560a27283a031e7f70ec06147a99fe
 * Fish shape, steering, friction, angle smoothing, tail and water noise adapted
 * 2026-10-15 for PuffSqueeze. See /games/fishing/NOTICE.md and LICENSE.
 */
import { chooseFish, FISH_CATALOG, type FishSpecies, type FishingDifficulty, type FishId } from './catalog';
import { FISH_ARTWORK, fishInk, type FishPart } from './fishArtwork';

export type FishingPhase = 'ready' | 'lowering' | 'reeling';
export interface FishingSnapshot {
  phase: FishingPhase; depth: number; paused: boolean; hooked: FishSpecies | null;
  lastCatch: FishSpecies | null; casts: number; caught: number; points: number; needsRelease: boolean;
}
interface Ripple { x: number; y: number; age: number }
interface CatchSpark { x: number; y: number; vx: number; vy: number; age: number; color: string }
const tuning = {
  gentle: { fishSpeed: 1.3, catchRadius: 18, lowerSpeed: .18, reelSpeed: .4 },
  flow: { fishSpeed: 1.8, catchRadius: 12, lowerSpeed: .21, reelSpeed: .45 },
  challenge: { fishSpeed: 2.4, catchRadius: 7, lowerSpeed: .24, reelSpeed: .5 },
};
const TAU = Math.PI * 2;
const artPaths = new Map<FishId, { body: Path2D; tail: Path2D; back: Path2D[]; marks: Path2D[]; fins: Path2D[] }>();

function pathsFor(id: FishId) {
  let paths = artPaths.get(id);
  if (!paths) {
    const art = FISH_ARTWORK[id];
    paths = { body: new Path2D(art.body), tail: new Path2D(art.tail), back: art.back.map(part => new Path2D(part.path)), marks: art.marks.map(part => new Path2D(part.path)), fins: art.fins.map(part => new Path2D(part.path)) };
    artPaths.set(id, paths);
  }
  return paths;
}

export function drawFish(ctx: CanvasRenderingContext2D, species: FishSpecies, x: number, y: number, angle: number, tail: number, scale = 1, glow = false) {
  const art = FISH_ARTWORK[species.id], paths = pathsFor(species.id);
  const left = Math.cos(angle) < 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(left ? angle - Math.PI : angle); ctx.scale(left ? -scale : scale, scale);
  if (glow) { ctx.shadowColor = species.accent; ctx.shadowBlur = 18; }
  const paint = (parts: FishPart[], shapes: Path2D[]) => parts.forEach((part, index) => {
    ctx.globalAlpha = part.opacity ?? 1; ctx.fillStyle = fishInk(part.ink, species.color, species.accent); ctx.fill(shapes[index]);
  });
  paint(art.back, paths.back);
  // Retains the upstream hinged-tail animation with original species-specific art.
  ctx.save(); ctx.globalAlpha = .95; ctx.translate(art.tailX, 0); ctx.rotate(tail * art.tailSwing);
  ctx.fillStyle = species.color; ctx.fill(paths.tail); ctx.restore();
  const fill = ctx.createLinearGradient(0, -art.radiusY, 0, art.radiusY);
  fill.addColorStop(0, species.color); fill.addColorStop(1, species.accent);
  ctx.globalAlpha = 1; ctx.fillStyle = fill; ctx.fill(paths.body);
  ctx.shadowBlur = 0; ctx.strokeStyle = '#65849b30'; ctx.lineWidth = .65; ctx.stroke(paths.body);
  ctx.save(); ctx.clip(paths.body); paint(art.marks, paths.marks); ctx.restore();
  paint(art.fins, paths.fins); ctx.globalAlpha = 1;
  const eye = art.eye;
  ctx.fillStyle = '#fffef9'; ctx.beginPath(); ctx.arc(eye.x, eye.y, eye.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#45576a'; ctx.beginPath(); ctx.arc(eye.x + eye.r * .24, eye.y, eye.r * .51, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fffef9'; ctx.beginPath(); ctx.arc(eye.x + eye.r * .07, eye.y - eye.r * .22, eye.r * .16, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#5b778b80'; ctx.lineWidth = .7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(eye.x + 2, eye.y + 5); ctx.quadraticCurveTo(eye.x + 3.7, eye.y + 6, eye.x + 5, eye.y + 4.8); ctx.stroke();
  ctx.restore();
}

class SwimmingFish {
  species: FishSpecies;
  x = 0; y = 0; previousX = 0; previousY = 0; vx = 0; vy = 0;
  angle = 0; tailAngle = 0; size = 1; baseDepth = 0; targetX = 0; timer = 0; pace = 1; phase = Math.random() * TAU;
  constructor(width: number, height: number, initial = true, species = chooseFish()) { this.species = species; this.reset(width, height, initial); }
  reset(width: number, height: number, initial = false) {
    const direction = Math.random() < .5 ? 1 : -1;
    if (!initial) this.species = chooseFish();
    const entryGap = 55 + Math.random() * width * .16;
    this.x = initial ? Math.random() * width : direction > 0 ? -entryGap : width + entryGap;
    this.baseDepth = .46 + this.species.depth * .15 + Math.random() * .1;
    this.y = this.baseDepth * height;
    this.previousX = this.x; this.previousY = this.y;
    this.vx = direction * (24 + Math.random() * 28); this.vy = 0;
    this.angle = direction > 0 ? 0 : Math.PI;
    this.targetX = direction > 0 ? width + 140 : -140;
    this.size = 1.2 + Math.random() * .55 + this.species.depth * .12;
    this.pace = .85 + Math.random() * .3;
    this.timer = 0;
  }
  // Upstream target steering and friction, converted from per-frame to seconds.
  update(dt: number, time: number, width: number, height: number, speed: number) {
    this.previousX = this.x; this.previousY = this.y; this.timer += dt;
    const targetY = this.baseDepth * height + Math.sin(time * .75 + this.phase) * 16;
    const angle = Math.atan2(targetY - this.y, this.targetX - this.x);
    this.vx += Math.cos(angle) * 90 * dt; this.vy += Math.sin(angle) * 90 * dt;
    const friction = Math.exp(-1.8 * dt); this.vx *= friction; this.vy *= friction;
    const rhythm = this.pace * (1 + Math.sin(time * 1.7 + this.phase) * .1);
    this.x += this.vx * speed * rhythm * dt; this.y += this.vy * speed * rhythm * dt;
    let diff = Math.atan2(this.vy, this.vx) - this.angle;
    while (diff < -Math.PI) diff += TAU;
    while (diff > Math.PI) diff -= TAU;
    this.angle += diff * (1 - Math.exp(-6 * dt));
    this.tailAngle = Math.sin(time * (10 + Math.hypot(this.vx, this.vy) * speed / 16) + this.phase) * .32;
    // An offscreen fish entering the cove must not be respawned every frame.
    if ((this.vx < 0 && this.x < -90) || (this.vx > 0 && this.x > width + 90)) this.reset(width, height);
  }
}

export class FishingEngine {
  private ctx: CanvasRenderingContext2D;
  private frame = 0; private observer: ResizeObserver; private destroyed = false;
  private width = 1000; private height = 640; private ratio = 1;
  private time = 0; private lastTime = 0; private publishTimer = 0;
  private fish: SwimmingFish[] = []; private ripples: Ripple[] = [];
  private sparks: CatchSpark[] = [];
  private pressure = 0; private phase: FishingPhase = 'ready'; private depth = 0;
  private paused = false; private needsRelease = false; private hooked: SwimmingFish | null = null;
  private lastCatch: FishSpecies | null = null; private casts = 0; private caught = 0; private points = 0;
  private difficulty: FishingDifficulty = 'flow'; private reducedMotion: boolean;
  constructor(private canvas: HTMLCanvasElement, private onSnapshot: (value: FishingSnapshot) => void, private onCatch: (fish: FishSpecies) => void, reducedMotion = false) {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas-unavailable');
    this.ctx = ctx; this.reducedMotion = reducedMotion;
    this.resize();
    // Six spaced swimmers leave room to aim; species rotate on later entries.
    const deck = [...FISH_CATALOG];
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    this.fish = Array.from({ length: 6 }, (_, index) => {
      const fish = new SwimmingFish(this.width, this.height, true, deck[index]);
      fish.x = this.width * ((index + .5 + (Math.random() - .5) * .3) / 6); fish.previousX = fish.x;
      return fish;
    });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
    this.publish(); this.frame = requestAnimationFrame(this.loop);
  }
  setDifficulty(value: FishingDifficulty) { this.difficulty = value; }
  setReducedMotion(value: boolean) { this.reducedMotion = value; }
  setPressure(value: number) {
    const wasHeld = this.pressure > 0;
    this.pressure = Math.max(0, Math.min(1, value));
    if (this.pressure === 0) this.needsRelease = false;
    if (this.paused) return;
    if (this.phase === 'ready' && !wasHeld && this.pressure > 0 && !this.needsRelease) {
      this.phase = 'lowering'; this.lastCatch = null; this.ripples.push({ x: this.hookX(), y: this.surface(), age: 0 });
    } else if (this.phase === 'lowering' && this.pressure === 0) this.phase = 'reeling';
    this.publish();
  }
  setPaused(value: boolean) {
    this.paused = value;
    if (value) { this.pressure = 0; this.needsRelease = false; }
    // Resume a suspended cast by retrieving; never assume the hand is still held.
    if (!value && this.phase === 'lowering') this.phase = 'reeling';
    this.lastTime = 0; this.publish();
  }
  private snapshot(): FishingSnapshot {
    return { phase: this.phase, depth: this.depth, paused: this.paused, hooked: this.hooked?.species ?? null, lastCatch: this.lastCatch, casts: this.casts, caught: this.caught, points: this.points, needsRelease: this.needsRelease };
  }
  private publish() { if (!this.destroyed) this.onSnapshot(this.snapshot()); }
  private surface() { return this.height * .39; }
  private hookX() { return this.width * .615; }
  private hookY(depth = this.depth) { return this.surface() + 12 + depth * (this.height * .91 - this.surface() - 12); }
  private resize() {
    const rect = this.canvas.getBoundingClientRect(); if (rect.width <= 0 || rect.height <= 0) return;
    const oldWidth = this.width, oldHeight = this.height;
    this.width = rect.width < 580 ? 640 : 1000; this.height = this.width * rect.height / rect.width;
    this.ratio = Math.min(window.devicePixelRatio || 1, 2) * rect.width / this.width;
    this.canvas.width = Math.round(rect.width * Math.min(window.devicePixelRatio || 1, 2));
    this.canvas.height = Math.round(rect.height * Math.min(window.devicePixelRatio || 1, 2));
    for (const fish of this.fish) {
      fish.x *= this.width / oldWidth; fish.y *= this.height / oldHeight;
      fish.targetX = fish.vx >= 0 ? this.width + 140 : -140;
      fish.previousX = fish.x; fish.previousY = fish.y;
    }
  }
  private loop = (now: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, .04) : 0;
    this.lastTime = now;
    if (!this.paused) { this.time += dt; this.update(dt); }
    this.draw();
    this.publishTimer += dt;
    if (this.publishTimer >= .1) { this.publishTimer = 0; this.publish(); }
    this.frame = requestAnimationFrame(this.loop);
  };
  private update(dt: number) {
    const settings = tuning[this.difficulty];
    this.fish.forEach(fish => fish.update(dt, this.time, this.width, this.height, settings.fishSpeed));
    this.ripples = this.ripples.map(ripple => ({ ...ripple, age: ripple.age + dt })).filter(ripple => ripple.age < 1.7);
    this.sparks = this.sparks.map(spark => ({ ...spark, x: spark.x + spark.vx * dt, y: spark.y + spark.vy * dt, vy: spark.vy + 14 * dt, age: spark.age + dt })).filter(spark => spark.age < 1.1);
    if (this.phase === 'lowering') {
      this.depth = Math.min(1, this.depth + dt * settings.lowerSpeed * (.75 + this.pressure * .45));
      // Stay at full depth while held. Only an actual release starts reeling.
    } else if (this.phase === 'reeling') {
      const previousY = this.hookY();
      this.depth = Math.max(0, this.depth - dt * settings.reelSpeed * (this.hooked ? .8 : 1));
      const y = this.hookY(), x = this.hookX();
      if (!this.hooked) {
        // Swept collision relative to fish movement avoids skipping fast fish.
        const index = this.fish.findIndex(fish => {
          const art = FISH_ARTWORK[fish.species.id];
          const radiusX = settings.catchRadius + art.radiusX * fish.size * .8;
          const radiusY = settings.catchRadius + art.radiusY * fish.size * .8;
          const rx = (x - fish.previousX) / radiusX, ry = (previousY - fish.previousY) / radiusY;
          const dx = -(fish.x - fish.previousX) / radiusX, dy = ((y - previousY) - (fish.y - fish.previousY)) / radiusY;
          const length = dx * dx + dy * dy;
          const t = length ? Math.max(0, Math.min(1, -(rx * dx + ry * dy) / length)) : 0;
          return Math.hypot(rx + dx * t, ry + dy * t) < 1;
        });
        if (index >= 0) {
          this.hooked = this.fish[index];
          this.burst(x, y, this.hooked.species.accent);
          this.fish[index] = new SwimmingFish(this.width, this.height, false); this.publish();
        }
      }
      if (this.depth <= 0) {
        const result = this.hooked?.species ?? null;
        this.casts++; this.lastCatch = result;
        if (result) { this.caught++; this.points += result.points; }
        if (result) this.burst(x, this.surface() - 8, result.color);
        this.hooked = null; this.phase = 'ready'; this.needsRelease = this.pressure > 0;
        this.ripples.push({ x, y: this.surface(), age: 0 }); this.publish();
        if (result) this.onCatch(result);
      }
    }
  }
  private burst(x: number, y: number, color: string) {
    if (this.reducedMotion) return;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TAU;
      this.sparks.push({ x, y, vx: Math.cos(angle) * (25 + Math.random() * 25), vy: Math.sin(angle) * 30 - 22, age: 0, color });
    }
  }
  private draw() {
    const ctx = this.ctx, w = this.width, h = this.height, surface = this.surface();
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, w, surface);
    sky.addColorStop(0, '#eef5fb'); sky.addColorStop(1, '#e3eff6'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(w * .81, h * .14, h * .047, 0, TAU); ctx.fill();
    // Quiet scenery fills the playfield instead of surrounding dashboard cards.
    ctx.fillStyle = '#ffffff75';
    for (let i = 0; i < 3; i++) {
      const x = w * (.42 + i * .2), y = h * (.095 + i % 2 * .06);
      ctx.beginPath(); ctx.ellipse(x, y, w * .045, h * .012, 0, 0, TAU); ctx.fill();
    }
    // Distant shore and a restrained reflection, no imported scene assets.
    ctx.fillStyle = '#cbdfe4'; ctx.beginPath(); ctx.moveTo(w * .4, surface);
    ctx.bezierCurveTo(w * .58, h * .26, w * .7, h * .39, w, h * .27); ctx.lineTo(w, surface + 20); ctx.closePath(); ctx.fill();
    const water = ctx.createLinearGradient(0, surface, 0, h);
    water.addColorStop(0, '#c6e4ec'); water.addColorStop(.32, '#b3d6e4'); water.addColorStop(1, '#88b4cc');
    ctx.fillStyle = water; ctx.fillRect(0, surface, w, h - surface);
    const light = ctx.createLinearGradient(w * .8, surface, w * .6, h);
    light.addColorStop(0, '#f8f3d929'); light.addColorStop(1, '#ffffff00');
    ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(w * .75, surface); ctx.lineTo(w * .88, surface); ctx.lineTo(w * .76, h); ctx.lineTo(w * .38, h); ctx.closePath(); ctx.fill();
    const t = this.reducedMotion ? 0 : this.time;
    // Three-sine texture adapted from upstream getWaterHeight.
    ctx.fillStyle = '#ffffff20';
    for (let x = 10; x < w; x += 44) for (let y = surface + 18; y < h - 20; y += 43) {
      const noise = (Math.sin(x * .02 + t) + Math.sin(y * .02 + t * .5) + Math.sin((x + y) * .01 + t * .7)) / 3;
      if (noise > .22) { ctx.beginPath(); ctx.ellipse(x, y, noise * 13, noise * 2.2, -.15, 0, TAU); ctx.fill(); }
    }
    ctx.strokeStyle = '#f5fcff90'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = 0; x <= w; x += 6) { const y = surface + Math.sin(x * .017 + t) * 2; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    // Dock and shore leave the lower water entirely visible.
    ctx.fillStyle = '#cad8d4'; ctx.beginPath(); ctx.moveTo(0, h * .31); ctx.quadraticCurveTo(w * .12, h * .3, w * .24, h * .37); ctx.lineTo(w * .25, surface + 23); ctx.lineTo(0, surface + 35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b9c5c7'; ctx.fillRect(w * .28, surface - 5, 9, 49); ctx.fillRect(w * .09, surface - 5, 9, 49);
    ctx.fillStyle = '#d9cbb8'; ctx.beginPath(); ctx.roundRect(0, surface - 14, w * .365, 19, 5); ctx.fill();
    ctx.strokeStyle = '#b9ac9a66'; ctx.lineWidth = 1;
    for (let x = 22; x < w * .35; x += 37) { ctx.beginPath(); ctx.moveTo(x, surface - 12); ctx.lineTo(x, surface + 2); ctx.stroke(); }
    ctx.fillStyle = '#eee7db'; ctx.beginPath(); ctx.roundRect(w * .31, surface - 38, 24, 22, 4); ctx.fill();
    ctx.strokeStyle = '#c2b7a7'; ctx.beginPath(); ctx.arc(w * .31 + 12, surface - 38, 8, Math.PI, TAU); ctx.stroke();
    this.fish.forEach(fish => drawFish(ctx, fish.species, fish.x, fish.y, fish.angle, this.reducedMotion ? 0 : fish.tailAngle, fish.size));
    // Rod and line stay aligned with the companion's platform at every size.
    const tipX = w * .49, tipY = h * .18, hookX = this.hookX(), hookY = this.hookY();
    ctx.strokeStyle = '#8b9aab'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(w * .255, h * .31); ctx.quadraticCurveTo(w * .365, h * .14, tipX, tipY); ctx.stroke();
    ctx.strokeStyle = '#6f8da7'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(hookX, tipY + 12, hookX, hookY); ctx.stroke();
    ctx.fillStyle = '#fff9ec'; ctx.beginPath(); ctx.ellipse(hookX, surface, 5.5, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d7a69b'; ctx.beginPath(); ctx.ellipse(hookX, surface + 3, 5.5, 4.5, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#f8fbff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hookX, hookY - 7); ctx.lineTo(hookX, hookY + 5); ctx.bezierCurveTo(hookX, hookY + 15, hookX - 13, hookY + 15, hookX - 12, hookY + 4); ctx.stroke();
    if (this.hooked) drawFish(ctx, this.hooked.species, hookX - 10, hookY + 10, -.65, this.reducedMotion ? 0 : Math.sin(this.time * 8) * .18, this.hooked.size, true);
    for (const ripple of this.ripples) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, .65 - ripple.age * .38)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(ripple.x, ripple.y, 9 + ripple.age * 31, 3 + ripple.age * 6, 0, 0, TAU); ctx.stroke();
    }
    this.sparks.forEach(spark => {
      ctx.globalAlpha = Math.max(0, 1 - spark.age); ctx.strokeStyle = spark.color; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.arc(spark.x, spark.y, 2 + spark.age * 2, 0, TAU); ctx.stroke();
    }); ctx.globalAlpha = 1;
    // A few original river stones and reeds anchor the quiet scene.
    ctx.fillStyle = '#91acb96e';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(w * (.04 + i * .15), h - 9 - (i % 3) * 5, 18 + i % 3 * 7, 7, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#6f9da68c'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const x = w * .94 + i * 8; ctx.beginPath(); ctx.moveTo(x, h); ctx.quadraticCurveTo(x - 9, h - 34, x + Math.sin(t + i) * 3, h - 62 - i % 2 * 14); ctx.stroke(); }
  }
  dispose() { this.destroyed = true; cancelAnimationFrame(this.frame); this.observer.disconnect(); this.fish = []; this.ripples = []; this.sparks = []; }
}
